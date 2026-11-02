import type Database from "better-sqlite3";

export interface ColBenchmarkRecord {
  countryCode: string;
  currencyCode: string;
  monthlyMinor: number;
  sourceNote: string;
  asOfDate: string;
}

export class ColBenchmarkRepository {
  constructor(private readonly db: Database.Database) {}

  list(): ColBenchmarkRecord[] {
    return this.db
      .prepare(
        `SELECT c.code AS countryCode, b.currency_code AS currencyCode, b.monthly_minor AS monthlyMinor,
                b.source_note AS sourceNote, b.as_of_date AS asOfDate
         FROM col_benchmarks b JOIN countries c ON c.id = b.country_id
         ORDER BY c.sort_order`,
      )
      .all() as ColBenchmarkRecord[];
  }

  updateMonthly({ countryCode, monthlyMinor }: { countryCode: string; monthlyMinor: number }): void {
    this.db
      .prepare(
        `UPDATE col_benchmarks SET monthly_minor = ?, updated_at = CURRENT_TIMESTAMP
         WHERE country_id = (SELECT id FROM countries WHERE code = ?)`,
      )
      .run(monthlyMinor, countryCode);
  }
}
