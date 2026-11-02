"use server";

import { revalidatePath } from "next/cache";
import { getServices } from "@/lib/container";
import { logger } from "@/lib/logger";

const HOME_PATH = "/";
const SETTINGS_PATH = "/settings";

export async function changeJobStatus(formData: FormData): Promise<void> {
  const jobId = Number(formData.get("jobId"));
  const statusCode = String(formData.get("statusCode") ?? "");
  getServices().dashboard.changeStatus({ jobId, statusCode });
  revalidatePath(HOME_PATH);
}

export async function saveColBenchmark(formData: FormData): Promise<void> {
  const countryCode = String(formData.get("countryCode") ?? "");
  const monthlyMajor = Number(formData.get("monthlyMajor"));
  getServices().dashboard.updateColBenchmark({ countryCode, monthlyMajor });
  revalidatePath(HOME_PATH);
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
