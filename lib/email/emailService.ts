import { EMAIL_PANEL_RECENT_LIMIT, JOB_STATUSES } from "@/lib/constants";
import { categorizeEmail } from "@/lib/email/categorize";
import { matchEmailToJob } from "@/lib/email/match";
import type { GmailGateway, RawEmail } from "@/lib/email/types";
import { logger } from "@/lib/logger";
import type { EmailSyncRun, EmailSyncRunRepository } from "@/lib/repositories/emailSyncRunRepository";
import type { GoogleConnection, GoogleConnectionRepository } from "@/lib/repositories/googleConnectionRepository";
import type { JobEmailRepository, JobEmailRow } from "@/lib/repositories/jobEmailRepository";

export interface EmailDependencies {
  connections: GoogleConnectionRepository;
  jobEmails: JobEmailRepository;
  syncRuns: EmailSyncRunRepository;
  gateway: GmailGateway;
  changeJobStatus: (change: { jobId: number; statusCode: string }) => void;
  isGoogleConfigured: () => boolean;
}

export interface ConnectionStatus {
  isConfigured: boolean;
  accountEmail: string | null;
  lastRun: EmailSyncRun | null;
}

export interface SyncResult {
  fetched: number;
  matched: number;
}

export class EmailService {
  constructor(private readonly dependencies: EmailDependencies) {}

  getConnectionStatus(): ConnectionStatus {
    const { connections, syncRuns, isGoogleConfigured } = this.dependencies;
    return {
      isConfigured: isGoogleConfigured(),
      accountEmail: connections.find()?.accountEmail ?? null,
      lastRun: syncRuns.findLatest() ?? null,
    };
  }

  saveConnection(connection: GoogleConnection): void {
    this.dependencies.connections.replace(connection);
  }

  disconnect(): void {
    this.dependencies.connections.remove();
  }

  async syncNow(): Promise<SyncResult> {
    const { connections, syncRuns, gateway } = this.dependencies;
    const connection = connections.find();
    if (!connection) throw new Error("Google is not connected. Connect it in Settings first.");
    const runId = syncRuns.start();
    try {
      const emails = await gateway.fetchRecentEmails(connection.refreshToken);
      const matched = this.storeMatches(emails);
      syncRuns.finish({ id: runId, fetchedCount: emails.length, matchedCount: matched, errorMessage: null });
      return { fetched: emails.length, matched };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      syncRuns.finish({ id: runId, fetchedCount: 0, matchedCount: 0, errorMessage: message });
      throw error;
    }
  }

  // Used by the daily run: never throws, so an email problem cannot block the scrape.
  async syncIfConnected(): Promise<SyncResult | null> {
    if (!this.dependencies.connections.find()) return null;
    try {
      return await this.syncNow();
    } catch (error) {
      logger.error("email sync failed", { error: String(error) });
      return null;
    }
  }

  getJobEmails(jobId: number): JobEmailRow[] {
    return this.dependencies.jobEmails.listForJob(jobId);
  }

  getPanelData(): { pending: JobEmailRow[]; recent: JobEmailRow[] } {
    const { jobEmails } = this.dependencies;
    return { pending: jobEmails.listPendingSuggestions(), recent: jobEmails.listRecent(EMAIL_PANEL_RECENT_LIMIT) };
  }

  confirmSuggestion(emailId: number): void {
    const { jobEmails, changeJobStatus } = this.dependencies;
    const email = jobEmails.find(emailId);
    if (!email) throw new Error(`Email ${emailId} not found`);
    if (!email.suggestedStatusCode) throw new Error(`Email ${emailId} has no suggested status`);
    if (!Object.values(JOB_STATUSES).includes(email.suggestedStatusCode as never)) throw new Error(`Invalid suggested status: ${email.suggestedStatusCode}`);
    changeJobStatus({ jobId: email.jobId, statusCode: email.suggestedStatusCode });
    jobEmails.markHandled(emailId);
  }

  dismissSuggestion(emailId: number): void {
    const { jobEmails } = this.dependencies;
    if (!jobEmails.find(emailId)) throw new Error(`Email ${emailId} not found`);
    jobEmails.markHandled(emailId);
  }

  private storeMatches(emails: RawEmail[]): number {
    const { jobEmails } = this.dependencies;
    const candidates = jobEmails.listCandidateJobs();
    let matched = 0;
    for (const email of emails) {
      if (jobEmails.exists(email.id)) continue;
      const match = matchEmailToJob({ email, candidates });
      if (!match) continue;
      const { category, suggestedStatusCode } = categorizeEmail(email);
      jobEmails.insert({
        jobId: match.jobId,
        gmailMessageId: email.id,
        threadId: email.threadId,
        fromAddress: email.from,
        subject: email.subject,
        snippet: email.snippet,
        receivedAt: email.receivedAt,
        category,
        suggestedStatusCode,
        matchReason: match.reason,
      });
      matched += 1;
    }
    return matched;
  }
}


