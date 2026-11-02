import { GMAIL_SCOPE, GOOGLE_STATE_COOKIE, GOOGLE_VERIFIER_COOKIE, HTTP_STATUS_SERVICE_UNAVAILABLE } from "@/lib/constants";
import { getServices } from "@/lib/container";
import { buildCookie, readCookie } from "@/lib/google/cookies";
import { exchangeCode, fetchAccountEmail, getGoogleConfig, isStateValid } from "@/lib/google/oauth";
import { logger } from "@/lib/logger";

const REDIRECT_STATUS = 302;
const SETTINGS_PATH = "/settings";
const CLEAR_COOKIE_AGE = 0;

function redirectToSettings({ baseUrl, outcome }: { baseUrl: string; outcome: string }): Response {
  const headers = new Headers({ Location: new URL(`${SETTINGS_PATH}?google=${outcome}`, baseUrl).toString() });
  for (const name of [GOOGLE_STATE_COOKIE, GOOGLE_VERIFIER_COOKIE]) {
    headers.append("Set-Cookie", buildCookie({ name, value: "", maxAgeSeconds: CLEAR_COOKIE_AGE }));
  }
  return new Response(null, { status: REDIRECT_STATUS, headers });
}

export async function GET(request: Request): Promise<Response> {
  const config = getGoogleConfig();
  if (!config) return Response.json({ error: "Google OAuth is not configured" }, { status: HTTP_STATUS_SERVICE_UNAVAILABLE });
  const baseUrl = new URL(config.redirectUri).origin;
  const params = new URL(request.url).searchParams;
  const cookieHeader = request.headers.get("cookie");
  const expectedState = readCookie({ header: cookieHeader, name: GOOGLE_STATE_COOKIE });
  const codeVerifier = readCookie({ header: cookieHeader, name: GOOGLE_VERIFIER_COOKIE });
  const code = params.get("code");
  if (params.get("error")) return redirectToSettings({ baseUrl, outcome: "denied" });
  if (!isStateValid({ expected: expectedState, received: params.get("state") }) || !code || !codeVerifier) {
    return redirectToSettings({ baseUrl, outcome: "invalid" });
  }
  try {
    const { refreshToken, accessToken } = await exchangeCode({ config, code, codeVerifier });
    const accountEmail = await fetchAccountEmail(accessToken);
    getServices().email.saveConnection({ accountEmail, refreshToken, scope: GMAIL_SCOPE, connectedAt: new Date().toISOString() });
    return redirectToSettings({ baseUrl, outcome: "connected" });
  } catch (error) {
    logger.error("google connect failed", { error: String(error) });
    return redirectToSettings({ baseUrl, outcome: "error" });
  }
}
