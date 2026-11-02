import {
  COUNTRY_PRIORITY_SCORES,
  PERCENT_MAX,
  PRIORITY_WEIGHTS,
  SAVINGS_TARGET_IDR,
  WORK_MODE_PRIORITY_SCORES,
} from "@/lib/constants";

export interface PriorityInput {
  countryCode: string;
  workModeCode: string;
  stackMatchScore: number;
  isMncOrAccredited: boolean;
  netSavingsMonthlyIdr: number | null;
}

function savingsScore(netSavingsMonthlyIdr: number | null): number {
  if (netSavingsMonthlyIdr === null || netSavingsMonthlyIdr <= 0) return 0;
  return Math.min(netSavingsMonthlyIdr / SAVINGS_TARGET_IDR, 1) * PERCENT_MAX;
}

// A missing salary is normal (most postings hide it): the savings part is left out, not scored as zero.
export function calculatePriorityScore(input: PriorityInput): number {
  const hasSalaryEstimate = input.netSavingsMonthlyIdr !== null;
  const weightedTotal =
    (hasSalaryEstimate ? savingsScore(input.netSavingsMonthlyIdr) * PRIORITY_WEIGHTS.SAVINGS : 0) +
    input.stackMatchScore * PRIORITY_WEIGHTS.STACK +
    (COUNTRY_PRIORITY_SCORES[input.countryCode] ?? 0) * PRIORITY_WEIGHTS.COUNTRY +
    (WORK_MODE_PRIORITY_SCORES[input.workModeCode] ?? 0) * PRIORITY_WEIGHTS.WORK_MODE +
    (input.isMncOrAccredited ? PERCENT_MAX : 0) * PRIORITY_WEIGHTS.EMPLOYER;
  const applicableWeights = hasSalaryEstimate ? PRIORITY_WEIGHTS : { ...PRIORITY_WEIGHTS, SAVINGS: 0 };
  const totalWeight = Object.values(applicableWeights).reduce((sum, weight) => sum + weight, 0);
  return Math.round(weightedTotal / totalWeight);
}
