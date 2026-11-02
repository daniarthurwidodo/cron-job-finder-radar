import { chromium, type Browser } from "playwright-core";
import { fillApplicationForm, type ApplyProfile, type FillReport } from "@/lib/apply/fillApplicationForm";
import { BROWSER_NAVIGATION_TIMEOUT_MS, BROWSER_PATH_ENV_NAME, DEFAULT_BROWSER_PATHS } from "@/lib/constants";
import { logger } from "@/lib/logger";

export interface ApplyWindowRequest {
  url: string;
  profile: ApplyProfile;
  shouldFill: boolean;
}

export type OpenApplyWindow = (request: ApplyWindowRequest) => Promise<FillReport>;

const openBrowsers = new Set<Browser>();
const LINUX_PLATFORM = "linux";

function assertDisplayAvailable(): void {
  if (process.platform === LINUX_PLATFORM && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    throw new Error("No display session for a visible browser. Run the app from your desktop session, or import DISPLAY/WAYLAND_DISPLAY into the systemd user environment.");
  }
}

// The window stays open for the user; the app never closes it and never submits.
export const openApplyWindow: OpenApplyWindow = async ({ url, profile, shouldFill }) => {
  assertDisplayAvailable();
  const executablePath = process.env[BROWSER_PATH_ENV_NAME] ?? DEFAULT_BROWSER_PATHS[process.platform];
  const browser = await chromium.launch({ executablePath, headless: false });
  openBrowsers.add(browser);
  browser.on("disconnected", () => openBrowsers.delete(browser));
  const page = await (await browser.newContext({ viewport: null })).newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: BROWSER_NAVIGATION_TIMEOUT_MS });
  } catch (error) {
    logger.error("apply page did not finish loading", { url, error: String(error) });
    return { openedUrl: url, clickedApplyLink: false, loginRequired: false, filled: [], uploadedCv: false, notes: ["The page did not load fully. Continue in the window."] };
  }
  if (!shouldFill) {
    return { openedUrl: url, clickedApplyLink: false, loginRequired: false, filled: [], uploadedCv: false, notes: ["Opened only. This site is not pre-filled (login or unsupported form)."] };
  }
  return fillApplicationForm({ page, profile });
};
