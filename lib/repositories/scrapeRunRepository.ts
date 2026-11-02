import type Database from "better-sqlite3";

export interface ScrapeRunCounts {
  found: number;
  inserted: number;
  duplicates: number;
  filtered: number;
  invalid: number;
}

export interface ScrapeRunRecord extends ScrapeRunCounts {
  id: number;
  sourceCode: string;
  finishedAt: string | null;
  errorMessage: string | null;
}

export interface ScrapeRunRow extends ScrapeRunRecord {
  startedAt: string;
}

export class ScrapeRunRepository {
  constructor(private readonly db: Database.Database) {}

  start(sourceCode: string): number {
    const result = this.db
      .prepare("INSERT INTO scrape_runs (source_code, started_at) VALUES (?, ?)")
      .run(sourceCode, new Date().toISOString());
    return Number(result.lastInsertRowid);
  }

  finish({ id, counts, errorMessage }: { id: number; counts: ScrapeRunCounts; errorMessage: string | null }): void {
    this.db
      .prepare(
        `UPDATE scrape_runs SET finished_at = @finishedAt, found_count = @found, inserted_count = @inserted,
           duplicate_count = @duplicates, filtered_count = @filtered, invalid_count = @invalid,
           error_message = @errorMessage, updated_at = CURRENT_TIMESTAMP
         WHERE id = @id`,
      )
      .run({ ...counts, id, errorMessage, finishedAt: new Date().toISOString() });
  }

  findById(id: number): ScrapeRunRecord | undefined {
    return this.db
      .prepare(
        `SELECT id, source_code AS sourceCode, finished_at AS finishedAt, found_count AS found,
                inserted_count AS inserted, duplicate_count AS duplicates, filtered_count AS filtered,
                invalid_count AS invalid, error_message AS errorMessage
         FROM scrape_runs WHERE id = ?`,
      )
      .get(id) as ScrapeRunRecord | undefined;
  }

  listRecent(limit: number): ScrapeRunRow[] {
    return this.db
      .prepare(
        `SELECT id, source_code AS sourceCode, started_at AS startedAt, finished_at AS finishedAt,
                found_count AS found, inserted_count AS inserted, duplicate_count AS duplicates,
                filtered_count AS filtered, invalid_count AS invalid, error_message AS errorMessage
         FROM scrape_runs ORDER BY id DESC LIMIT ?`,
      )
      .all(limit) as ScrapeRunRow[];
  }

  findLatestFinishedDay(): string | undefined {
    const row = this.db
      .prepare("SELECT date(MAX(started_at)) AS day FROM scrape_runs WHERE finished_at IS NOT NULL")
      .get() as { day: string | null };
    return row.day ?? undefined;
  }
}
