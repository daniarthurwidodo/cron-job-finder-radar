import { JobRow } from "@/app/dashboard/_components/JobRow";
import { COMPARE_FORM_ID, MAX_COMPARE_JOBS } from "@/lib/constants";
import type { DashboardJob } from "@/lib/repositories/jobQueryRepository";

export function JobTable({ jobs, day }: { jobs: DashboardJob[]; day: string }) {
  return (
    <div>
      <form id={COMPARE_FORM_ID} action="/compare" method="get" className="mb-2">
        <button type="submit" className="rounded border border-slate-400 px-3 py-1 text-sm">
          Compare selected (max {MAX_COMPARE_JOBS})
        </button>
      </form>
      <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-300 text-xs dark:border-slate-700">
                <th className="py-1 pr-2" />
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
