import type { Page } from "playwright-core";
import {
  BROWSER_PAGE_DELAY_MS,
  COUNTRY_CODES,
  COUNTRY_CURRENCIES,
  COUNTRY_PRIMARY_CITIES,
  MICHAEL_PAGE_BASE_URL,
  MICHAEL_PAGE_CLIENT_COMPANY,
  MICHAEL_PAGE_MAX_PAGES,
  MICHAEL_PAGE_SG_LIST_URL,
  SOURCE_CODES,
} from "@/lib/constants";
import { isTimeoutError, loadPage, wait, withBrowserPage } from "@/lib/scrapers/browser";
import { parseSalaryText } from "@/lib/services/salaryText";
import type { RawJob, Scraper } from "@/lib/types";

const JOB_TILE_SELECTOR = ".job-tile";
const JOB_ID_PATTERN = /\/ref\/([^/?#]+)/;

export interface MichaelPageTile {
  href: string;
  title: string;
  location: string;
  contractType: string;
  salaryText: string;
  summary: string;
  bullets: string[];
}

export function mapMichaelPageTile(tile: MichaelPageTile): RawJob {
  const salary = parseSalaryText(tile.salaryText);
  const bulletsHtml = tile.bullets.map((bullet) => `<li>${bullet}</li>`).join("");
  return {
    sourceCode: SOURCE_CODES.MICHAEL_PAGE_SG,
    sourceJobId: JOB_ID_PATTERN.exec(tile.href)?.[1] ?? tile.href,
    sourceUrl: new URL(tile.href, MICHAEL_PAGE_BASE_URL).toString(),
    title: tile.title,
    companyName: MICHAEL_PAGE_CLIENT_COMPANY,
    city: COUNTRY_PRIMARY_CITIES[COUNTRY_CODES.SINGAPORE],
    countryCode: COUNTRY_CODES.SINGAPORE,
    currencyCode: COUNTRY_CURRENCIES[COUNTRY_CODES.SINGAPORE],
    descriptionHtml: `<p>${tile.summary}</p><ul>${bulletsHtml}</ul>`,
    postedAt: null,
    employmentTypes: tile.contractType ? [tile.contractType] : [],
    positionLevels: [],
    flexibleWorkArrangements: [],
    skills: [],
    salaryMin: salary?.min ?? null,
    salaryMax: salary?.max ?? null,
    salaryPeriod: salary?.period ?? null,
  };
}

async function extractTiles(page: Page): Promise<MichaelPageTile[]> {
  return page.$$eval(JOB_TILE_SELECTOR, (tiles) => {
    const textOf = (tile: Element, selector: string): string =>
      (tile.querySelector(selector)?.textContent ?? "").replace(/\s+/g, " ").trim();
    return tiles.map((tile) => ({
      href: tile.querySelector(".job-title a")?.getAttribute("href") ?? "",
      title: textOf(tile, ".job-title a"),
      location: textOf(tile, ".job-location"),
      contractType: textOf(tile, ".job-contract-type"),
      salaryText: textOf(tile, ".job-salary"),
      summary: textOf(tile, ".job-summary"),
      bullets: [...tile.querySelectorAll(".bullet_points li")].map((item) => (item.textContent ?? "").trim()),
    }));
  });
}

async function loadListPage({ page, pageIndex }: { page: Page; pageIndex: number }): Promise<boolean> {
  try {
    await loadPage({ page, url: `${MICHAEL_PAGE_SG_LIST_URL}?page=${pageIndex}`, readySelector: JOB_TILE_SELECTOR });
    return true;
  } catch (error) {
    if (pageIndex > 0 && isTimeoutError(error)) return false;
    throw error;
  }
}

async function fetchJobs(): Promise<RawJob[]> {
  return withBrowserPage(async (page) => {
    const tilesByHref = new Map<string, MichaelPageTile>();
    for (let pageIndex = 0; pageIndex < MICHAEL_PAGE_MAX_PAGES; pageIndex += 1) {
      if (!(await loadListPage({ page, pageIndex }))) break;
      const tiles = (await extractTiles(page)).filter((tile) => tile.href && tile.title);
      const newTiles = tiles.filter((tile) => !tilesByHref.has(tile.href));
      if (newTiles.length === 0) break;
      for (const tile of newTiles) tilesByHref.set(tile.href, tile);
      await wait(BROWSER_PAGE_DELAY_MS);
    }
    return [...tilesByHref.values()].map(mapMichaelPageTile);
  });
}

export const michaelPageScraper: Scraper = {
  sourceCode: SOURCE_CODES.MICHAEL_PAGE_SG,
  fetchJobs,
};
