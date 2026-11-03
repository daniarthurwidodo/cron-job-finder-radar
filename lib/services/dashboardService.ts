import { COUNTRY_CODES, HISTORY_DAYS_LIMIT, RESET_CONFIRMATION_WORD, LIST_PAGE_SIZE, WORK_AUTHORIZATION_MAX_LENGTH, JOB_STATUSES, MINOR_UNITS_PER_MAJOR_UNIT, RECENT_SCRAPE_RUNS_LIMIT } from "@/lib/constants";
import type { JobFilters } from "@/lib/dashboard/filters";
import type { ColBenchmarkRecord, ColBenchmarkRepository } from "@/lib/repositories/colBenchmarkRepository";
import type { DashboardJob, JobListQuery, JobQueryRepository } from "@/lib/repositories/jobQueryRepository";
import type { WorkAuthorizationRecord, WorkAuthorizationRepository } from "@/lib/repositories/workAuthorizationRepository";
import type { ScrapeRunRepository, ScrapeRunRow } from "@/lib/repositories/scrapeRunRepository";
import type { FinancialService } from "@/lib/services/financialService";

export interface HomeData {
  day: string;
  isHistory: boolean;
  jobs: DashboardJob[];
  totalCount: number;
  page: number;
  pageCount: number;
  runs: ScrapeRunRow[];
  days: string[];
}

export interface DashboardDependencies {
  jobQueries: JobQueryRepository;
  scrapeRuns: ScrapeRunRepository;
  colBenchmarks: ColBenchmarkRepository;
  financials: FinancialService;
  workAuthorizations: WorkAuthorizationRepository;
}

export class DashboardService {
  constructor(private readonly dependencies: DashboardDependencies) {}

  getHome(filters: JobFilters): HomeData {
    const { jobQueries, scrapeRuns } = this.dependencies;
    const isHistory = filters.day !== undefined;
    const day = filters.day ?? scrapeRuns.findLatestFinishedDay() ?? new Date().toISOString().slice(0, 10);
    const baseQuery: JobListQuery = {
      visibility: { mode: isHistory ? "history" : "main", day },
      countryCode: filters.countryCode,
      seniorityCode: filters.seniorityCode,
      statusCode: filters.statusCode,
      workModeCode: filters.workModeCode,
      salary: filters.salary,
      minSavingsIdr: filters.minSavingsIdr,
      minStack: filters.minStack,
      minPriority: filters.minPriority,
      search: filters.search,
      sortKey: filters.sortKey,
      direction: filters.direction,
      page: filters.page,
    };
    const totalCount = jobQueries.count(baseQuery);
    const pageCount = Math.max(1, Math.ceil(totalCount / LIST_PAGE_SIZE));
    const page = Math.min(filters.page, pageCount);
    return {
      day,
      isHistory,
      jobs: jobQueries.list({ ...baseQuery, page }),
      totalCount,
      page,
      pageCount,
      runs: scrapeRuns.listRecent(RECENT_SCRAPE_RUNS_LIMIT),
      days: jobQueries.listDays(HISTORY_DAYS_LIMIT),
    };
  }

  getCompareJobs(ids: number[]): DashboardJob[] {
    return this.dependencies.jobQueries.findByIds(ids);
  }

  changeStatus({ jobId, statusCode }: { jobId: number; statusCode: string }): void {
    if (!Number.isInteger(jobId) || jobId <= 0) throw new Error(`Invalid job id: ${jobId}`);
    if (!Object.values(JOB_STATUSES).includes(statusCode as never)) throw new Error(`Invalid status: ${statusCode}`);
    if (!this.dependencies.jobQueries.updateStatus({ jobId, statusCode })) throw new Error(`Job not found: ${jobId}`);
  }

  changeStatuses({ jobIds, statusCode }: { jobIds: number[]; statusCode: string }): number {
    if (jobIds.length === 0) throw new Error("Select at least one job");
    if (jobIds.length > LIST_PAGE_SIZE) throw new Error(`Select at most ${LIST_PAGE_SIZE} jobs`);
    if (jobIds.some((jobId) => !Number.isInteger(jobId) || jobId <= 0)) throw new Error(`Invalid job ids: ${jobIds.join(", ")}`);
    if (!Object.values(JOB_STATUSES).includes(statusCode as never)) throw new Error(`Invalid status: ${statusCode}`);
    return this.dependencies.jobQueries.updateStatuses({ jobIds: [...new Set(jobIds)], statusCode });
  }

  resetJobData(confirmation: string): number {
    if (confirmation.trim() !== RESET_CONFIRMATION_WORD) throw new Error(`Type ${RESET_CONFIRMATION_WORD} to confirm`);
    return this.dependencies.jobQueries.purgeJobData();
  }

  listColBenchmarks(): ColBenchmarkRecord[] {
    return this.dependencies.colBenchmarks.list();
  }

  updateColBenchmark({ countryCode, monthlyMajor }: { countryCode: string; monthlyMajor: number }): void {
    if (!Object.values(COUNTRY_CODES).includes(countryCode as never)) throw new Error(`Invalid country: ${countryCode}`);
    if (!Number.isFinite(monthlyMajor) || monthlyMajor <= 0) throw new Error(`Cost of living must be a positive number, got: ${monthlyMajor}`);
    const monthlyMinor = Math.round(monthlyMajor * MINOR_UNITS_PER_MAJOR_UNIT);
    this.dependencies.colBenchmarks.updateMonthly({ countryCode, monthlyMinor });
    this.dependencies.financials.recalculateAll();
  }

  listWorkAuthorizations(): WorkAuthorizationRecord[] {
    return this.dependencies.workAuthorizations.list();
  }

  updateWorkAuthorization({ countryCode, statement }: WorkAuthorizationRecord): void {
    if (!Object.values(COUNTRY_CODES).includes(countryCode as never)) throw new Error(`Invalid country: ${countryCode}`);
    const trimmed = statement.trim();
    if (!trimmed) throw new Error("Work authorization statement cannot be empty");
    if (trimmed.length > WORK_AUTHORIZATION_MAX_LENGTH) throw new Error(`Work authorization statement is longer than ${WORK_AUTHORIZATION_MAX_LENGTH} characters`);
    this.dependencies.workAuthorizations.update({ countryCode, statement: trimmed });
  }
}
