import {
  COUNTRY_CODES,
  COUNTRY_CURRENCIES,
  COUNTRY_PRIMARY_CITIES,
  MCF_API_URL,
  MCF_MAX_PAGES_PER_KEYWORD,
  MCF_PAGE_SIZE,
  MCF_REQUEST_DELAY_MS,
  MCF_REQUEST_TIMEOUT_MS,
  MCF_SALARY_TYPE_PERIODS,
  MCF_SEARCH_KEYWORDS,
  SOURCE_CODES,
} from "@/lib/constants";
import type { RawJob, Scraper, SalaryPeriod } from "@/lib/types";

interface McfJob {
  uuid: string;
  title: string;
  description?: string;
  skills?: { skill: string }[];
  employmentTypes?: { employmentType: string }[];
  positionLevels?: { position: string }[];
  flexibleWorkArrangements?: unknown[];
  postedCompany?: { name?: string };
  salary?: { minimum?: number; maximum?: number; type?: { salaryType?: string } };
  metadata?: { jobDetailsUrl?: string; newPostingDate?: string };
}

interface McfResponse {
  results: McfJob[];
}

function toSalaryPeriod(salaryType: string | undefined): SalaryPeriod | null {
  if (!salaryType) return null;
  return (MCF_SALARY_TYPE_PERIODS as Record<string, SalaryPeriod>)[salaryType] ?? null;
}

export function mapMcfJob(job: McfJob): RawJob {
  return {
    sourceCode: SOURCE_CODES.MYCAREERSFUTURE,
    sourceJobId: job.uuid,
    sourceUrl: job.metadata?.jobDetailsUrl ?? "",
    title: job.title,
    companyName: job.postedCompany?.name ?? "",
    city: COUNTRY_PRIMARY_CITIES[COUNTRY_CODES.SINGAPORE],
    countryCode: COUNTRY_CODES.SINGAPORE,
    currencyCode: COUNTRY_CURRENCIES[COUNTRY_CODES.SINGAPORE],
    descriptionHtml: job.description ?? "",
    postedAt: job.metadata?.newPostingDate ?? null,
    employmentTypes: (job.employmentTypes ?? []).map((type) => type.employmentType),
    positionLevels: (job.positionLevels ?? []).map((level) => level.position),
    flexibleWorkArrangements: (job.flexibleWorkArrangements ?? []).map(String),
    skills: (job.skills ?? []).map((skill) => skill.skill),
    salaryMin: job.salary?.minimum ?? null,
    salaryMax: job.salary?.maximum ?? null,
    salaryPeriod: toSalaryPeriod(job.salary?.type?.salaryType),
  };
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchPage({ keyword, page }: { keyword: string; page: number }): Promise<McfJob[]> {
  const url = new URL(MCF_API_URL);
  url.searchParams.set("search", keyword);
  url.searchParams.set("limit", String(MCF_PAGE_SIZE));
  url.searchParams.set("page", String(page));
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(MCF_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`MyCareersFuture HTTP ${response.status} for "${keyword}" page ${page}`);
  const body = (await response.json()) as McfResponse;
  if (!Array.isArray(body.results)) throw new Error(`MyCareersFuture bad response for "${keyword}" page ${page}`);
  return body.results;
}

async function fetchKeyword(keyword: string): Promise<McfJob[]> {
  const collected: McfJob[] = [];
  for (let page = 0; page < MCF_MAX_PAGES_PER_KEYWORD; page += 1) {
    const results = await fetchPage({ keyword, page });
    collected.push(...results);
    await wait(MCF_REQUEST_DELAY_MS);
    if (results.length < MCF_PAGE_SIZE) break;
  }
  return collected;
}

async function fetchJobs(): Promise<RawJob[]> {
  const jobsByUuid = new Map<string, McfJob>();
  for (const keyword of MCF_SEARCH_KEYWORDS) {
    for (const job of await fetchKeyword(keyword)) jobsByUuid.set(job.uuid, job);
  }
  return [...jobsByUuid.values()].map(mapMcfJob);
}

export const mycareersfutureScraper: Scraper = {
  sourceCode: SOURCE_CODES.MYCAREERSFUTURE,
  fetchJobs,
};
