import type Database from "better-sqlite3";
import { HIDDEN_JOB_STATUSES, LIST_PAGE_SIZE, SALARY_FILTER, SORT_DIRECTIONS, SORT_KEYS, TRACKED_JOB_STATUSES } from "@/lib/constants";

export interface DashboardJob {
  id: number;
  title: string;
  companyName: string;
  city: string;
  countryCode: string;
  workModeCode: string;
  seniorityCode: string;
  statusCode: string;
  stackMatchScore: number;
  priorityScore: number;
  currencyCode: string;
  salaryMinMonthlyMinor: number | null;
  salaryMaxMonthlyMinor: number | null;
  grossMonthlyIdr: number | null;
  taxMonthlyIdr: number | null;
  colMonthlyIdr: number | null;
  netSavingsMonthlyIdr: number | null;
  hasVisaSponsorship: number;
  createdAt: string;
  applyQueuedAt: string | null;
  sourceUrl: string | null;
  techTags: string | null;
}

export type Visibility = { mode: "main"; day: string } | { mode: "history"; day: string };

export interface JobListQuery {
  visibility: Visibility;
  countryCode?: string;
  seniorityCode?: string;
  statusCode?: string;
  workModeCode?: string;
  salary?: string;
  minSavingsIdr?: number;
  minStack?: number;
  minPriority?: number;
  search?: string;
  sortKey: string;
  direction: string;
  page: number;
}

const FROM_DASHBOARD_JOB_SQL = `FROM jobs j
  JOIN companies co ON co.id = j.company_id
  JOIN countries c ON c.id = j.country_id
  JOIN work_modes w ON w.id = j.work_mode_id
  JOIN seniorities s ON s.id = j.seniority_id
  JOIN job_statuses st ON st.id = j.status_id
  WHERE j.deleted_at IS NULL`;

const SELECT_DASHBOARD_JOB_SQL = `
  SELECT j.id, j.title, co.name AS companyName, j.city, c.code AS countryCode, w.code AS workModeCode,
         s.code AS seniorityCode, st.code AS statusCode, j.stack_match_score AS stackMatchScore,
         j.priority_score AS priorityScore, j.currency_code AS currencyCode,
         j.salary_min_monthly_minor AS salaryMinMonthlyMinor, j.salary_max_monthly_minor AS salaryMaxMonthlyMinor,
         j.est_gross_monthly_idr AS grossMonthlyIdr, j.est_tax_monthly_idr AS taxMonthlyIdr,
         j.est_col_monthly_idr AS colMonthlyIdr, j.est_net_savings_monthly_idr AS netSavingsMonthlyIdr,
         j.has_visa_sponsorship AS hasVisaSponsorship, j.created_at AS createdAt, j.apply_queued_at AS applyQueuedAt,
         (SELECT js.source_url FROM job_sources js WHERE js.job_id = j.id ORDER BY js.id LIMIT 1) AS sourceUrl,
         (SELECT group_concat(t.tech_tag, ', ') FROM job_tech_tags t WHERE t.job_id = j.id) AS techTags
  ${FROM_DASHBOARD_JOB_SQL}`;

const SORT_COLUMNS: Record<string, string> = {
  [SORT_KEYS.PRIORITY]: "j.priority_score",
  [SORT_KEYS.SAVINGS]: "j.est_net_savings_monthly_idr",
  [SORT_KEYS.STACK]: "j.stack_match_score",
  [SORT_KEYS.NEWEST]: "j.created_at",
};

// Jobs without a value (no salary) always sort last, whichever direction is chosen.
function buildOrderSql({ sortKey, direction }: { sortKey: string; direction: string }): string {
  const column = SORT_COLUMNS[sortKey] ?? SORT_COLUMNS[SORT_KEYS.PRIORITY];
  const sqlDirection = direction === SORT_DIRECTIONS.ASC ? "ASC" : "DESC";
  return `${column} IS NULL, ${column} ${sqlDirection}, j.id ${sqlDirection}`;
}

const MINIMUM_FILTERS = [
  { queryKey: "minSavingsIdr", column: "j.est_net_savings_monthly_idr" },
  { queryKey: "minStack", column: "j.stack_match_score" },
  { queryKey: "minPriority", column: "j.priority_score" },
] as const;
const LIKE_ESCAPE_PATTERN = /[\\%_]/g;

