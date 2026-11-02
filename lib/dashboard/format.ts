import { COUNTRY_CODES, JOB_STATUSES, MINOR_UNITS_PER_MAJOR_UNIT, SENIORITIES, SORT_KEYS, SOURCE_CODES, WORK_MODES } from "@/lib/constants";

export const STATUS_LABELS: Record<string, string> = {
  [JOB_STATUSES.DISCOVERED]: "Discovered",
  [JOB_STATUSES.BOOKMARKED]: "Bookmarked",
  [JOB_STATUSES.APPLIED]: "Applied",
  [JOB_STATUSES.INTERVIEWING]: "Interviewing",
  [JOB_STATUSES.OFFER]: "Offer",
  [JOB_STATUSES.REJECTED]: "Rejected",
  [JOB_STATUSES.ARCHIVED]: "Archived",
};

export const WORK_MODE_LABELS: Record<string, string> = {
  [WORK_MODES.FULL_TIME]: "Full-time",
  [WORK_MODES.HYBRID]: "Hybrid",
  [WORK_MODES.FLEXIBLE]: "Flexible",
  [WORK_MODES.ON_SITE]: "On-site",
};

export const COUNTRY_LABELS: Record<string, string> = {
  [COUNTRY_CODES.SINGAPORE]: "Singapore",
  [COUNTRY_CODES.MALAYSIA]: "Malaysia",
  [COUNTRY_CODES.NEW_ZEALAND]: "New Zealand",
};

export const SENIORITY_LABELS: Record<string, string> = {
  [SENIORITIES.ENTRY]: "Entry",
  [SENIORITIES.MID]: "Mid",
  [SENIORITIES.SENIOR]: "Senior",
  [SENIORITIES.LEAD]: "Lead / Staff",
};

export const SORT_LABELS: Record<string, string> = {
  [SORT_KEYS.PRIORITY]: "Priority",
  [SORT_KEYS.SAVINGS]: "Net savings (IDR)",
  [SORT_KEYS.STACK]: "Stack match",
  [SORT_KEYS.NEWEST]: "Newest",
};

export const SOURCE_LABELS: Record<string, string> = {
  [SOURCE_CODES.MYCAREERSFUTURE]: "MyCareersFuture",
  [SOURCE_CODES.MICHAEL_PAGE_SG]: "Michael Page SG",
};

const SALARY_NOT_DISCLOSED = "Salary not disclosed";
const NOT_AVAILABLE = "-";
const RANGE_SEPARATOR = " - ";
const IDR_PREFIX = "Rp ";
const idrFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const majorFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatIdr(amount: number | null): string {
  if (amount === null) return NOT_AVAILABLE;
  return `${amount < 0 ? "-" : ""}${IDR_PREFIX}${idrFormatter.format(Math.abs(amount))}`;
}

export function formatSalaryRange({
  minMinor,
  maxMinor,
  currencyCode,
}: {
  minMinor: number | null;
  maxMinor: number | null;
  currencyCode: string;
}): string {
  if (minMinor === null) return SALARY_NOT_DISCLOSED;
  const min = majorFormatter.format(minMinor / MINOR_UNITS_PER_MAJOR_UNIT);
  if (maxMinor === null || maxMinor === minMinor) return `${currencyCode} ${min} / month`;
  return `${currencyCode} ${min}${RANGE_SEPARATOR}${majorFormatter.format(maxMinor / MINOR_UNITS_PER_MAJOR_UNIT)} / month`;
}

export function labelOf({ labels, code }: { labels: Record<string, string>; code: string }): string {
  return labels[code] ?? code;
}

export function formatMajorFromMinor(minor: number): number {
  return minor / MINOR_UNITS_PER_MAJOR_UNIT;
}

export function pick(labels: Record<string, string>, codes: string[]): Record<string, string> {
  return Object.fromEntries(codes.map((code) => [code, labels[code]]));
}
