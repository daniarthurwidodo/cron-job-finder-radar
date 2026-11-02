"use server";

import { revalidatePath } from "next/cache";
import { getServices } from "@/lib/container";

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
