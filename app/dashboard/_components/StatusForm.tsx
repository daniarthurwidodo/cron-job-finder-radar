import { changeJobStatus } from "@/app/actions";
import { JOB_STATUSES } from "@/lib/constants";
import { STATUS_LABELS } from "@/lib/dashboard/format";
import type { DashboardJob } from "@/lib/repositories/jobQueryRepository";

export function StatusForm({ job }: { job: DashboardJob }) {
  return (
    <form action={changeJobStatus} className="flex gap-1">
      <input type="hidden" name="jobId" value={job.id} />
      <select name="statusCode" defaultValue={job.statusCode} className="rounded border border-slate-300 bg-transparent px-1 py-0.5 text-xs dark:border-slate-600">
        {Object.values(JOB_STATUSES).map((code) => (
          <option key={code} value={code}>
            {STATUS_LABELS[code]}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded border border-slate-400 px-2 text-xs">
        Set
      </button>
    </form>
  );
}
