import { getServices } from "@/lib/container";
import { logger } from "@/lib/logger";
import type { IngestService } from "@/lib/services/ingestService";
import type { ScrapeRunCounts, ScrapeRunRepository } from "@/lib/repositories/scrapeRunRepository";
import { linkedinScraper } from "@/lib/scrapers/linkedin";
import { michaelPageScraper } from "@/lib/scrapers/michaelpage";
import { seekAuScraper, seekNzScraper } from "@/lib/scrapers/seek";
import type { Scraper } from "@/lib/types";

export interface ScrapeSummary {
  sourceCode: string;
  counts: ScrapeRunCounts;
  errorMessage: string | null;
}

const EMPTY_COUNTS: ScrapeRunCounts = { found: 0, inserted: 0, duplicates: 0, filtered: 0, invalid: 0 };

// MyCareersFuture is switched off: its scraper needs a Singpass login. Re-add mycareersfutureScraper here to enable it again.
const SCRAPERS: Scraper[] = [michaelPageScraper, seekNzScraper, seekAuScraper, linkedinScraper];

export const SCRAPER_SOURCE_CODES = SCRAPERS.map((scraper) => scraper.sourceCode);

export async function runScraper({
  scraper,
  ingestService,
  scrapeRuns,
}: {
  scraper: Scraper;
  ingestService: IngestService;
  scrapeRuns: ScrapeRunRepository;
}): Promise<ScrapeSummary> {
  const runId = scrapeRuns.start(scraper.sourceCode);
  let counts = EMPTY_COUNTS;
  let errorMessage: string | null = null;
  try {
    counts = ingestService.ingest(await scraper.fetchJobs());
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("scraper failed", { sourceCode: scraper.sourceCode, error: errorMessage });
  }
  scrapeRuns.finish({ id: runId, counts, errorMessage });
  logger.info("scrape finished", { sourceCode: scraper.sourceCode, ...counts, errorMessage });
  return { sourceCode: scraper.sourceCode, counts, errorMessage };
}

export function selectScrapers({ scrapers, sourceCodes }: { scrapers: Scraper[]; sourceCodes?: string[] }): Scraper[] {
  if (sourceCodes === undefined) return scrapers;
  const selected = scrapers.filter((scraper) => sourceCodes.includes(scraper.sourceCode));
  if (selected.length === 0) throw new Error("Select at least one known source");
  return selected;
}

export async function runDailyScrape(sourceCodes?: string[]): Promise<ScrapeSummary[]> {
  const { ingest, scrapeRuns, financials, exchangeRateService, email } = getServices();
  await exchangeRateService.refresh();
  const summaries: ScrapeSummary[] = [];
  for (const scraper of selectScrapers({ scrapers: SCRAPERS, sourceCodes })) {
    summaries.push(await runScraper({ scraper, ingestService: ingest, scrapeRuns }));
  }
  financials.recalculateAll();
  await email.syncIfConnected();
  return summaries;
}
