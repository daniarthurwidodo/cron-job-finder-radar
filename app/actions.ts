"use server";

import { revalidatePath } from "next/cache";
import type { FillReport } from "@/lib/apply/fillApplicationForm";
import { DASHBOARD_PATH } from "@/lib/constants";
import { getServices } from "@/lib/container";
import { logger } from "@/lib/logger";
import { runDailyScrape } from "@/lib/services/dailyScrape";

const SETTINGS_PATH = "/settings";
const APPLY_PATH = "/apply";
const EMAIL_JOB_PATH_PREFIX = "/jobs/";

export async function changeJobStatus(formData: FormData): Promise<void> {
  const jobId = Number(formData.get("jobId"));
  const statusCode = String(formData.get("statusCode") ?? "");
  getServices().dashboard.changeStatus({ jobId, statusCode });
  revalidatePath(DASHBOARD_PATH);
}

export async function saveColBenchmark(formData: FormData): Promise<void> {
  const countryCode = String(formData.get("countryCode") ?? "");
  const monthlyMajor = Number(formData.get("monthlyMajor"));
  getServices().dashboard.updateColBenchmark({ countryCode, monthlyMajor });
  revalidatePath(DASHBOARD_PATH);
  revalidatePath(SETTINGS_PATH);
}

export interface GenerateState {
  error?: string;
  generatedAt?: string;
}

export async function generateDocuments(_previous: GenerateState, formData: FormData): Promise<GenerateState> {
  const jobId = Number(formData.get("jobId"));
  try {
    await getServices().documents.generateForJob(jobId);
    revalidatePath(`/jobs/${jobId}`);
    return { generatedAt: new Date().toISOString() };
  } catch (error) {
    logger.error("document generation failed", { jobId, error: String(error) });
    return { error: error instanceof Error ? error.message : "Document generation failed" };
  }
}

export async function saveWorkAuthorization(formData: FormData): Promise<void> {
  const countryCode = String(formData.get("countryCode") ?? "");
  const statement = String(formData.get("statement") ?? "");
  getServices().dashboard.updateWorkAuthorization({ countryCode, statement });
  revalidatePath(SETTINGS_PATH);
}

function readJobId(formData: FormData): number {
  return Number(formData.get("jobId"));
}

export async function queueJobForApply(formData: FormData): Promise<void> {
  getServices().apply.queueJob(readJobId(formData));
  revalidatePath(DASHBOARD_PATH);
  revalidatePath(APPLY_PATH);
}

export async function unqueueJobFromApply(formData: FormData): Promise<void> {
  getServices().apply.unqueueJob(readJobId(formData));
  revalidatePath(DASHBOARD_PATH);
  revalidatePath(APPLY_PATH);
}

export async function skipQueuedJob(formData: FormData): Promise<void> {
  getServices().apply.skipJob(readJobId(formData));
  revalidatePath(APPLY_PATH);
}

export async function confirmJobApplied(formData: FormData): Promise<void> {
  getServices().apply.confirmApplied(readJobId(formData));
  revalidatePath(DASHBOARD_PATH);
  revalidatePath(APPLY_PATH);
}

export interface StartApplyState {
  error?: string;
  report?: FillReport;
}

export async function startApply(_previous: StartApplyState, formData: FormData): Promise<StartApplyState> {
  const jobId = readJobId(formData);
  try {
    const report = await getServices().apply.startApply(jobId);
    revalidatePath(APPLY_PATH);
    return { report };
  } catch (error) {
    logger.error("start apply failed", { jobId, error: String(error) });
    return { error: error instanceof Error ? error.message : "Could not start apply" };
  }
}

export interface SyncEmailsState {
  error?: string;
  message?: string;
}

export async function syncEmailsNow(): Promise<SyncEmailsState> {
  try {
    const result = await getServices().email.syncNow();
    revalidatePath(DASHBOARD_PATH);
    revalidatePath(SETTINGS_PATH);
    return { message: `Fetched ${result.fetched} emails, ${result.matched} new matched to your jobs.` };
  } catch (error) {
    logger.error("email sync failed", { error: String(error) });
    revalidatePath(SETTINGS_PATH);
    return { error: error instanceof Error ? error.message : "Email sync failed" };
  }
}

export interface ScrapeNowState {
  error?: string;
  message?: string;
}

export async function runScrapeNow(): Promise<ScrapeNowState> {
  try {
    const summaries = await runDailyScrape();
    const inserted = summaries.reduce((total, summary) => total + summary.counts.inserted, 0);
    const failedCount = summaries.filter((summary) => summary.errorMessage).length;
    return { message: `${inserted} new job(s) saved, ${failedCount} source(s) with errors.` };
  } catch (error) {
    logger.error("manual scrape failed", { error: String(error) });
    return { error: error instanceof Error ? error.message : "Scrape failed" };
  } finally {
    revalidatePath(DASHBOARD_PATH);
  }
}

export async function disconnectGoogle(): Promise<void> {
  getServices().email.disconnect();
  revalidatePath(SETTINGS_PATH);
  revalidatePath(DASHBOARD_PATH);
}

export async function confirmEmailSuggestion(formData: FormData): Promise<void> {
  getServices().email.confirmSuggestion(Number(formData.get("emailId")));
  revalidatePath(DASHBOARD_PATH);
  revalidatePath(`${EMAIL_JOB_PATH_PREFIX}${Number(formData.get("jobId"))}`);
}

export async function dismissEmailSuggestion(formData: FormData): Promise<void> {
  getServices().email.dismissSuggestion(Number(formData.get("emailId")));
  revalidatePath(DASHBOARD_PATH);
  revalidatePath(`${EMAIL_JOB_PATH_PREFIX}${Number(formData.get("jobId"))}`);
}
