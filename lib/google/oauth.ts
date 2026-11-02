import { timingSafeEqual } from "node:crypto";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import {
  GMAIL_API_URL,
  GMAIL_REQUEST_TIMEOUT_MS,
  GMAIL_SCOPE,
  GOOGLE_CLIENT_ID_ENV_NAME,
  GOOGLE_CLIENT_SECRET_ENV_NAME,
  GOOGLE_DEFAULT_REDIRECT_URI,
  GOOGLE_REDIRECT_URI_ENV_NAME,
} from "@/lib/constants";

const STATE_BYTES = 24;

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function getGoogleConfig(): GoogleConfig | null {
  const clientId = process.env[GOOGLE_CLIENT_ID_ENV_NAME];
  const clientSecret = process.env[GOOGLE_CLIENT_SECRET_ENV_NAME];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri: process.env[GOOGLE_REDIRECT_URI_ENV_NAME] ?? GOOGLE_DEFAULT_REDIRECT_URI };
}

export function createOAuthClient(config: GoogleConfig): OAuth2Client {
  return new OAuth2Client({ clientId: config.clientId, clientSecret: config.clientSecret, redirectUri: config.redirectUri });
}

export function createState(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(STATE_BYTES))).toString("base64url");
}

export function isStateValid({ expected, received }: { expected: string | undefined; received: string | null }): boolean {
  if (!expected || !received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

export async function buildAuthorization(config: GoogleConfig): Promise<{ url: string; state: string; codeVerifier: string }> {
  const client = createOAuthClient(config);
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  const state = createState();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GMAIL_SCOPE],
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
  });
  return { url, state, codeVerifier: codeVerifier ?? "" };
}

export async function exchangeCode({ config, code, codeVerifier }: { config: GoogleConfig; code: string; codeVerifier: string }): Promise<{ refreshToken: string; accessToken: string }> {
  const { tokens } = await createOAuthClient(config).getToken({ code, codeVerifier });
  if (!tokens.refresh_token || !tokens.access_token) throw new Error("Google did not return a refresh token. Remove the app from your Google account access list and connect again.");
  return { refreshToken: tokens.refresh_token, accessToken: tokens.access_token };
}

export async function fetchAccountEmail(accessToken: string): Promise<string> {
  const response = await fetch(`${GMAIL_API_URL}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(GMAIL_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Gmail profile HTTP ${response.status}`);
  return ((await response.json()) as { emailAddress: string }).emailAddress;
}
