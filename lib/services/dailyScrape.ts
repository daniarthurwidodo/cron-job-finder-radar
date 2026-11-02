import { getServices } from "@/lib/container";
import { logger } from "@/lib/logger";
import type { IngestService } from "@/lib/services/ingestService";
import type { ScrapeRunCounts, ScrapeRunRepository } from "@/lib/repositories/scrapeRunRepository";
import { michaelPageScraper } from "@/lib/scrapers/michaelpage";
import { mycareersfutureScraper } from "@/lib/scrapers/mycareersfuture";
import type { Scraper } from "@/lib/types";

export interface ScrapeSummary {
  sourceCode: string;
  counts: ScrapeRunCounts;
  errorMessage: string | null;
}

const EMPTY_COUNTS: ScrapeRunCounts = { found: 0, inserted: 0, duplicates: 0, filtered: 0, invalid: 0 };

const SCRAPERS: Scraper[] = [mycareersfutureScraper, michaelPageScraper];

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

export async function runDailyScrape(): Promise<ScrapeSummary[]> {
  const { ingest, scrapeRuns, financials, exchangeRateService } = getServices();
  await exchangeRateService.refresh();
  const summaries: ScrapeSummary[] = [];
  for (const scraper of SCRAPERS) {
    summaries.push(await runScraper({ scraper, ingestService: ingest, scrapeRuns }));
  }
  financials.recalculateAll();
  return summaries;
}
