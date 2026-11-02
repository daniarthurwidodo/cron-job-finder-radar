import {
  COUNTRY_CODES,
  DEFAULT_SORT_KEY,
  FIRST_PAGE,
  ISO_DATE_PATTERN,
  JOB_STATUSES,
  PERCENT_MAX,
  MAX_COMPARE_JOBS,
  SEARCH_MAX_LENGTH,
  SENIORITIES,
  SALARY_FILTER,
  SORT_KEYS,
  WORK_MODES,
} from "@/lib/constants";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export interface JobFilters {
  day?: string;
  countryCode?: string;
  seniorityCode?: string;
  statusCode?: string;
  workModeCode?: string;
  salary?: string;
  minSavingsIdr?: number;
  minStack?: number;
  minPriority?: number;
  search?: string;
  sortKey: string;
  page: number;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  const single = Array.isArray(value) ? value[0] : value;
  const trimmed = single?.trim();
  return trimmed ? trimmed : undefined;
}

function allowedOrUndefined({ value, allowed }: { value: string | undefined; allowed: readonly string[] }): string | undefined {
  return value !== undefined && allowed.includes(value) ? value : undefined;
}

export function parseJobFilters(raw: RawSearchParams): JobFilters {
  const day = firstValue(raw.day);
  return {
    day: day !== undefined && ISO_DATE_PATTERN.test(day) ? day : undefined,
    countryCode: allowedOrUndefined({ value: firstValue(raw.country), allowed: Object.values(COUNTRY_CODES) }),
    seniorityCode: allowedOrUndefined({ value: firstValue(raw.seniority), allowed: Object.values(SENIORITIES) }),
    statusCode: allowedOrUndefined({ value: firstValue(raw.status), allowed: Object.values(JOB_STATUSES) }),
    workModeCode: allowedOrUndefined({ value: firstValue(raw.workMode), allowed: Object.values(WORK_MODES) }),
    salary: allowedOrUndefined({ value: firstValue(raw.salary), allowed: Object.values(SALARY_FILTER) }),
    minSavingsIdr: parseMinimum({ value: firstValue(raw.minSavings) }),
    minStack: parseMinimum({ value: firstValue(raw.minStack), max: PERCENT_MAX }),
    minPriority: parseMinimum({ value: firstValue(raw.minPriority), max: PERCENT_MAX }),
    search: firstValue(raw.q)?.slice(0, SEARCH_MAX_LENGTH),
    sortKey: allowedOrUndefined({ value: firstValue(raw.sort), allowed: Object.values(SORT_KEYS) }) ?? DEFAULT_SORT_KEY,
    page: parsePage(firstValue(raw.page)),
  };
}

function parseMinimum({ value, max }: { value: string | undefined; max?: number }): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(max === undefined ? parsed : Math.min(parsed, max));
}

function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= FIRST_PAGE ? page : FIRST_PAGE;
}

export function buildFilterQuery({ filters, page }: { filters: JobFilters; page: number }): string {
  const params = new URLSearchParams();
  const entries: [string, string | undefined][] = [
    ["q", filters.search],
    ["country", filters.countryCode],
    ["seniority", filters.seniorityCode],
    ["status", filters.statusCode],
    ["workMode", filters.workModeCode],
    ["salary", filters.salary],
    ["minSavings", filters.minSavingsIdr?.toString()],
    ["minStack", filters.minStack?.toString()],
    ["minPriority", filters.minPriority?.toString()],
    ["sort", filters.sortKey],
    ["day", filters.day],
  ];
  for (const [key, value] of entries) if (value) params.set(key, value);
  if (page > FIRST_PAGE) params.set("page", String(page));
  return params.toString();
}

export function parseCompareIds(raw: string | string[] | undefined): number[] {
  const values = Array.isArray(raw) ? raw : raw === undefined ? [] : raw.split(",");
  const ids = values.map((value) => Number(value)).filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)].slice(0, MAX_COMPARE_JOBS);
}
