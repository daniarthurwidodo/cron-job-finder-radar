import type Database from "better-sqlite3";
import { TRACKED_JOB_STATUSES } from "@/lib/constants";
import type { CandidateJob } from "@/lib/email/types";

export interface JobEmailInsert {
  jobId: number;
  gmailMessageId: string;
  threadId: string;
  fromAddress: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  category: string;
  suggestedStatusCode: string | null;
  matchReason: string;
}

export interface JobEmailRow extends JobEmailInsert {
  id: number;
  isDismissed: number;
  jobTitle: string;
}

const SELECT_EMAIL_SQL = `
  SELECT e.id, e.job_id AS jobId, e.gmail_message_id AS gmailMessageId, e.thread_id AS threadId, e.from_address AS fromAddress,
         e.subject, e.snippet, e.received_at AS receivedAt, e.category, e.suggested_status_code AS suggestedStatusCode,
         e.match_reason AS matchReason, e.is_dismissed AS isDismissed, j.title AS jobTitle
  FROM job_emails e JOIN jobs j ON j.id = e.job_id`;
const SOURCE_ID_SEPARATOR = "|";

export class JobEmailRepository {
  constructor(private readonly db: Database.Database) {}

  listCandidateJobs(): CandidateJob[] {
    const quoted = TRACKED_JOB_STATUSES.map((status) => `'${status}'`).join(", ");
    const rows = this.db
      .prepare(
        `SELECT j.id, j.title, co.name AS companyName,
                COALESCE((SELECT group_concat(js.source_job_id, '${SOURCE_ID_SEPARATOR}') FROM job_sources js WHERE js.job_id = j.id), '') AS sourceIds
         FROM jobs j JOIN companies co ON co.id = j.company_id JOIN job_statuses st ON st.id = j.status_id
         WHERE j.deleted_at IS NULL AND (st.code IN (${quoted}) OR j.apply_queued_at IS NOT NULL)`,
      )
      .all() as { id: number; title: string; companyName: string; sourceIds: string }[];
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      companyName: row.companyName,
      sourceJobIds: row.sourceIds ? row.sourceIds.split(SOURCE_ID_SEPARATOR) : [],
    }));
  }

  exists(gmailMessageId: string): boolean {
    return this.db.prepare("SELECT id FROM job_emails WHERE gmail_message_id = ?").get(gmailMessageId) !== undefined;
  }

  insert(email: JobEmailInsert): void {
    this.db
      .prepare(
        `INSERT INTO job_emails (job_id, gmail_message_id, thread_id, from_address, subject, snippet, received_at, category, suggested_status_code, match_reason)
         VALUES (@jobId, @gmailMessageId, @threadId, @fromAddress, @subject, @snippet, @receivedAt, @category, @suggestedStatusCode, @matchReason)`,
      )
      .run(email);
  }

  listForJob(jobId: number): JobEmailRow[] {
    return this.db.prepare(`${SELECT_EMAIL_SQL} WHERE e.job_id = ? ORDER BY e.received_at DESC`).all(jobId) as JobEmailRow[];
  }

  listPendingSuggestions(): JobEmailRow[] {
    return this.db
      .prepare(`${SELECT_EMAIL_SQL} WHERE e.is_dismissed = 0 AND e.suggested_status_code IS NOT NULL ORDER BY e.received_at DESC`)
      .all() as JobEmailRow[];
  }

  listRecent(limit: number): JobEmailRow[] {
    return this.db.prepare(`${SELECT_EMAIL_SQL} ORDER BY e.received_at DESC LIMIT ?`).all(limit) as JobEmailRow[];
  }

  find(id: number): JobEmailRow | undefined {
    return this.db.prepare(`${SELECT_EMAIL_SQL} WHERE e.id = ?`).get(id) as JobEmailRow | undefined;
  }

  markHandled(id: number): void {
    this.db.prepare("UPDATE job_emails SET is_dismissed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  }
}
