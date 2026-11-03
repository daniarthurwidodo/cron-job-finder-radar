import type Database from "better-sqlite3";
import { JOB_STATUSES } from "@/lib/constants";

export interface JobInsert {
  companyId: number;
  title: string;
  city: string;
  countryCode: string;
  workModeCode: string;
  seniorityCode: string;
  description: string;
  postedAt: string | null;
  dedupHash: string;
  currencyCode: string;
  salaryMinMonthlyMinor: number | null;
  salaryMaxMonthlyMinor: number | null;
  stackMatchScore: number;
  hasVisaSponsorship: number;
  techTags: string[];
}

export interface JobRecord {
  id: number;
  title: string;
  city: string;
  countryCode: string;
  workModeCode: string;
  seniorityCode: string;
  statusCode: string;
  stackMatchScore: number;
  dedupHash: string;
}

const INSERT_JOB_SQL = `
  INSERT INTO jobs (
    company_id, title, city, country_id, work_mode_id, seniority_id, status_id, description,
    posted_at, dedup_hash, currency_code, salary_min_monthly_minor, salary_max_monthly_minor, stack_match_score, has_visa_sponsorship
  ) VALUES (
    @companyId, @title, @city,
    (SELECT id FROM countries WHERE code = @countryCode),
    (SELECT id FROM work_modes WHERE code = @workModeCode),
    (SELECT id FROM seniorities WHERE code = @seniorityCode),
    (SELECT id FROM job_statuses WHERE code = @statusCode),
    @description, @postedAt, @dedupHash, @currencyCode,
    @salaryMinMonthlyMinor, @salaryMaxMonthlyMinor, @stackMatchScore, @hasVisaSponsorship
  )`;

export interface FinancialInput {
  id: number;
  countryCode: string;
  currencyCode: string;
  workModeCode: string;
  stackMatchScore: number;
  salaryMinMonthlyMinor: number | null;
  isMncOrAccredited: boolean;
}

export interface FinancialUpdate {
  jobId: number;
  grossMonthlyIdr: number | null;
  taxMonthlyIdr: number | null;
  colMonthlyIdr: number | null;
  netSavingsMonthlyIdr: number | null;
  priorityScore: number;
}

export interface JobFinancials {
  grossMonthlyIdr: number | null;
  taxMonthlyIdr: number | null;
  colMonthlyIdr: number | null;
  netSavingsMonthlyIdr: number | null;
  priorityScore: number;
}

const SELECT_FINANCIAL_INPUTS_SQL = `
  SELECT j.id, c.code AS countryCode, j.currency_code AS currencyCode, w.code AS workModeCode,
         j.stack_match_score AS stackMatchScore, j.salary_min_monthly_minor AS salaryMinMonthlyMinor,
         (co.is_mnc = 1 OR co.is_accredited = 1) AS isMncOrAccredited
  FROM jobs j
  JOIN countries c ON c.id = j.country_id
  JOIN work_modes w ON w.id = j.work_mode_id
  JOIN companies co ON co.id = j.company_id
  WHERE j.deleted_at IS NULL`;

const UPDATE_FINANCIALS_SQL = `
  UPDATE jobs SET est_gross_monthly_idr = @grossMonthlyIdr, est_tax_monthly_idr = @taxMonthlyIdr,
    est_col_monthly_idr = @colMonthlyIdr, est_net_savings_monthly_idr = @netSavingsMonthlyIdr,
    priority_score = @priorityScore, updated_at = CURRENT_TIMESTAMP
  WHERE id = @jobId`;

export interface DocumentContext {
  id: number;
  title: string;
  companyName: string;
  countryCode: string;
  description: string;
  techTags: string[];
}

const SELECT_DOCUMENT_CONTEXT_SQL = `
  SELECT j.id, j.title, co.name AS companyName, c.code AS countryCode, j.description
  FROM jobs j JOIN companies co ON co.id = j.company_id JOIN countries c ON c.id = j.country_id
  WHERE j.id = ? AND j.deleted_at IS NULL`;

const SELECT_JOB_BY_ID_SQL = `
  SELECT j.id, j.title, j.city, c.code AS countryCode, w.code AS workModeCode, s.code AS seniorityCode,
         st.code AS statusCode, j.stack_match_score AS stackMatchScore, j.dedup_hash AS dedupHash
  FROM jobs j
  JOIN countries c ON c.id = j.country_id
  JOIN work_modes w ON w.id = j.work_mode_id
  JOIN seniorities s ON s.id = j.seniority_id
  JOIN job_statuses st ON st.id = j.status_id
  WHERE j.id = ? AND j.deleted_at IS NULL`;

export class JobRepository {
  constructor(private readonly db: Database.Database) {}

  findIdByDedupHash(dedupHash: string): number | undefined {
    const row = this.db
      .prepare("SELECT id FROM jobs WHERE dedup_hash = ? AND deleted_at IS NULL")
      .get(dedupHash) as { id: number } | undefined;
    return row?.id;
  }

  findById(id: number): JobRecord | undefined {
    return this.db.prepare(SELECT_JOB_BY_ID_SQL).get(id) as JobRecord | undefined;
  }

  insert(job: JobInsert): number {
    const { techTags, ...columns } = job;
    const result = this.db.prepare(INSERT_JOB_SQL).run({ ...columns, statusCode: JOB_STATUSES.DISCOVERED });
    const jobId = Number(result.lastInsertRowid);
    this.insertTechTags({ jobId, techTags });
    return jobId;
  }

  listFinancialInputs(): FinancialInput[] {
    const rows = this.db.prepare(SELECT_FINANCIAL_INPUTS_SQL).all() as (Omit<FinancialInput, "isMncOrAccredited"> & {
      isMncOrAccredited: number;
    })[];
    return rows.map((row) => ({ ...row, isMncOrAccredited: row.isMncOrAccredited === 1 }));
  }

  updateFinancials(update: FinancialUpdate): void {
    this.db.prepare(UPDATE_FINANCIALS_SQL).run(update);
  }

  findFinancials(jobId: number): JobFinancials | undefined {
    return this.db
      .prepare(
        `SELECT est_gross_monthly_idr AS grossMonthlyIdr, est_tax_monthly_idr AS taxMonthlyIdr,
                est_col_monthly_idr AS colMonthlyIdr, est_net_savings_monthly_idr AS netSavingsMonthlyIdr,
                priority_score AS priorityScore FROM jobs WHERE id = ?`,
      )
      .get(jobId) as JobFinancials | undefined;
  }

  findDocumentContext(jobId: number): DocumentContext | undefined {
    const row = this.db.prepare(SELECT_DOCUMENT_CONTEXT_SQL).get(jobId) as Omit<DocumentContext, "techTags"> | undefined;
    return row ? { ...row, techTags: this.listTechTags(jobId) } : undefined;
  }

  listTechTags(jobId: number): string[] {
    const rows = this.db.prepare("SELECT tech_tag FROM job_tech_tags WHERE job_id = ? ORDER BY id").all(jobId) as {
      tech_tag: string;
    }[];
    return rows.map((row) => row.tech_tag);
  }

  private insertTechTags({ jobId, techTags }: { jobId: number; techTags: string[] }): void {
    const statement = this.db.prepare("INSERT INTO job_tech_tags (job_id, tech_tag) VALUES (?, ?)");
    for (const techTag of techTags) statement.run(jobId, techTag);
  }
}
