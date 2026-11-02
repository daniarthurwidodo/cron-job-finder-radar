import type Database from "better-sqlite3";

export class CompanyRepository {
  constructor(private readonly db: Database.Database) {}

  findIdByNormalizedName(nameNormalized: string): number | undefined {
    const row = this.db
      .prepare("SELECT id FROM companies WHERE name_normalized = ? AND deleted_at IS NULL")
      .get(nameNormalized) as { id: number } | undefined;
    return row?.id;
  }

  insert({ name, nameNormalized }: { name: string; nameNormalized: string }): number {
    const result = this.db
      .prepare("INSERT INTO companies (name, name_normalized) VALUES (?, ?)")
      .run(name, nameNormalized);
    return Number(result.lastInsertRowid);
  }
}
