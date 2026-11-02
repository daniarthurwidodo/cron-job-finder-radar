import type Database from "better-sqlite3";

export interface JobSourceInsert {
  jobId: number;
  sourceCode: string;
  sourceJobId: string;
  sourceUrl: string;
}

export class JobSourceRepository {
  constructor(private readonly db: Database.Database) {}

  findJobIdBySourceUrl(sourceUrl: string): number | undefined {
    const row = this.db
      .prepare("SELECT job_id FROM job_sources WHERE source_url = ?")
      .get(sourceUrl) as { job_id: number } | undefined;
    return row?.job_id;
  }

  countByJobId(jobId: number): number {
    const row = this.db.prepare("SELECT COUNT(id) AS total FROM job_sources WHERE job_id = ?").get(jobId) as {
      total: number;
    };
    return row.total;
  }

  insert(source: JobSourceInsert): void {
    const seenAt = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO job_sources (job_id, source_code, source_job_id, source_url, first_seen_at, last_seen_at)
         VALUES (@jobId, @sourceCode, @sourceJobId, @sourceUrl, @seenAt, @seenAt)`,
      )
      .run({ ...source, seenAt });
  }

  touch(sourceUrl: string): void {
    const seenAt = new Date().toISOString();
    this.db
      .prepare("UPDATE job_sources SET last_seen_at = ?, updated_at = CURRENT_TIMESTAMP WHERE source_url = ?")
      .run(seenAt, sourceUrl);
  }
}
