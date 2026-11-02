import { GOOGLE_COOKIE_MAX_AGE_SECONDS } from "@/lib/constants";

const COOKIE_PAIR_SEPARATOR = "; ";

export function buildCookie({ name, value, maxAgeSeconds = GOOGLE_COOKIE_MAX_AGE_SECONDS }: { name: string; value: string; maxAgeSeconds?: number }): string {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function readCookie({ header, name }: { header: string | null; name: string }): string | undefined {
  const pair = (header ?? "").split(COOKIE_PAIR_SEPARATOR).find((entry) => entry.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : undefined;
}
