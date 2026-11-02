import type { Page } from "playwright-core";
import {
  BROWSER_NAVIGATION_TIMEOUT_MS,
  BROWSER_PAGE_DELAY_MS,
  COUNTRY_CURRENCIES,
  COUNTRY_PRIMARY_CITIES,
  LINKEDIN_BASE_URL,
  LINKEDIN_CARD_SELECTOR,
  LINKEDIN_CHECKPOINT_PATH_PATTERN,
  LINKEDIN_DESCRIPTION_SELECTOR,
  LINKEDIN_EMAIL_ENV_NAME,
  LINKEDIN_FEED_URL,
  LINKEDIN_LOCATIONS,
  LINKEDIN_LOGIN_TIMEOUT_MS,
  LINKEDIN_LOGIN_URL,
  LINKEDIN_MAX_DETAIL_JOBS,
  LINKEDIN_PASSWORD_ENV_NAME,
  LINKEDIN_RECENT_SECONDS,
  LINKEDIN_SCROLL_DELAY_MS,
  LINKEDIN_SESSION_FILE_MODE,
  LINKEDIN_SESSION_PATH,
  LINKEDIN_UNKNOWN_COMPANY,
  SOURCE_CODES,
  TARGET_ROLE_SEARCH_KEYWORDS,
} from "@/lib/constants";
import { BotChallengeError, isTimeoutError, loadPage, wait, withBrowserSession } from "@/lib/scrapers/browser";
import { isTargetRole } from "@/lib/services/jobFilter";
import type { RawJob, Scraper } from "@/lib/types";

type LinkedInLocation = (typeof LINKEDIN_LOCATIONS)[number];

export interface LinkedInCard {
  id: string;
  title: string;
  company: string;
  location: string;
}

interface LinkedInCredentials {
  email: string;
  password: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function mapLinkedInCard({ card, location, description }: { card: LinkedInCard; location: LinkedInLocation; description: string }): RawJob {
  const { countryCode } = location;
  return {
    sourceCode: SOURCE_CODES.LINKEDIN,
    sourceJobId: card.id,
    sourceUrl: `${LINKEDIN_BASE_URL}/jobs/view/${card.id}/`,
    title: card.title,
    companyName: card.company || LINKEDIN_UNKNOWN_COMPANY,
    city: card.location || COUNTRY_PRIMARY_CITIES[countryCode],
    countryCode,
    currencyCode: COUNTRY_CURRENCIES[countryCode],
    descriptionHtml: `<p>${escapeHtml(description)}</p>`,
    postedAt: null,
    employmentTypes: [],
    positionLevels: [],
    flexibleWorkArrangements: [],
    skills: [],
    salaryMin: null,
    salaryMax: null,
    salaryPeriod: null,
  };
}

export function readCredentials(env: Record<string, string | undefined>): LinkedInCredentials {
  const email = env[LINKEDIN_EMAIL_ENV_NAME];
  const password = env[LINKEDIN_PASSWORD_ENV_NAME];
  if (!email || !password) throw new Error(`Set ${LINKEDIN_EMAIL_ENV_NAME} and ${LINKEDIN_PASSWORD_ENV_NAME} in .env`);
  return { email, password };
}

function assertNoCheckpoint(page: Page): void {
  if (LINKEDIN_CHECKPOINT_PATH_PATTERN.test(new URL(page.url()).pathname)) {
    throw new BotChallengeError(`LinkedIn security checkpoint at ${page.url()}; sign in once in a normal browser, then retry`);
  }
}

async function submitLogin({ page, credentials }: { page: Page; credentials: LinkedInCredentials }): Promise<void> {
  await page.goto(LINKEDIN_LOGIN_URL, { waitUntil: "domcontentloaded", timeout: BROWSER_NAVIGATION_TIMEOUT_MS });
  await page.fill("#username", credentials.email);
  await page.fill("#password", credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: LINKEDIN_LOGIN_TIMEOUT_MS }).catch((error: unknown) => {
    if (isTimeoutError(error)) throw new Error("LinkedIn rejected the login (check LINKEDIN_EMAIL and LINKEDIN_PASSWORD)");
    throw error;
  });
  assertNoCheckpoint(page);
}

