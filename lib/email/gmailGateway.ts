import {
  GMAIL_API_URL,
  GMAIL_MAX_MESSAGES,
  GMAIL_QUERY,
  GMAIL_REQUEST_TIMEOUT_MS,
} from "@/lib/constants";
import type { GmailGateway, RawEmail } from "@/lib/email/types";
import { getGoogleConfig, createOAuthClient } from "@/lib/google/oauth";

interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: GmailHeader[] };
}

function headerValue({ headers, name }: { headers: GmailHeader[]; name: string }): string {
  return headers.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

// Only metadata and Gmail's short snippet are read; bodies and attachments are never requested.
export function toRawEmail(message: GmailMessage): RawEmail {
  const headers = message.payload?.headers ?? [];
  const receivedMs = Number(message.internalDate);
  return {
    id: message.id,
    threadId: message.threadId,
    from: headerValue({ headers, name: "From" }),
    subject: headerValue({ headers, name: "Subject" }),
    snippet: message.snippet ?? "",
    receivedAt: Number.isFinite(receivedMs) ? new Date(receivedMs).toISOString() : new Date().toISOString(),
  };
}

async function gmailGet({ path, accessToken }: { path: string; accessToken: string }): Promise<unknown> {
  const response = await fetch(`${GMAIL_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(GMAIL_REQUEST_TIMEOUT_MS),
  });
  if (response.status === 401) throw new Error("Google login expired. Reconnect Google in Settings.");
  if (!response.ok) throw new Error(`Gmail API HTTP ${response.status}`);
  return response.json();
}

async function getAccessToken(refreshToken: string): Promise<string> {
  const config = getGoogleConfig();
  if (!config) throw new Error("Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local.");
  const client = createOAuthClient(config);
  client.setCredentials({ refresh_token: refreshToken });
  try {
    const { token } = await client.getAccessToken();
    if (!token) throw new Error("No access token returned");
    return token;
  } catch {
    throw new Error("Google login expired or was revoked. Reconnect Google in Settings.");
  }
}

export const gmailGateway: GmailGateway = {
  async fetchRecentEmails(refreshToken) {
    const accessToken = await getAccessToken(refreshToken);
    const listPath = `/messages?maxResults=${GMAIL_MAX_MESSAGES}&q=${encodeURIComponent(GMAIL_QUERY)}`;
    const list = (await gmailGet({ path: listPath, accessToken })) as { messages?: { id: string }[] };
    const emails: RawEmail[] = [];
    for (const { id } of list.messages ?? []) {
      const metadataPath = `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`;
      emails.push(toRawEmail((await gmailGet({ path: metadataPath, accessToken })) as GmailMessage));
    }
    return emails;
  },
};