function quoteList(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(", ");
}

function buildVisibilitySql(visibility: Visibility): string {
  if (visibility.mode === "history") return "date(j.created_at) = @day";
  return `(date(j.created_at) = @day OR st.code IN (${quoteList(TRACKED_JOB_STATUSES)}))
          AND st.code NOT IN (${quoteList(HIDDEN_JOB_STATUSES)})`;
}

export class JobQueryRepository {
  constructor(private readonly db: Database.Database) {}

  list(query: JobListQuery): DashboardJob[] {
    const { whereSql, params } = this.buildFilter(query);
    const orderBy = buildOrderSql(query);
    const sql = `${SELECT_DASHBOARD_JOB_SQL} AND ${whereSql} ORDER BY ${orderBy} LIMIT @limit OFFSET @offset`;
    const offset = (query.page - 1) * LIST_PAGE_SIZE;
    return this.db.prepare(sql).all({ ...params, limit: LIST_PAGE_SIZE, offset }) as DashboardJob[];
  }

  count(query: JobListQuery): number {
    const { whereSql, params } = this.buildFilter(query);
    const sql = `SELECT COUNT(j.id) AS total ${FROM_DASHBOARD_JOB_SQL} AND ${whereSql}`;
    return (this.db.prepare(sql).get(params) as { total: number }).total;
  }

  private buildFilter(query: JobListQuery): { whereSql: string; params: Record<string, string | number> } {
    const conditions = [buildVisibilitySql(query.visibility)];
    const params: Record<string, string | number> = { day: query.visibility.day };
    if (query.countryCode) {
      conditions.push("c.code = @countryCode");
      params.countryCode = query.countryCode;
    }
    if (query.seniorityCode) {
      conditions.push("s.code = @seniorityCode");
      params.seniorityCode = query.seniorityCode;
    }
    if (query.statusCode) {
      conditions.push("st.code = @statusCode");
      params.statusCode = query.statusCode;
    }
    if (query.workModeCode) {
      conditions.push("w.code = @workModeCode");
      params.workModeCode = query.workModeCode;
    }
    if (query.salary === SALARY_FILTER.DISCLOSED) conditions.push("j.salary_min_monthly_minor IS NOT NULL");
    if (query.salary === SALARY_FILTER.HIDDEN) conditions.push("j.salary_min_monthly_minor IS NULL");
    for (const minimum of MINIMUM_FILTERS) {
      const value = query[minimum.queryKey];
      if (value === undefined) continue;
      conditions.push(`${minimum.column} >= @${minimum.queryKey}`);
      params[minimum.queryKey] = value;
    }
    if (query.search) {
      conditions.push("(j.title LIKE @search ESCAPE '\\' OR co.name LIKE @search ESCAPE '\\')");
      params.search = `%${query.search.replace(LIKE_ESCAPE_PATTERN, "\\$&")}%`;
    }
    return { whereSql: conditions.join(" AND "), params };
  }

  findByIds(ids: number[]): DashboardJob[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(", ");
    const rows = this.db
      .prepare(`${SELECT_DASHBOARD_JOB_SQL} AND j.id IN (${placeholders})`)
      .all(...ids) as DashboardJob[];
    return ids.flatMap((id) => rows.filter((row) => row.id === id));
  }

  listDays(limit: number): string[] {
    const rows = this.db
      .prepare("SELECT DISTINCT date(created_at) AS day FROM jobs WHERE deleted_at IS NULL ORDER BY day DESC LIMIT ?")
      .all(limit) as { day: string }[];
    return rows.map((row) => row.day);
  }

  updateStatus({ jobId, statusCode }: { jobId: number; statusCode: string }): boolean {
    const result = this.db
      .prepare(
        `UPDATE jobs SET status_id = (SELECT id FROM job_statuses WHERE code = ?), updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND deleted_at IS NULL`,
      )
      .run(statusCode, jobId);
    return result.changes > 0;
  }

  updateStatuses({ jobIds, statusCode }: { jobIds: number[]; statusCode: string }): number {
    const placeholders = jobIds.map(() => "?").join(", ");
    const result = this.db
      .prepare(
        `UPDATE jobs SET status_id = (SELECT id FROM job_statuses WHERE code = ?), updated_at = CURRENT_TIMESTAMP
         WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      )
      .run(statusCode, ...jobIds);
    return result.changes;
  }
}
