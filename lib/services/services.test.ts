import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import { COUNTRY_CODES, REJECTION_REASONS, SALARY_PERIODS, SENIORITIES, SOURCE_CODES, WORK_MODES } from "@/lib/constants";
import { migrateUp } from "@/lib/migrations";
import { CompanyRepository } from "@/lib/repositories/companyRepository";
import { JobRepository } from "@/lib/repositories/jobRepository";
import { JobSourceRepository } from "@/lib/repositories/jobSourceRepository";
import { buildDedupHash, normalizeUrl } from "@/lib/services/dedup";
import { IngestService } from "@/lib/services/ingestService";
import { findRejectionReason } from "@/lib/services/jobFilter";
import { normalizeJob, stripHtml, toMonthlyMinor } from "@/lib/services/normalizer";
import { matchStack } from "@/lib/services/stackMatch";
import type { RawJob } from "@/lib/types";

function buildRawJob(overrides: Partial<RawJob> = {}): RawJob {
  return {
    sourceCode: SOURCE_CODES.MYCAREERSFUTURE,
    sourceJobId: "abc",
    sourceUrl: "https://www.mycareersfuture.gov.sg/job/abc?utm_source=x",
    title: "Senior Node.js Developer",
    companyName: "Acme Pte. Ltd.",
    city: "Singapore",
    countryCode: COUNTRY_CODES.SINGAPORE,
    currencyCode: "SGD",
    descriptionHtml: "<p>Build APIs with Node.js, TypeScript and PostgreSQL. Hybrid setup.</p>",
    postedAt: "2026-10-01",
    employmentTypes: ["Permanent", "Full Time"],
    positionLevels: ["Senior Executive"],
    flexibleWorkArrangements: [],
    skills: ["Docker"],
    salaryMin: 8000,
    salaryMax: 10000,
    salaryPeriod: SALARY_PERIODS.MONTHLY,
    ...overrides,
  };
}

function buildIngestService(): { service: IngestService; jobs: JobRepository; jobSources: JobSourceRepository } {
  const db = new Database(":memory:");
  migrateUp(db);
  const jobs = new JobRepository(db);
  const jobSources = new JobSourceRepository(db);
  const service = new IngestService({
    companies: new CompanyRepository(db),
    jobs,
    jobSources,
    runInTransaction: (work) => db.transaction(work)(),
  });
  return { service, jobs, jobSources };
}

test("stripHtml removes tags and decodes entities", () => {
  assert.equal(stripHtml("<p>A &amp; B</p><p>C&nbsp;D</p>"), "A & B C D");
});

test("toMonthlyMinor converts monthly and annual salary to cents", () => {
  assert.equal(toMonthlyMinor({ amount: 8000, period: SALARY_PERIODS.MONTHLY }), 800000);
  assert.equal(toMonthlyMinor({ amount: 120000, period: SALARY_PERIODS.ANNUAL }), 1000000);
  assert.equal(toMonthlyMinor({ amount: 240000, period: SALARY_PERIODS.MONTHLY }), 2000000);
  assert.equal(toMonthlyMinor({ amount: null, period: SALARY_PERIODS.MONTHLY }), null);
  assert.equal(toMonthlyMinor({ amount: Number.NaN, period: SALARY_PERIODS.MONTHLY }), null);
  assert.equal(toMonthlyMinor({ amount: 5, period: null }), null);
});

test("normalizeJob detects work mode, seniority, contract and salary", () => {
  const job = normalizeJob(buildRawJob());
  assert.equal(job.workModeCode, WORK_MODES.HYBRID);
  assert.equal(job.seniorityCode, SENIORITIES.SENIOR);
  assert.equal(job.isContractOrTemporary, false);
  assert.equal(job.salaryMinMonthlyMinor, 800000);
  assert.equal(normalizeJob(buildRawJob({ descriptionHtml: "<p>Plain role</p>" })).workModeCode, WORK_MODES.FULL_TIME);
  assert.equal(normalizeJob(buildRawJob({ title: "Junior Developer" })).seniorityCode, SENIORITIES.ENTRY);
  assert.equal(normalizeJob(buildRawJob({ employmentTypes: ["Contract"] })).isContractOrTemporary, true);
});

