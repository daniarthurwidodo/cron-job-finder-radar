import type Database from "better-sqlite3";

export interface EmailSyncRun {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  fetchedCount: number;
  matchedCount: number;
  errorMessage: string | null;
}

export class EmailSyncRunRepository {
  constructor(private readonly db: Database.Database) {}

  start(): number {
    return Number(this.db.prepare("INSERT INTO email_sync_runs (started_at) VALUES (?)").run(new Date().toISOString()).lastInsertRowid);
  }

  finish({ id, fetchedCount, matchedCount, errorMessage }: { id: number; fetchedCount: number; matchedCount: number; errorMessage: string | null }): void {
    this.db
      .prepare(
        `UPDATE email_sync_runs SET finished_at = ?, fetched_count = ?, matched_count = ?, error_message = ?,
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(new Date().toISOString(), fetchedCount, matchedCount, errorMessage, id);
  }

  findLatest(): EmailSyncRun | undefined {
    return this.db
      .prepare(
        `SELECT id, started_at AS startedAt, finished_at AS finishedAt, fetched_count AS fetchedCount,
                matched_count AS matchedCount, error_message AS errorMessage FROM email_sync_runs ORDER BY id DESC LIMIT 1`,
      )
      .get() as EmailSyncRun | undefined;
  }
}
