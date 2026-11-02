import { timingSafeEqual } from "node:crypto";
import { BEARER_PREFIX } from "@/lib/constants";

export function isAuthorized({ authorizationHeader, secret }: { authorizationHeader: string | null; secret: string }): boolean {
  if (!secret) return false;
  if (!authorizationHeader?.startsWith(BEARER_PREFIX)) return false;
  const provided = Buffer.from(authorizationHeader.slice(BEARER_PREFIX.length));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
