import { chromium, type Browser, type Page } from "playwright-core";
import {
  BOT_CHALLENGE_TITLE_PATTERN,
  BROWSER_NAVIGATION_TIMEOUT_MS,
  BROWSER_PATH_ENV_NAME,
  BROWSER_READY_TIMEOUT_MS,
  DEFAULT_BROWSER_PATHS,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_TOO_MANY_REQUESTS,
} from "@/lib/constants";

export class BotChallengeError extends Error {}

const TIMEOUT_ERROR_NAME = "TimeoutError";

export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === TIMEOUT_ERROR_NAME;
}

function resolveBrowserPath(): string {
  const configuredPath = process.env[BROWSER_PATH_ENV_NAME] ?? DEFAULT_BROWSER_PATHS[process.platform];
  if (!configuredPath) {
    throw new Error(`No browser path for platform ${process.platform}; set ${BROWSER_PATH_ENV_NAME}`);
  }
  return configuredPath;
}

export function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// The scrapers never try to get past a bot check: they stop and report it.
async function assertNoBotChallenge({ page, status }: { page: Page; status: number | undefined }): Promise<void> {
  const title = await page.title();
  const isBlockedStatus = status === HTTP_STATUS_FORBIDDEN || status === HTTP_STATUS_TOO_MANY_REQUESTS;
  if (isBlockedStatus || BOT_CHALLENGE_TITLE_PATTERN.test(title)) {
    throw new BotChallengeError(`Bot check at ${page.url()} (status ${status}, title "${title}")`);
  }
}

export async function loadPage({ page, url, readySelector }: { page: Page; url: string; readySelector: string }): Promise<void> {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: BROWSER_NAVIGATION_TIMEOUT_MS });
  await assertNoBotChallenge({ page, status: response?.status() });
  await page.waitForSelector(readySelector, { timeout: BROWSER_READY_TIMEOUT_MS });
}

// tsx/esbuild wraps named functions in a `__name` helper that does not exist inside the browser page.
const NAME_HELPER_SHIM = "window.__name = (target) => target;";

export async function withBrowserPage<T>(work: (page: Page) => Promise<T>): Promise<T> {
  const browser: Browser = await chromium.launch({ executablePath: resolveBrowserPath(), headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(NAME_HELPER_SHIM);
    return await work(page);
  } finally {
    await browser.close();
  }
}
