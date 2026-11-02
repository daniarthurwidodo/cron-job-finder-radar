import { logger } from "@/lib/logger";
import type { CompanyRepository } from "@/lib/repositories/companyRepository";
import type { JobInsert, JobRepository } from "@/lib/repositories/jobRepository";
import type { JobSourceInsert, JobSourceRepository } from "@/lib/repositories/jobSourceRepository";
import type { ScrapeRunCounts } from "@/lib/repositories/scrapeRunRepository";
import { buildDedupHash, normalizeText, normalizeUrl } from "@/lib/services/dedup";
import { findRejectionReason } from "@/lib/services/jobFilter";
import { normalizeJob } from "@/lib/services/normalizer";
import { matchStack } from "@/lib/services/stackMatch";
import type { RawJob, ScoredJob } from "@/lib/types";

const OUTCOMES = {
  INSERTED: "inserted",
  DUPLICATE: "duplicate",
  FILTERED: "filtered",
  INVALID: "invalid",
} as const;
type Outcome = (typeof OUTCOMES)[keyof typeof OUTCOMES];

const OUTCOME_COUNT_KEYS: Record<Outcome, keyof ScrapeRunCounts> = {
  [OUTCOMES.INSERTED]: "inserted",
  [OUTCOMES.DUPLICATE]: "duplicates",
  [OUTCOMES.FILTERED]: "filtered",
  [OUTCOMES.INVALID]: "invalid",
};

export interface IngestDependencies {
  companies: CompanyRepository;
  jobs: JobRepository;
  jobSources: JobSourceRepository;
  runInTransaction: <T>(work: () => T) => T;
}

function toJobInsert({ job, companyId, dedupHash }: { job: ScoredJob; companyId: number; dedupHash: string }): JobInsert {
  return {
    companyId,
    dedupHash,
    title: job.title,
    city: job.city,
    countryCode: job.countryCode,
    workModeCode: job.workModeCode,
    seniorityCode: job.seniorityCode,
    description: job.description,
    postedAt: job.postedAt,
    currencyCode: job.currencyCode,
    salaryMinMonthlyMinor: job.salaryMinMonthlyMinor,
    salaryMaxMonthlyMinor: job.salaryMaxMonthlyMinor,
    stackMatchScore: job.stackMatch.score,
    techTags: job.stackMatch.tags,
  };
}

function toJobSourceInsert({ jobId, job }: { jobId: number; job: ScoredJob }): JobSourceInsert {
  return { jobId, sourceCode: job.sourceCode, sourceJobId: job.sourceJobId, sourceUrl: job.sourceUrl };
}

export class IngestService {
  constructor(private readonly dependencies: IngestDependencies) {}

  ingest(rawJobs: RawJob[]): ScrapeRunCounts {
    const counts: ScrapeRunCounts = { found: rawJobs.length, inserted: 0, duplicates: 0, filtered: 0, invalid: 0 };
    for (const rawJob of rawJobs) {
      counts[OUTCOME_COUNT_KEYS[this.ingestOne(rawJob)]] += 1;
    }
    return counts;
  }

  private ingestOne(rawJob: RawJob): Outcome {
    try {
      const scoredJob = this.scoreJob(rawJob);
      if (findRejectionReason(scoredJob)) return OUTCOMES.FILTERED;
      return this.dependencies.runInTransaction(() => this.store(scoredJob));
    } catch (error) {
      logger.error("job ingest failed", { sourceJobId: rawJob.sourceJobId, error: String(error) });
      return OUTCOMES.INVALID;
    }
  }

  private scoreJob(rawJob: RawJob): ScoredJob {
    const normalizedJob = normalizeJob(rawJob);
    const text = [normalizedJob.title, normalizedJob.description, ...normalizedJob.skills].join(" ");
    return { ...normalizedJob, sourceUrl: normalizeUrl(normalizedJob.sourceUrl), stackMatch: matchStack(text) };
  }

  private store(job: ScoredJob): Outcome {
    const { jobs, jobSources } = this.dependencies;
    const dedupHash = buildDedupHash(job);
    const existingJobId = jobSources.findJobIdBySourceUrl(job.sourceUrl) ?? jobs.findIdByDedupHash(dedupHash);
    if (existingJobId !== undefined) {
      this.recordSighting({ jobId: existingJobId, job });
      return OUTCOMES.DUPLICATE;
    }
    const companyId = this.findOrCreateCompany(job.companyName);
    const jobId = jobs.insert(toJobInsert({ job, companyId, dedupHash }));
    jobSources.insert(toJobSourceInsert({ jobId, job }));
    return OUTCOMES.INSERTED;
  }

  private recordSighting({ jobId, job }: { jobId: number; job: ScoredJob }): void {
    const { jobSources } = this.dependencies;
    if (jobSources.findJobIdBySourceUrl(job.sourceUrl) === undefined) {
      jobSources.insert(toJobSourceInsert({ jobId, job }));
      return;
    }
    jobSources.touch(job.sourceUrl);
  }

  private findOrCreateCompany(name: string): number {
    const { companies } = this.dependencies;
    const nameNormalized = normalizeText(name);
    return companies.findIdByNormalizedName(nameNormalized) ?? companies.insert({ name, nameNormalized });
  }
}
