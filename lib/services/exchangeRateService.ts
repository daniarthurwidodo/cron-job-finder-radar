import type { FetchRatesToIdr } from "@/lib/fx/exchangeRateClient";
import { logger } from "@/lib/logger";
import type { ExchangeRateRepository } from "@/lib/repositories/exchangeRateRepository";

export class ExchangeRateService {
  constructor(
    private readonly exchangeRates: ExchangeRateRepository,
    private readonly fetchRatesToIdr: FetchRatesToIdr,
  ) {}

  async refresh(): Promise<boolean> {
    try {
      const ratesToIdr = await this.fetchRatesToIdr();
      for (const [currencyCode, rateToIdr] of Object.entries(ratesToIdr)) {
        this.exchangeRates.upsert({ currencyCode, rateToIdr });
      }
      return true;
    } catch (error) {
      logger.error("exchange rate refresh failed, using cached rates", { error: String(error) });
      return false;
    }
  }
}
