import { SALARY_PERIODS } from "@/lib/constants";
import type { SalaryPeriod } from "@/lib/types";

export interface ParsedSalary {
  min: number | null;
  max: number | null;
  period: SalaryPeriod | null;
}

const AMOUNT_PATTERN = /(\d[\d,]*(?:\.\d+)?)\s*(k)?/gi;
const MONTHLY_PATTERN = /per\s+month|\/\s*month|monthly|a\s+month/i;
const ANNUAL_PATTERN = /per\s+(year|annum)|\/\s*(year|yr)|yearly|annual|p\.a\./i;
const THOUSAND = 1000;

function detectPeriod(text: string): { period: SalaryPeriod | null; endIndex: number } {
  const monthly = MONTHLY_PATTERN.exec(text);
  const annual = ANNUAL_PATTERN.exec(text);
  if (monthly && (!annual || monthly.index < annual.index)) return { period: SALARY_PERIODS.MONTHLY, endIndex: monthly.index };
  if (annual) return { period: SALARY_PERIODS.ANNUAL, endIndex: annual.index };
  return { period: null, endIndex: text.length };
}

export function parseSalaryText(text: string | null | undefined): ParsedSalary | null {
  if (!text) return null;
  const { period, endIndex } = detectPeriod(text);
  const amounts = [...text.slice(0, endIndex).matchAll(AMOUNT_PATTERN)]
    .map((match) => Number(match[1].replace(/,/g, "")) * (match[2] ? THOUSAND : 1))
    .filter((amount) => Number.isFinite(amount) && amount > 0);
  if (amounts.length === 0) return null;
  return { min: Math.min(...amounts), max: Math.max(...amounts), period };
}
