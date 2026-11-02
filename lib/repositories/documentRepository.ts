import type Database from "better-sqlite3";

export interface DocumentRecord {
  kind: string;
  content: string;
  updatedAt: string;
}

export class DocumentRepository {
  constructor(private readonly db: Database.Database) {}

  upsert({ jobId, kind, content }: { jobId: number; kind: string; content: string }): void {
    const existing = this.db.prepare("SELECT id FROM documents WHERE job_id = ? AND kind = ?").get(jobId, kind) as
      | { id: number }
      | undefined;
    if (existing) {
      this.db.prepare("UPDATE documents SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(content, existing.id);
      return;
    }
    this.db.prepare("INSERT INTO documents (job_id, kind, content) VALUES (?, ?, ?)").run(jobId, kind, content);
  }

  listByJob(jobId: number): DocumentRecord[] {
    return this.db
      .prepare("SELECT kind, content, updated_at AS updatedAt FROM documents WHERE job_id = ? ORDER BY id")
      .all(jobId) as DocumentRecord[];
  }

  find({ jobId, kind }: { jobId: number; kind: string }): DocumentRecord | undefined {
    return this.db
      .prepare("SELECT kind, content, updated_at AS updatedAt FROM documents WHERE job_id = ? AND kind = ?")
      .get(jobId, kind) as DocumentRecord | undefined;
  }
}
