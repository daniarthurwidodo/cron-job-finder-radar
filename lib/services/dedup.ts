import { createHash } from "node:crypto";
import { TRACKING_QUERY_PARAMS_PATTERN } from "@/lib/constants";

const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]+/g;
const DEDUP_KEY_SEPARATOR = "|";
const TRAILING_SLASH_PATTERN = /\/+$/;

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(NON_ALPHANUMERIC_PATTERN, " ").trim();
}

export function buildDedupHash({ companyName, title, city }: { companyName: string; title: string; city: string }): string {
  const key = [companyName, title, city].map(normalizeText).join(DEDUP_KEY_SEPARATOR);
  return createHash("sha256").update(key).digest("hex");
}

export function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  const trackingParams = [...url.searchParams.keys()].filter((key) => TRACKING_QUERY_PARAMS_PATTERN.test(key));
  for (const key of trackingParams) url.searchParams.delete(key);
  url.hash = "";
  url.pathname = url.pathname.replace(TRAILING_SLASH_PATTERN, "");
  return url.toString();
}