// The saved session is tried first; credentials are only used when it has expired.
async function ensureLoggedIn({ page, credentials }: { page: Page; credentials: LinkedInCredentials }): Promise<void> {
  await page.goto(LINKEDIN_FEED_URL, { waitUntil: "domcontentloaded", timeout: BROWSER_NAVIGATION_TIMEOUT_MS });
  assertNoCheckpoint(page);
  if (new URL(page.url()).pathname.startsWith("/feed")) return;
  await submitLogin({ page, credentials });
}

function buildSearchUrl({ keyword, location }: { keyword: string; location: LinkedInLocation }): string {
  const params = new URLSearchParams({ keywords: keyword, location: location.location, f_TPR: `r${LINKEDIN_RECENT_SECONDS}` });
  return `${LINKEDIN_BASE_URL}/jobs/search/?${params.toString()}`;
}

// The results list renders cards lazily, so every card is scrolled into view before reading.
async function extractCards(page: Page): Promise<LinkedInCard[]> {
  await page.$$eval(
    LINKEDIN_CARD_SELECTOR,
    async (cards, delayMs) => {
      for (const card of cards) {
        card.scrollIntoView();
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    },
    LINKEDIN_SCROLL_DELAY_MS,
  );
  return page.$$eval(LINKEDIN_CARD_SELECTOR, (cards) => {
    const textOf = (card: Element, selector: string): string => (card.querySelector(selector)?.textContent ?? "").replace(/\s+/g, " ").trim();
    return cards.map((card) => ({
      id: card.getAttribute("data-occludable-job-id") ?? "",
      title: textOf(card, ".job-card-list__title--link strong") || textOf(card, ".job-card-list__title--link"),
      company: textOf(card, ".artdeco-entity-lockup__subtitle"),
      location: textOf(card, ".artdeco-entity-lockup__caption"),
    }));
  });
}

async function searchCards({ page, keyword, location }: { page: Page; keyword: string; location: LinkedInLocation }): Promise<LinkedInCard[]> {
  try {
    await loadPage({ page, url: buildSearchUrl({ keyword, location }), readySelector: LINKEDIN_CARD_SELECTOR });
  } catch (error) {
    if (isTimeoutError(error)) return [];
    throw error;
  }
  const cards = await extractCards(page);
  await wait(BROWSER_PAGE_DELAY_MS);
  return cards;
}

async function readDescription({ page, id }: { page: Page; id: string }): Promise<string> {
  try {
    await loadPage({ page, url: `${LINKEDIN_BASE_URL}/jobs/view/${id}/`, readySelector: LINKEDIN_DESCRIPTION_SELECTOR });
    const text = await page.$eval(LINKEDIN_DESCRIPTION_SELECTOR, (element) => element.textContent ?? "");
    await wait(BROWSER_PAGE_DELAY_MS);
    return text.replace(/\s+/g, " ").trim();
  } catch (error) {
    if (isTimeoutError(error)) return "";
    throw error;
  }
}

async function collectCards(page: Page): Promise<Map<string, { card: LinkedInCard; location: LinkedInLocation }>> {
  const found = new Map<string, { card: LinkedInCard; location: LinkedInLocation }>();
  for (const location of LINKEDIN_LOCATIONS) {
    for (const keyword of TARGET_ROLE_SEARCH_KEYWORDS) {
      for (const card of await searchCards({ page, keyword, location })) {
        if (card.id && card.title) found.set(card.id, { card, location });
      }
    }
  }
  return found;
}

async function fetchJobs(): Promise<RawJob[]> {
  const credentials = readCredentials(process.env);
  return withBrowserSession({
    sessionPath: LINKEDIN_SESSION_PATH,
    fileMode: LINKEDIN_SESSION_FILE_MODE,
    work: async (page) => {
      await ensureLoggedIn({ page, credentials });
      const found = await collectCards(page);
      if (found.size === 0) throw new Error("No LinkedIn job cards found; the page layout may have changed");
      const jobs: RawJob[] = [];
      let detailCount = 0;
      for (const { card, location } of found.values()) {
        const shouldReadDetail = isTargetRole(card.title) && detailCount < LINKEDIN_MAX_DETAIL_JOBS;
        if (shouldReadDetail) detailCount += 1;
        const description = shouldReadDetail ? await readDescription({ page, id: card.id }) : "";
        jobs.push(mapLinkedInCard({ card, location, description }));
      }
      return jobs;
    },
  });
}

export const linkedinScraper: Scraper = { sourceCode: SOURCE_CODES.LINKEDIN, fetchJobs };
