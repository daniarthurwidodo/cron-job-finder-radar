import type Database from "better-sqlite3";

export interface WorkAuthorizationRecord {
  countryCode: string;
  statement: string;
}

export class WorkAuthorizationRepository {
  constructor(private readonly db: Database.Database) {}

  list(): WorkAuthorizationRecord[] {
    return this.db
      .prepare(
        `SELECT c.code AS countryCode, w.statement FROM work_authorizations w
         JOIN countries c ON c.id = w.country_id ORDER BY c.sort_order`,
      )
      .all() as WorkAuthorizationRecord[];
  }

  findStatement(countryCode: string): string | undefined {
    return this.list().find((record) => record.countryCode === countryCode)?.statement;
  }

  update({ countryCode, statement }: WorkAuthorizationRecord): void {
    this.db
      .prepare(
        `UPDATE work_authorizations SET statement = ?, updated_at = CURRENT_TIMESTAMP
         WHERE country_id = (SELECT id FROM countries WHERE code = ?)`,
      )
      .run(statement, countryCode);
  }
}
