import fs from "node:fs";
import type { Locator, Page } from "playwright-core";
import { logger } from "@/lib/logger";
import { APPLY_ACTION_TIMEOUT_MS, APPLY_LINK_PATTERN, APPLY_PAGE_SETTLE_MS } from "@/lib/constants";

export interface ApplyProfile {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedIn: string;
  coverLetter: string;
  cvPdfPath: string;
}

export interface FillReport {
  openedUrl: string;
  clickedApplyLink: boolean;
  loginRequired: boolean;
  filled: string[];
  uploadedCv: boolean;
  notes: string[];
}

interface FieldRule {
  name: string;
  pattern: RegExp;
  valueOf: (profile: ApplyProfile) => string;
}

const FIELD_RULES: FieldRule[] = [
  { name: "first name", pattern: /first\s*name|given\s*name/i, valueOf: (profile) => profile.firstName },
  { name: "last name", pattern: /last\s*name|surname|family\s*name/i, valueOf: (profile) => profile.lastName },
  { name: "full name", pattern: /^\s*(full\s*)?name\s*\*?\s*$/i, valueOf: (profile) => profile.fullName },
  { name: "email", pattern: /e-?mail/i, valueOf: (profile) => profile.email },
  { name: "phone", pattern: /phone|mobile|contact\s*number/i, valueOf: (profile) => profile.phone },
  { name: "linkedin", pattern: /linkedin/i, valueOf: (profile) => profile.linkedIn },
  { name: "cover letter", pattern: /cover\s*letter|message|why/i, valueOf: (profile) => profile.coverLetter },
];

const PASSWORD_SELECTOR = "input[type=password]";
const FILE_SELECTOR = "input[type=file]";
const FORM_FIELD_SELECTOR = "input[type=email], input[type=tel], input[type=text], textarea";

async function isVisible(locator: Locator): Promise<boolean> {
  return (await locator.count()) > 0 && (await locator.first().isVisible());
}

async function hasLoginForm(page: Page): Promise<boolean> {
  return isVisible(page.locator(PASSWORD_SELECTOR));
}

async function hasApplicationForm(page: Page): Promise<boolean> {
  return isVisible(page.locator(FORM_FIELD_SELECTOR));
}

async function clickApplyLink(page: Page): Promise<boolean> {
  for (const role of ["link", "button"] as const) {
    const candidate = page.getByRole(role, { name: APPLY_LINK_PATTERN }).first();
    if (await isVisible(candidate)) {
      await candidate.click({ timeout: APPLY_ACTION_TIMEOUT_MS });
      await page.waitForTimeout(APPLY_PAGE_SETTLE_MS);
      return true;
    }
  }
  return false;
}

async function fillEmptyField({ page, rule, profile }: { page: Page; rule: FieldRule; profile: ApplyProfile }): Promise<boolean> {
  const value = rule.valueOf(profile);
  if (!value) return false;
  const field = page.getByLabel(rule.pattern).or(page.getByPlaceholder(rule.pattern)).first();
  if (!(await isVisible(field)) || !(await field.isEnabled()) || (await field.inputValue()) !== "") return false;
  await field.fill(value, { timeout: APPLY_ACTION_TIMEOUT_MS });
  return true;
}

async function uploadCv({ page, profile }: { page: Page; profile: ApplyProfile }): Promise<boolean> {
  const fileInput = page.locator(FILE_SELECTOR).first();
  if ((await fileInput.count()) === 0 || !fs.existsSync(profile.cvPdfPath)) return false;
  try {
    await fileInput.setInputFiles(profile.cvPdfPath, { timeout: APPLY_ACTION_TIMEOUT_MS });
    return true;
  } catch (error) {
    logger.error("cv upload failed", { error: String(error) });
    return false;
  }
}

// Fills what it can and stops. It never clicks submit/send and never touches password fields.
export async function fillApplicationForm({ page, profile }: { page: Page; profile: ApplyProfile }): Promise<FillReport> {
  const report: FillReport = { openedUrl: page.url(), clickedApplyLink: false, loginRequired: false, filled: [], uploadedCv: false, notes: [] };
  if (!(await hasApplicationForm(page)) && !(await hasLoginForm(page))) report.clickedApplyLink = await clickApplyLink(page);
  if (await hasLoginForm(page)) {
    report.loginRequired = true;
    report.notes.push("A login form is shown. Sign in yourself; nothing was filled.");
    return report;
  }
  for (const rule of FIELD_RULES) {
    if (await fillEmptyField({ page, rule, profile })) report.filled.push(rule.name);
  }
  report.uploadedCv = await uploadCv({ page, profile });
  if (report.filled.length === 0 && !report.uploadedCv) report.notes.push("No application form fields were found on this page.");
  report.notes.push("Review everything, then submit yourself. The app never submits.");
  return report;
}
