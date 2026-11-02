import {
  CONTRACT_EMPLOYMENT_PATTERN,
  DEFAULT_SENIORITY,
  ENTRY_TITLE_PATTERN,
  FLEXIBLE_PATTERN,
  HYBRID_PATTERN,
  LEAD_TITLE_PATTERN,
  MCF_POSITION_LEVEL_SENIORITIES,
  MINOR_UNITS_PER_MAJOR_UNIT,
  MONTHS_PER_YEAR,
  ON_SITE_ONLY_PATTERN,
  SALARY_PERIODS,
  SENIORITIES,
  SENIOR_TITLE_PATTERN,
  WORK_MODES,
} from "@/lib/constants";
import type { NormalizedJob, RawJob, SalaryPeriod } from "@/lib/types";

const HTML_TAG_PATTERN = /<[^>]*>/g;
const HTML_BREAK_PATTERN = /<(br|\/p|\/li|\/div)\s*\/?>/gi;
const WHITESPACE_PATTERN = /\s+/g;
const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};
const HTML_ENTITY_PATTERN = /&(nbsp|amp|lt|gt|quot|#39);/g;

export function stripHtml(html: string): string {
  return html
    .replace(HTML_BREAK_PATTERN, " ")
    .replace(HTML_TAG_PATTERN, " ")
    .replace(HTML_ENTITY_PATTERN, (entity) => HTML_ENTITIES[entity] ?? entity)
    .replace(WHITESPACE_PATTERN, " ")
    .trim();
}

export function toMonthlyMinor({ amount, period }: { amount: number | null; period: SalaryPeriod | null }): number | null {
  if (amount === null || period === null) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const monthlyAmount = period === SALARY_PERIODS.ANNUAL ? amount / MONTHS_PER_YEAR : amount;
  return Math.round(monthlyAmount * MINOR_UNITS_PER_MAJOR_UNIT);
}

function detectWorkMode({ description, flexibleWorkArrangements }: { description: string; flexibleWorkArrangements: string[] }): string {
  if (ON_SITE_ONLY_PATTERN.test(description)) return WORK_MODES.ON_SITE;
  if (HYBRID_PATTERN.test(description)) return WORK_MODES.HYBRID;
  if (flexibleWorkArrangements.length > 0 || FLEXIBLE_PATTERN.test(description)) return WORK_MODES.FLEXIBLE;
  return WORK_MODES.FULL_TIME;
}

function detectSeniority({ title, positionLevels }: { title: string; positionLevels: string[] }): string {
  if (ENTRY_TITLE_PATTERN.test(title)) return SENIORITIES.ENTRY;
  const mappedLevel = positionLevels
    .map((level) => (MCF_POSITION_LEVEL_SENIORITIES as Record<string, string>)[level])
    .find((seniority) => seniority !== undefined);
  if (mappedLevel) return mappedLevel;
  if (LEAD_TITLE_PATTERN.test(title)) return SENIORITIES.LEAD;
  if (SENIOR_TITLE_PATTERN.test(title)) return SENIORITIES.SENIOR;
  return DEFAULT_SENIORITY;
}

function assertRequiredFields(rawJob: RawJob): void {
  if (!rawJob.title?.trim()) throw new Error(`Job ${rawJob.sourceJobId} has no title`);
  if (!rawJob.companyName?.trim()) throw new Error(`Job ${rawJob.sourceJobId} has no company`);
  if (!rawJob.sourceUrl?.trim()) throw new Error(`Job ${rawJob.sourceJobId} has no url`);
}

export function normalizeJob(rawJob: RawJob): NormalizedJob {
  assertRequiredFields(rawJob);
  const description = stripHtml(rawJob.descriptionHtml ?? "");
  return {
    sourceCode: rawJob.sourceCode,
    sourceJobId: rawJob.sourceJobId,
    sourceUrl: rawJob.sourceUrl.trim(),
    title: rawJob.title.trim(),
    companyName: rawJob.companyName.trim(),
    city: rawJob.city,
    countryCode: rawJob.countryCode,
    currencyCode: rawJob.currencyCode,
    description,
    postedAt: rawJob.postedAt,
    workModeCode: detectWorkMode({ description, flexibleWorkArrangements: rawJob.flexibleWorkArrangements }),
    seniorityCode: detectSeniority({ title: rawJob.title, positionLevels: rawJob.positionLevels }),
    isContractOrTemporary: rawJob.employmentTypes.some((type) => CONTRACT_EMPLOYMENT_PATTERN.test(type)),
    skills: rawJob.skills,
    salaryMinMonthlyMinor: toMonthlyMinor({ amount: rawJob.salaryMin, period: rawJob.salaryPeriod }),
    salaryMaxMonthlyMinor: toMonthlyMinor({ amount: rawJob.salaryMax, period: rawJob.salaryPeriod }),
  };
}
