import { MIN_STACK_MATCH_SCORE, REJECTION_REASONS, SENIORITIES, TARGET_ROLE_PATTERN, WORK_MODES } from "@/lib/constants";
import type { ScoredJob } from "@/lib/types";

export function isTargetRole(title: string): boolean {
  return TARGET_ROLE_PATTERN.test(title);
}

const REJECTION_RULES: { reason: string; isViolated: (job: ScoredJob) => boolean }[] = [
  { reason: REJECTION_REASONS.NOT_TARGET_ROLE, isViolated: (job) => !isTargetRole(job.title) },
  { reason: REJECTION_REASONS.ENTRY_LEVEL, isViolated: (job) => job.seniorityCode === SENIORITIES.ENTRY },
  { reason: REJECTION_REASONS.ON_SITE_ONLY, isViolated: (job) => job.workModeCode === WORK_MODES.ON_SITE },
  { reason: REJECTION_REASONS.CONTRACT_OR_TEMPORARY, isViolated: (job) => job.isContractOrTemporary },
  { reason: REJECTION_REASONS.NO_STACK_MATCH, isViolated: (job) => job.stackMatch.score < MIN_STACK_MATCH_SCORE },
];

export function findRejectionReason(job: ScoredJob): string | null {
  return REJECTION_RULES.find((rule) => rule.isViolated(job))?.reason ?? null;
}
