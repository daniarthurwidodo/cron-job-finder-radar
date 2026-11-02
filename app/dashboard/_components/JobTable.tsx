import { changeJobsStatus } from "@/app/actions";
import { JobRow } from "@/app/dashboard/_components/JobRow";
import { BULK_STATUS_FORM_ID, COMPARE_FORM_ID, JOB_STATUSES, MAX_COMPARE_JOBS } from "@/lib/constants";
import type { DashboardJob } from "@/lib/repositories/jobQueryRepository";

export function JobTable({ jobs, day }: { jobs: DashboardJob[]; day: string }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        <form id={COMPARE_FORM_ID} action="/compare" method="get">
          <button type="submit" className="rounded border border-slate-400 px-3 py-1 text-sm">
            Compare selected (max {MAX_COMPARE_JOBS})
          </button>
        </form>
        <form id={BULK_STATUS_FORM_ID} action={changeJobsStatus}>
          <input type="hidden" name="statusCode" value={JOB_STATUSES.INTERVIEWING} />
          <button type="submit" className="rounded border border-slate-400 px-3 py-1 text-sm">
            Mark selected as Interviewing
          </button>
        </form>
      </div>
      <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-300 text-xs dark:border-slate-700">
                <th className="py-1 pr-2">Bulk</th>
                <th className="pr-2">Compare</th>
                <th className="pr-3">Job</th>
                <th className="pr-3">Country</th>
                <th className="pr-3">Work / level</th>
                <th className="pr-3">Salary</th>
                <th className="pr-3">Net savings / month</th>
                <th className="pr-3">Stack</th>
                <th className="pr-3">Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} day={day} />
              ))}
            </tbody>
          </table>
          {jobs.length === 0 && <p className="py-6 text-sm">No jobs match for this day and filters.</p>}
        </div>
    </div>
  );
}
