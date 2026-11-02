import { confirmEmailSuggestion, dismissEmailSuggestion } from "@/app/actions";
import { EMAIL_CATEGORIES } from "@/lib/constants";
import { labelOf, STATUS_LABELS } from "@/lib/dashboard/format";
import type { JobEmailRow } from "@/lib/repositories/jobEmailRepository";

const CATEGORY_LABELS: Record<string, string> = {
  [EMAIL_CATEGORIES.INTERVIEW]: "Interview",
  [EMAIL_CATEGORIES.ASSESSMENT]: "Assessment",
  [EMAIL_CATEGORIES.OFFER]: "Offer",
  [EMAIL_CATEGORIES.REJECTION]: "Rejection",
  [EMAIL_CATEGORIES.RECEIVED]: "Application received",
  [EMAIL_CATEGORIES.OTHER]: "Other",
};

export function EmailItem({ email, showJob }: { email: JobEmailRow; showJob: boolean }) {
  const hasPendingSuggestion = email.suggestedStatusCode !== null && email.isDismissed === 0;
  return (
    <li className="rounded border border-slate-200 p-2 text-xs dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-slate-200 px-1 dark:bg-slate-700">{labelOf({ labels: CATEGORY_LABELS, code: email.category })}</span>
        <span className="font-medium">{email.subject || "(no subject)"}</span>
        <span className="text-slate-500">{email.receivedAt.replace("T", " ").slice(0, 16)}</span>
      </div>
      <div className="text-slate-500">
        {email.fromAddress}
        {showJob && <> - for {email.jobTitle}</>} (matched by {email.matchReason})
      </div>
      {email.snippet && <p className="mt-1">{email.snippet}</p>}
      {hasPendingSuggestion && (
        <div className="mt-1 flex items-center gap-2">
          <span>Suggested status: {labelOf({ labels: STATUS_LABELS, code: email.suggestedStatusCode ?? "" })}</span>
          <form action={confirmEmailSuggestion}>
            <input type="hidden" name="emailId" value={email.id} />
            <input type="hidden" name="jobId" value={email.jobId} />
            <button type="submit" className="rounded border border-slate-400 px-2">
              Confirm
            </button>
          </form>
          <form action={dismissEmailSuggestion}>
            <input type="hidden" name="emailId" value={email.id} />
            <input type="hidden" name="jobId" value={email.jobId} />
            <button type="submit" className="rounded border border-slate-400 px-2">
              Dismiss
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
