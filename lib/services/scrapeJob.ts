import { logger } from "@/lib/logger";
import { runDailyScrape } from "@/lib/services/dailyScrape";

export interface ScrapeJob {
  isRunning: () => boolean;
  start: (sourceCodes: string[]) => boolean;
}

// Starts a scrape without waiting for it and refuses a second one while it runs. start() returns false when one is already running.
export function createScrapeJob(run: (sourceCodes: string[]) => Promise<unknown>): ScrapeJob {
  let isRunning = false;
  return {
    isRunning: () => isRunning,
    start: (sourceCodes) => {
      if (isRunning) return false;
      isRunning = true;
      run(sourceCodes)
        .catch((error: unknown) => logger.error("background scrape failed", { error: String(error) }))
        .finally(() => {
          isRunning = false;
        });
      return true;
    },
  };
}

// Server actions and pages are bundled separately in Next, so the one job lives on globalThis.
const globalScope = globalThis as { __scrapeJob?: ScrapeJob };

export function getScrapeJob(): ScrapeJob {
  globalScope.__scrapeJob ??= createScrapeJob(runDailyScrape);
  return globalScope.__scrapeJob;
}
