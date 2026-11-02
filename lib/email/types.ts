export interface RawEmail {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
}

export interface CandidateJob {
  id: number;
  title: string;
  companyName: string;
  sourceJobIds: string[];
}

export interface EmailMatch {
  jobId: number;
  score: number;
  reason: string;
}

export interface EmailCategory {
  category: string;
  suggestedStatusCode: string | null;
}

export interface GmailGateway {
  fetchRecentEmails(refreshToken: string): Promise<RawEmail[]>;
}
