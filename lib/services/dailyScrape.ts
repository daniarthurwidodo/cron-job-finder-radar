import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { CompanyRepository } from "@/lib/repositories/companyRepository";
import { JobRepository } from "@/lib/repositories/jobRepository";
import { JobSourceRepository } from "@/lib/repositories/jobSourceRepository";
import { ScrapeRunRepository, type ScrapeRunCounts } from "@/lib/repositories/scrapeRunRepository";
import { mycareersfutureScraper } from "@/lib/scrapers/mycareersfuture";
import { IngestService } from "@/lib/services/ingestService";
import type { Scraper } from "@/lib/types";

export interface ScrapeSummary {
  sourceCode: string;
  counts: ScrapeRunCounts;
  errorMessage: string | null;
}

const EMPTY_COUNTS: ScrapeRunCounts = { found: 0, inserted: 0, duplicates: 0, filtered: 0, invalid: 0 };

const SCRAPERS: Scraper[] = [mycareersfutureScraper];

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
  const db = getDb();
  const ingestService = new IngestService({
    companies: new CompanyRepository(db),
    jobs: new JobRepository(db),
    jobSources: new JobSourceRepository(db),
    runInTransaction: (work) => db.transaction(work)(),
  });
  const scrapeRuns = new ScrapeRunRepository(db);
  const summaries: ScrapeSummary[] = [];
  for (const scraper of SCRAPERS) {
    summaries.push(await runScraper({ scraper, ingestService, scrapeRuns }));
  }
  return summaries;
}
