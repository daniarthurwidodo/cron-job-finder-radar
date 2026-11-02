import { disconnectGoogle } from "@/app/actions";
import { SyncEmailsForm } from "@/app/settings/SyncEmailsForm";
import { getServices } from "@/lib/container";

const OUTCOME_MESSAGES: Record<string, string> = {
  connected: "Google connected.",
  denied: "Google access was not granted.",
  invalid: "The Google sign-in could not be verified. Try Connect again.",
  error: "Connecting to Google failed. See the server log.",
};

export function GoogleSection({ outcome }: { outcome?: string }) {
  const status = getServices().email.getConnectionStatus();
  return (
    <section className="flex flex-col gap-2 rounded border border-slate-300 p-3 dark:border-slate-700">
      <h1 className="text-xl font-semibold">Settings - email check (Gmail, read-only)</h1>
      {outcome && OUTCOME_MESSAGES[outcome] && <p className="text-sm font-medium">{OUTCOME_MESSAGES[outcome]}</p>}
      <p className="text-sm">
        Reads recent job-related email metadata and snippets (never bodies or attachments), matches them to jobs you track, and suggests status changes you confirm.
      </p>
      {!status.isConfigured ? (
        <p className="text-sm">
          Not configured. Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to <code>.env.local</code>, then restart the app.
        </p>
      ) : !status.accountEmail ? (
        <a href="/api/auth/google/start" className="w-fit rounded bg-slate-800 px-3 py-1 text-sm text-white dark:bg-slate-200 dark:text-slate-900">
          Connect Google
        </a>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm">Connected as {status.accountEmail}</p>
          <SyncEmailsForm />
          <form action={disconnectGoogle}>
            <button type="submit" className="rounded border border-slate-400 px-3 py-1 text-sm">
              Disconnect
            </button>
          </form>
        </div>
      )}
      {status.lastRun && (
        <p className="text-xs text-slate-500">
          Last sync {status.lastRun.startedAt.replace("T", " ").slice(0, 16)} UTC: {status.lastRun.fetchedCount} fetched, {status.lastRun.matchedCount} matched
          {status.lastRun.errorMessage ? `, error: ${status.lastRun.errorMessage}` : ""}
        </p>
      )}
    </section>
  );
}
