import type { Page } from "playwright-core";
import {
  BROWSER_PAGE_DELAY_MS,
  COUNTRY_CODES,
  COUNTRY_CURRENCIES,
  COUNTRY_PRIMARY_CITIES,
  SEEK_BASE_URLS,
  SEEK_CARD_SELECTOR,
  SEEK_MAX_PAGES,
  SEEK_SPONSORSHIP_TERM,
  TARGET_ROLE_SEARCH_KEYWORDS,
  SEEK_UNDISCLOSED_COMPANY,
  SOURCE_CODES,
} from "@/lib/constants";
import { isTimeoutError, loadPage, wait, withBrowserPage } from "@/lib/scrapers/browser";
import { parseSalaryText } from "@/lib/services/salaryText";
import type { RawJob, Scraper } from "@/lib/types";

export interface SeekRegion {
  sourceCode: string;
  baseUrl: string;
  countryCode: string;
}

export const SEEK_NZ_REGION: SeekRegion = {
  sourceCode: SOURCE_CODES.SEEK_NZ,
  baseUrl: SEEK_BASE_URLS[SOURCE_CODES.SEEK_NZ],
  countryCode: COUNTRY_CODES.NEW_ZEALAND,
};
export const SEEK_AU_REGION: SeekRegion = {
  sourceCode: SOURCE_CODES.SEEK_AU,
  baseUrl: SEEK_BASE_URLS[SOURCE_CODES.SEEK_AU],
  countryCode: COUNTRY_CODES.AUSTRALIA,
};

// Seek matches the search words against the whole ad, so adding the term keeps mostly ads that mention sponsorship.
const SPONSORSHIP_KEYWORDS = TARGET_ROLE_SEARCH_KEYWORDS.map((keyword) => `${keyword} ${SEEK_SPONSORSHIP_TERM}`);
const WORK_TYPE_PATTERN = /^This is an? (.+) job$/i;

export interface SeekCard {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryText: string;
  workTypeText: string;
  summary: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function mapSeekCard({ card, region }: { card: SeekCard; region: SeekRegion }): RawJob {
  const parsedSalary = parseSalaryText(card.salaryText);
  // Hourly or daily pay has no monthly/annual period, so it cannot be converted and is treated as undisclosed.
  const salary = parsedSalary?.period ? parsedSalary : null;
  const workType = WORK_TYPE_PATTERN.exec(card.workTypeText)?.[1];
  return {
    sourceCode: region.sourceCode,
    sourceJobId: card.id,
    sourceUrl: `${region.baseUrl}/job/${card.id}`,
    title: card.title,
    companyName: card.company || SEEK_UNDISCLOSED_COMPANY,
    city: card.location || COUNTRY_PRIMARY_CITIES[region.countryCode as keyof typeof COUNTRY_PRIMARY_CITIES],
    countryCode: region.countryCode,
    currencyCode: COUNTRY_CURRENCIES[region.countryCode as keyof typeof COUNTRY_CURRENCIES],
    descriptionHtml: `<p>${escapeHtml(card.summary)}</p>`,
    postedAt: null,
    employmentTypes: workType ? [workType] : [],
    positionLevels: [],
    flexibleWorkArrangements: [],
    skills: [],
    salaryMin: salary?.min ?? null,
    salaryMax: salary?.max ?? null,
    salaryPeriod: salary?.period ?? null,
  };
}

async function extractCards(page: Page): Promise<SeekCard[]> {
  return page.$$eval(SEEK_CARD_SELECTOR, (cards) => {
    const textOf = (card: Element, selector: string): string => (card.querySelector(selector)?.textContent ?? "").replace(/\s+/g, " ").trim();
    return cards.map((card) => ({
      id: card.getAttribute("data-job-id") ?? "",
      title: textOf(card, '[data-automation="jobTitle"]'),
      company: textOf(card, '[data-automation="jobCompany"]'),
      location: textOf(card, '[data-automation="jobLocation"]'),
      salaryText: textOf(card, '[data-automation="jobSalary"]'),
      workTypeText: [...card.querySelectorAll("p")].map((paragraph) => (paragraph.textContent ?? "").trim()).find((text) => /^This is an? .+ job$/i.test(text)) ?? "",
      summary: textOf(card, '[data-automation="jobShortDescription"]'),
    }));
  });
}

function buildSearchUrl({ region, keyword, pageIndex }: { region: SeekRegion; keyword: string; pageIndex: number }): string {
  const slug = keyword.trim().replace(/\s+/g, "-");
  return `${region.baseUrl}/${slug}-jobs?page=${pageIndex}`;
}

// A search with no results (or a missing page) has no cards, so the ready-selector wait times out: that ends the keyword, not the run.
async function loadResultsPage({ page, url }: { page: Page; url: string }): Promise<boolean> {
  try {
    await loadPage({ page, url, readySelector: SEEK_CARD_SELECTOR });
    return true;
  } catch (error) {
    if (isTimeoutError(error)) return false;
    throw error;
  }
}

async function collectKeywordCards({ page, region, keyword }: { page: Page; region: SeekRegion; keyword: string }): Promise<SeekCard[]> {
  const cards: SeekCard[] = [];
  for (let pageIndex = 1; pageIndex <= SEEK_MAX_PAGES; pageIndex += 1) {
    if (!(await loadResultsPage({ page, url: buildSearchUrl({ region, keyword, pageIndex }) }))) break;
    cards.push(...(await extractCards(page)));
    await wait(BROWSER_PAGE_DELAY_MS);
  }
  return cards;
}

async function fetchRegionJobs(region: SeekRegion): Promise<RawJob[]> {
  return withBrowserPage(async (page) => {
    const cardsById = new Map<string, SeekCard>();
    for (const keyword of SPONSORSHIP_KEYWORDS) {
      for (const card of await collectKeywordCards({ page, region, keyword })) {
        if (card.id && card.title) cardsById.set(card.id, card);
      }
    }
    if (cardsById.size === 0) throw new Error(`No job cards found on ${region.baseUrl}; the page layout may have changed`);
    return [...cardsById.values()].map((card) => mapSeekCard({ card, region }));
  });
}

export function createSeekScraper(region: SeekRegion): Scraper {
  return { sourceCode: region.sourceCode, fetchJobs: () => fetchRegionJobs(region) };
}

export const seekNzScraper = createSeekScraper(SEEK_NZ_REGION);
export const seekAuScraper = createSeekScraper(SEEK_AU_REGION);
