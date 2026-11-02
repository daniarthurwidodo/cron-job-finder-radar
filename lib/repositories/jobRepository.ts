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
    posted_at, dedup_hash, currency_code, salary_min_monthly_minor, salary_max_monthly_minor, stack_match_score
  ) VALUES (
    @companyId, @title, @city,
    (SELECT id FROM countries WHERE code = @countryCode),
    (SELECT id FROM work_modes WHERE code = @workModeCode),
    (SELECT id FROM seniorities WHERE code = @seniorityCode),
    (SELECT id FROM job_statuses WHERE code = @statusCode),
    @description, @postedAt, @dedupHash, @currencyCode,
    @salaryMinMonthlyMinor, @salaryMaxMonthlyMinor, @stackMatchScore
  )`;

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
