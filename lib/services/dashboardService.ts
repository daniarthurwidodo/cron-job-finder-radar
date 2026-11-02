import { COUNTRY_CODES, HISTORY_DAYS_LIMIT, LIST_PAGE_SIZE, JOB_STATUSES, MINOR_UNITS_PER_MAJOR_UNIT, RECENT_SCRAPE_RUNS_LIMIT } from "@/lib/constants";
import type { JobFilters } from "@/lib/dashboard/filters";
import type { ColBenchmarkRecord, ColBenchmarkRepository } from "@/lib/repositories/colBenchmarkRepository";
import type { DashboardJob, JobListQuery, JobQueryRepository } from "@/lib/repositories/jobQueryRepository";
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
      search: filters.search,
      sortKey: filters.sortKey,
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
}