test("normalizeJob rejects a job without title", () => {
  assert.throws(() => normalizeJob(buildRawJob({ title: " " })));
});

test("matchStack scores known keywords", () => {
  const match = matchStack("We use Node.js, TypeScript, PostgreSQL and .NET with Next.js");
  assert.deepEqual(match.tags, ["Next.js", "TypeScript", "Node.js", ".NET", "PostgreSQL"]);
  assert.equal(match.score, 42);
  assert.equal(matchStack("Cyber range test engineer").score, 0);
});

test("findRejectionReason covers each rule and accepts a good job", () => {
  const good = { ...normalizeJob(buildRawJob()), stackMatch: matchStack("Node.js TypeScript") };
  assert.equal(findRejectionReason(good), null);
  assert.equal(findRejectionReason({ ...good, seniorityCode: SENIORITIES.ENTRY }), REJECTION_REASONS.ENTRY_LEVEL);
  assert.equal(findRejectionReason({ ...good, workModeCode: WORK_MODES.ON_SITE }), REJECTION_REASONS.ON_SITE_ONLY);
  assert.equal(findRejectionReason({ ...good, isContractOrTemporary: true }), REJECTION_REASONS.CONTRACT_OR_TEMPORARY);
  assert.equal(findRejectionReason({ ...good, stackMatch: matchStack("nothing") }), REJECTION_REASONS.NO_STACK_MATCH);
});

test("dedup hash ignores case and punctuation; url drops tracking params", () => {
  const first = buildDedupHash({ companyName: "Acme Pte. Ltd.", title: "Senior Dev", city: "Singapore" });
  const second = buildDedupHash({ companyName: "ACME  pte ltd", title: "senior dev!", city: "singapore" });
  assert.equal(first, second);
  assert.equal(normalizeUrl("https://x.test/job/1/?utm_source=a&id=7#top"), "https://x.test/job/1?id=7");
});

test("ingest inserts once, then counts the same job as duplicate", () => {
  const { service, jobs, jobSources } = buildIngestService();
  const first = service.ingest([buildRawJob()]);
  assert.deepEqual(first, { found: 1, inserted: 1, duplicates: 0, filtered: 0, invalid: 0 });
  const second = service.ingest([buildRawJob()]);
  assert.deepEqual(second, { found: 1, inserted: 0, duplicates: 1, filtered: 0, invalid: 0 });
  const jobId = jobs.findIdByDedupHash(buildDedupHash({ companyName: "Acme Pte. Ltd.", title: "Senior Node.js Developer", city: "Singapore" }));
  assert.ok(jobId);
  assert.equal(jobSources.countByJobId(jobId), 1);
});

test("same job from another source adds a source link, not a new job", () => {
  const { service, jobs, jobSources } = buildIngestService();
  service.ingest([buildRawJob()]);
  const otherSource = buildRawJob({ sourceCode: "other", sourceJobId: "zzz", sourceUrl: "https://other.test/jobs/zzz" });
  assert.equal(service.ingest([otherSource]).duplicates, 1);
  const jobId = jobs.findIdByDedupHash(buildDedupHash({ companyName: "Acme Pte. Ltd.", title: "Senior Node.js Developer", city: "Singapore" }));
  assert.ok(jobId);
  assert.equal(jobSources.countByJobId(jobId), 2);
});

test("a job with no posted salary is kept, not filtered", () => {
  const { service, jobs } = buildIngestService();
  const counts = service.ingest([buildRawJob({ salaryMin: null, salaryMax: null, salaryPeriod: null })]);
  assert.deepEqual(counts, { found: 1, inserted: 1, duplicates: 0, filtered: 0, invalid: 0 });
  assert.equal(jobs.listFinancialInputs()[0].salaryMinMonthlyMinor, null);
});

test("ingest filters and flags invalid jobs", () => {
  const { service } = buildIngestService();
  const counts = service.ingest([
    buildRawJob({ title: "Cyber Range Test Engineer", descriptionHtml: "<p>Security</p>", skills: [] }),
    buildRawJob({ sourceJobId: "bad", title: "" }),
  ]);
  assert.deepEqual(counts, { found: 2, inserted: 0, duplicates: 0, filtered: 1, invalid: 1 });
});
