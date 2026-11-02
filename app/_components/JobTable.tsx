import Link from "next/link";
import { changeJobStatus, queueJobForApply } from "@/app/actions";
import { JOB_STATUSES, MAX_COMPARE_JOBS } from "@/lib/constants";
import { COUNTRY_LABELS, formatIdr, formatSalaryRange, labelOf, SENIORITY_LABELS, STATUS_LABELS, WORK_MODE_LABELS } from "@/lib/dashboard/format";
import type { DashboardJob } from "@/lib/repositories/jobQueryRepository";

const COMPARE_FORM_ID = "compare-form";
const DAY_LENGTH = 10;

function StatusForm({ job }: { job: DashboardJob }) {
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

function JobRow({ job, day }: { job: DashboardJob; day: string }) {
  const isNew = job.createdAt.slice(0, DAY_LENGTH) === day;
  return (
    <tr className="border-b border-slate-200 align-top dark:border-slate-800">
      <td className="py-2 pr-2">
        <input type="checkbox" name="ids" value={job.id} form={COMPARE_FORM_ID} aria-label={`Compare ${job.title}`} />
      </td>
      <td className="py-2 pr-3">
        {job.sourceUrl ? (
          <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="font-medium underline">
            {job.title}
          </a>
        ) : (
          <span className="font-medium">{job.title}</span>
        )}
        {isNew ? (
          <span className="ml-2 rounded bg-green-100 px-1 text-xs text-green-800">NEW</span>
        ) : (
          <span className="ml-2 rounded bg-amber-100 px-1 text-xs text-amber-800">TRACKED</span>
        )}
        <div className="text-xs text-slate-500">
          {job.companyName} - {job.city}
        </div>
        {job.techTags && <div className="text-xs text-slate-500">{job.techTags}</div>}
        <div className="mt-1 flex items-center gap-3">
          <Link href={`/jobs/${job.id}`} className="text-xs underline">
            CV and letter
          </Link>
          {job.applyQueuedAt ? (
            <Link href="/apply" className="text-xs text-green-700 underline">
              In apply queue
            </Link>
          ) : (
            <form action={queueJobForApply}>
              <input type="hidden" name="jobId" value={job.id} />
              <button type="submit" className="text-xs underline">
                Queue to apply
              </button>
            </form>
          )}
        </div>
      </td>
      <td className="pr-3 text-xs">{labelOf({ labels: COUNTRY_LABELS, code: job.countryCode })}</td>
      <td className="pr-3 text-xs">
        {labelOf({ labels: WORK_MODE_LABELS, code: job.workModeCode })}
        <div className="text-slate-500">{labelOf({ labels: SENIORITY_LABELS, code: job.seniorityCode })}</div>
      </td>
      <td className="pr-3 text-xs">{formatSalaryRange({ minMinor: job.salaryMinMonthlyMinor, maxMinor: job.salaryMaxMonthlyMinor, currencyCode: job.currencyCode })}</td>
      <td className="pr-3 text-xs font-semibold">{job.netSavingsMonthlyIdr === null ? "n/a" : formatIdr(job.netSavingsMonthlyIdr)}</td>
      <td className="pr-3 text-xs">{job.stackMatchScore}%</td>
      <td className="pr-3 text-xs">{job.priorityScore}</td>
      <td className="py-2">
        <StatusForm job={job} />
      </td>
    </tr>
  );
}

export function JobTable({ jobs, day }: { jobs: DashboardJob[]; day: string }) {
  return (
    <div>
      <form id={COMPARE_FORM_ID} action="/compare" method="get" className="mb-2">
        <button type="submit" className="rounded border border-slate-400 px-3 py-1 text-sm">
          Compare selected (max {MAX_COMPARE_JOBS})
        </button>
      </form>
      {jobs.length === 0 ? (
        <p className="py-6 text-sm">No jobs match for this day and filters.</p>
      ) : (
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
        </div>
      )}
    </div>
  );
}
