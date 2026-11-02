import type Database from "better-sqlite3";
import { FX_RATE_MICRO_FACTOR } from "@/lib/constants";

export interface ExchangeRateRecord {
  currencyCode: string;
  rateToIdr: number;
  fetchedAt: string;
}

export class ExchangeRateRepository {
  constructor(private readonly db: Database.Database) {}

  upsert({ currencyCode, rateToIdr }: { currencyCode: string; rateToIdr: number }): void {
    const params = {
      currencyCode,
      rateMicro: Math.round(rateToIdr * FX_RATE_MICRO_FACTOR),
      fetchedAt: new Date().toISOString(),
    };
    const existing = this.db.prepare("SELECT id FROM exchange_rates WHERE currency_code = ?").get(currencyCode);
    if (existing) {
      this.db
        .prepare(
          `UPDATE exchange_rates SET rate_to_idr_micro = @rateMicro, fetched_at = @fetchedAt,
             updated_at = CURRENT_TIMESTAMP WHERE currency_code = @currencyCode`,
        )
        .run(params);
      return;
    }
    this.db
      .prepare(
        `INSERT INTO exchange_rates (currency_code, rate_to_idr_micro, fetched_at)
         VALUES (@currencyCode, @rateMicro, @fetchedAt)`,
      )
      .run(params);
  }

  list(): ExchangeRateRecord[] {
    const rows = this.db
      .prepare("SELECT currency_code AS currencyCode, rate_to_idr_micro AS rateMicro, fetched_at AS fetchedAt FROM exchange_rates")
      .all() as { currencyCode: string; rateMicro: number; fetchedAt: string }[];
    return rows.map((row) => ({
      currencyCode: row.currencyCode,
      rateToIdr: row.rateMicro / FX_RATE_MICRO_FACTOR,
      fetchedAt: row.fetchedAt,
    }));
  }
}
