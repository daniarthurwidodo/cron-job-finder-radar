import { logger } from "@/lib/logger";
import type { ColBenchmarkRepository } from "@/lib/repositories/colBenchmarkRepository";
import type { ExchangeRateRepository } from "@/lib/repositories/exchangeRateRepository";
import type { FinancialInput, FinancialUpdate, JobRepository } from "@/lib/repositories/jobRepository";
import { computeFinancialEstimate, type FinancialEstimate } from "@/lib/services/financialEstimate";
import { calculatePriorityScore } from "@/lib/services/priorityScore";

export interface FinancialDependencies {
  jobs: JobRepository;
  exchangeRates: ExchangeRateRepository;
  colBenchmarks: ColBenchmarkRepository;
  runInTransaction: <T>(work: () => T) => T;
}

interface LookupTables {
  rateByCurrency: Map<string, number>;
  colByCountry: Map<string, { currencyCode: string; monthlyMinor: number }>;
}

export interface RecalculationSummary {
  total: number;
  estimated: number;
}

export class FinancialService {
  constructor(private readonly dependencies: FinancialDependencies) {}

  recalculateAll(): RecalculationSummary {
    const { jobs, runInTransaction } = this.dependencies;
    const lookups = this.loadLookups();
    const inputs = jobs.listFinancialInputs();
    let estimated = 0;
    runInTransaction(() => {
      for (const input of inputs) {
        const estimate = this.estimate({ input, lookups });
        if (estimate) estimated += 1;
        jobs.updateFinancials(this.toUpdate({ input, estimate }));
      }
    });
    logger.info("financials recalculated", { total: inputs.length, estimated });
    return { total: inputs.length, estimated };
  }

  private loadLookups(): LookupTables {
    const { exchangeRates, colBenchmarks } = this.dependencies;
    return {
      rateByCurrency: new Map(exchangeRates.list().map((rate) => [rate.currencyCode, rate.rateToIdr])),
      colByCountry: new Map(
        colBenchmarks.list().map((col) => [col.countryCode, { currencyCode: col.currencyCode, monthlyMinor: col.monthlyMinor }]),
      ),
    };
  }

  private estimate({ input, lookups }: { input: FinancialInput; lookups: LookupTables }): FinancialEstimate | null {
    const rateToIdr = lookups.rateByCurrency.get(input.currencyCode);
    const col = lookups.colByCountry.get(input.countryCode);
    if (input.salaryMinMonthlyMinor === null || rateToIdr === undefined || col === undefined) return null;
    if (col.currencyCode !== input.currencyCode) return null;
    return computeFinancialEstimate({
      countryCode: input.countryCode,
      grossMonthlyMinor: input.salaryMinMonthlyMinor,
      colMonthlyMinor: col.monthlyMinor,
      rateToIdr,
    });
  }

  private toUpdate({ input, estimate }: { input: FinancialInput; estimate: FinancialEstimate | null }): FinancialUpdate {
    return {
      jobId: input.id,
      grossMonthlyIdr: estimate?.grossMonthlyIdr ?? null,
      taxMonthlyIdr: estimate?.taxMonthlyIdr ?? null,
      colMonthlyIdr: estimate?.colMonthlyIdr ?? null,
      netSavingsMonthlyIdr: estimate?.netSavingsMonthlyIdr ?? null,
      priorityScore: calculatePriorityScore({
        countryCode: input.countryCode,
        workModeCode: input.workModeCode,
        stackMatchScore: input.stackMatchScore,
        isMncOrAccredited: input.isMncOrAccredited,
        netSavingsMonthlyIdr: estimate?.netSavingsMonthlyIdr ?? null,
      }),
    };
  }
}
