import Link from "next/link";
import { connection } from "next/server";
import { StartApplyForm } from "@/app/apply/StartApplyForm";
import { confirmJobApplied, skipQueuedJob, unqueueJobFromApply } from "@/app/actions";
import { APPLY_STATES, DASHBOARD_PATH } from "@/lib/constants";
import { getServices } from "@/lib/container";
import { COUNTRY_LABELS, labelOf } from "@/lib/dashboard/format";

const STATE_LABELS: Record<string, string> = {
  [APPLY_STATES.NEEDS_DOCUMENTS]: "Needs documents",
  [APPLY_STATES.READY]: "Ready to apply",
  [APPLY_STATES.APPLIED]: "Applied",
  [APPLY_STATES.SKIPPED]: "Skipped",
};

function JobAction({ action, jobId, label }: { action: (formData: FormData) => Promise<void>; jobId: number; label: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="jobId" value={jobId} />
      <button type="submit" className="rounded border border-slate-400 px-2 py-0.5 text-xs">
        {label}
      </button>
    </form>
  );
}

export default async function ApplyQueuePage() {
  await connection();
  const items = getServices().apply.listQueue();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Apply queue</h1>
      <p className="max-w-3xl text-sm">
        Only jobs you queue appear here. Start apply opens the real apply page in a visible browser window and fills what it can. You review everything,
        sign in if asked, and press Submit yourself - the app never submits and never passes bot or login checks. Afterwards press &quot;I applied&quot;.
      </p>
      {items.length === 0 ? (
        <p className="text-sm">
          Nothing queued. Use &quot;Queue to apply&quot; on a job in the <Link href={DASHBOARD_PATH} className="underline">dashboard</Link>.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-xs dark:border-slate-700">
              <th className="py-1 pr-3">Job</th>
              <th className="pr-3">Country</th>
              <th className="pr-3">State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-200 align-top dark:border-slate-800">
                <td className="py-2 pr-3">
                  <Link href={`/jobs/${item.id}`} className="font-medium underline">
                    {item.title}
                  </Link>
                  <div className="text-xs text-slate-500">{item.companyName}</div>
                </td>
                <td className="pr-3 text-xs">{labelOf({ labels: COUNTRY_LABELS, code: item.countryCode })}</td>
                <td className="pr-3 text-xs">{labelOf({ labels: STATE_LABELS, code: item.state })}</td>
                <td className="py-2">
                  <div className="flex flex-wrap items-start gap-2">
                    {item.state !== APPLY_STATES.APPLIED && <StartApplyForm jobId={item.id} />}
                    {item.state !== APPLY_STATES.APPLIED && <JobAction action={confirmJobApplied} jobId={item.id} label="I applied" />}
                    {item.state !== APPLY_STATES.APPLIED && item.state !== APPLY_STATES.SKIPPED && <JobAction action={skipQueuedJob} jobId={item.id} label="Skip" />}
                    <JobAction action={unqueueJobFromApply} jobId={item.id} label="Remove" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
