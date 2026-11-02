import { GOOGLE_STATE_COOKIE, GOOGLE_VERIFIER_COOKIE, HTTP_STATUS_SERVICE_UNAVAILABLE } from "@/lib/constants";
import { buildCookie } from "@/lib/google/cookies";
import { buildAuthorization, getGoogleConfig } from "@/lib/google/oauth";

const REDIRECT_STATUS = 302;

export async function GET(): Promise<Response> {
  const config = getGoogleConfig();
  if (!config) {
    return Response.json(
      { error: "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local and restart." },
      { status: HTTP_STATUS_SERVICE_UNAVAILABLE },
    );
  }
  const { url, state, codeVerifier } = await buildAuthorization(config);
  const headers = new Headers({ Location: url });
  headers.append("Set-Cookie", buildCookie({ name: GOOGLE_STATE_COOKIE, value: state }));
  headers.append("Set-Cookie", buildCookie({ name: GOOGLE_VERIFIER_COOKIE, value: codeVerifier }));
  return new Response(null, { status: REDIRECT_STATUS, headers });
}
