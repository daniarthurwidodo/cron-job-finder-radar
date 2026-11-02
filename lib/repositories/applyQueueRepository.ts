import type Database from "better-sqlite3";
import { DOCUMENT_KINDS, JOB_STATUSES } from "@/lib/constants";

export interface QueuedJobRow {
  id: number;
  title: string;
  companyName: string;
  countryCode: string;
  statusCode: string;
  sourceCode: string | null;
  sourceUrl: string | null;
  queuedAt: string;
  skippedAt: string | null;
  appliedAt: string | null;
  documentCount: number;
}

const SELECT_QUEUE_SQL = `
  SELECT j.id, j.title, co.name AS companyName, c.code AS countryCode, st.code AS statusCode,
         (SELECT js.source_code FROM job_sources js WHERE js.job_id = j.id ORDER BY js.id LIMIT 1) AS sourceCode,
         (SELECT js.source_url FROM job_sources js WHERE js.job_id = j.id ORDER BY js.id LIMIT 1) AS sourceUrl,
         j.apply_queued_at AS queuedAt, j.apply_skipped_at AS skippedAt, j.applied_at AS appliedAt,
         (SELECT COUNT(d.id) FROM documents d WHERE d.job_id = j.id AND d.kind IN ('${DOCUMENT_KINDS.CV}', '${DOCUMENT_KINDS.COVER_LETTER}')) AS documentCount
  FROM jobs j
  JOIN companies co ON co.id = j.company_id
  JOIN countries c ON c.id = j.country_id
  JOIN job_statuses st ON st.id = j.status_id
  WHERE j.deleted_at IS NULL AND j.apply_queued_at IS NOT NULL`;

export class ApplyQueueRepository {
  constructor(private readonly db: Database.Database) {}

  list(): QueuedJobRow[] {
    return this.db.prepare(`${SELECT_QUEUE_SQL} ORDER BY j.apply_queued_at DESC, j.id DESC`).all() as QueuedJobRow[];
  }

  find(jobId: number): QueuedJobRow | undefined {
    return this.db.prepare(`${SELECT_QUEUE_SQL} AND j.id = ?`).get(jobId) as QueuedJobRow | undefined;
  }

  queue(jobId: number): boolean {
    return this.touch({ jobId, sql: "apply_queued_at = CURRENT_TIMESTAMP, apply_skipped_at = NULL" });
  }

  unqueue(jobId: number): boolean {
    return this.touch({ jobId, sql: "apply_queued_at = NULL, apply_skipped_at = NULL" });
  }

  skip(jobId: number): boolean {
    return this.touch({ jobId, sql: "apply_skipped_at = CURRENT_TIMESTAMP", extraCondition: "apply_queued_at IS NOT NULL" });
  }

  markApplied(jobId: number): boolean {
    return this.touch({
      jobId,
      sql: `applied_at = CURRENT_TIMESTAMP, apply_skipped_at = NULL, status_id = (SELECT id FROM job_statuses WHERE code = '${JOB_STATUSES.APPLIED}')`,
      extraCondition: "apply_queued_at IS NOT NULL",
    });
  }

  private touch({ jobId, sql, extraCondition }: { jobId: number; sql: string; extraCondition?: string }): boolean {
    const condition = extraCondition ? ` AND ${extraCondition}` : "";
    const result = this.db
      .prepare(`UPDATE jobs SET ${sql}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL${condition}`)
      .run(jobId);
    return result.changes > 0;
  }
}
