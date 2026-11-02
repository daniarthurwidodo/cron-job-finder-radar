import { MINOR_UNITS_PER_MAJOR_UNIT, MONTHS_PER_YEAR } from "@/lib/constants";
import { calculateAnnualTax } from "@/lib/tax/taxCalculator";

export interface FinancialEstimate {
  grossMonthlyIdr: number;
  taxMonthlyIdr: number;
  colMonthlyIdr: number;
  netSavingsMonthlyIdr: number;
}

export interface FinancialEstimateInput {
  countryCode: string;
  grossMonthlyMinor: number;
  colMonthlyMinor: number;
  rateToIdr: number;
}

function minorToIdr({ minor, rateToIdr }: { minor: number; rateToIdr: number }): number {
  return Math.round((minor / MINOR_UNITS_PER_MAJOR_UNIT) * rateToIdr);
}

export function computeFinancialEstimate(input: FinancialEstimateInput): FinancialEstimate {
  const { countryCode, grossMonthlyMinor, colMonthlyMinor, rateToIdr } = input;
  if (!Number.isFinite(rateToIdr) || rateToIdr <= 0) throw new Error(`Invalid exchange rate: ${rateToIdr}`);
  const annualGross = (grossMonthlyMinor / MINOR_UNITS_PER_MAJOR_UNIT) * MONTHS_PER_YEAR;
  const taxMonthlyMinor = (calculateAnnualTax({ countryCode, annualGross }) / MONTHS_PER_YEAR) * MINOR_UNITS_PER_MAJOR_UNIT;
  const netSavingsMinor = grossMonthlyMinor - taxMonthlyMinor - colMonthlyMinor;
  return {
    grossMonthlyIdr: minorToIdr({ minor: grossMonthlyMinor, rateToIdr }),
    taxMonthlyIdr: minorToIdr({ minor: taxMonthlyMinor, rateToIdr }),
    colMonthlyIdr: minorToIdr({ minor: colMonthlyMinor, rateToIdr }),
    netSavingsMonthlyIdr: minorToIdr({ minor: netSavingsMinor, rateToIdr }),
  };
}
