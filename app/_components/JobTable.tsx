import Link from "next/link";
import { changeJobStatus, queueJobForApply } from "@/app/actions";
import { COUNTRY_CODES, FILTER_FORM_ID, JOB_STATUSES, MAX_COMPARE_JOBS, SALARY_FILTER, SENIORITIES, WORK_MODES } from "@/lib/constants";
import type { JobFilters } from "@/lib/dashboard/filters";
import { COUNTRY_LABELS, formatIdr, formatSalaryRange, labelOf, SENIORITY_LABELS, STATUS_LABELS, WORK_MODE_LABELS } from "@/lib/dashboard/format";
import type { DashboardJob } from "@/lib/repositories/jobQueryRepository";

const COMPARE_FORM_ID = "compare-form";
const FILTER_FIELD_CLASS = "w-full rounded border border-slate-300 bg-transparent px-1 py-0.5 text-xs font-normal dark:border-slate-600";
const SALARY_FILTER_LABELS: Record<string, string> = {
  [SALARY_FILTER.DISCLOSED]: "Disclosed",
  [SALARY_FILTER.HIDDEN]: "Not disclosed",
};
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

function pick(labels: Record<string, string>, codes: string[]): Record<string, string> {
  return Object.fromEntries(codes.map((code) => [code, labels[code]]));
}

function FilterSelect({ name, value, options, emptyLabel }: { name: string; value?: string; options: Record<string, string>; emptyLabel: string }) {
  return (
    <select name={name} form={FILTER_FORM_ID} defaultValue={value ?? ""} aria-label={emptyLabel} className={FILTER_FIELD_CLASS}>
      <option value="">{emptyLabel}</option>
      {Object.entries(options).map(([code, label]) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}

function FilterNumber({ name, value, placeholder, max }: { name: string; value?: number; placeholder: string; max?: number }) {
  return (
    <input type="number" name={name} form={FILTER_FORM_ID} min={0} max={max} defaultValue={value} placeholder={placeholder} aria-label={placeholder} className={FILTER_FIELD_CLASS} />
  );
}

function FilterRow({ filters }: { filters: JobFilters }) {
  return (
    <tr className="border-b border-slate-300 align-top dark:border-slate-700">
      <th className="pb-2" />
      <th className="pb-2 pr-3">
        <input type="search" name="q" form={FILTER_FORM_ID} defaultValue={filters.search ?? ""} placeholder="Title or company" aria-label="Search title or company" className={FILTER_FIELD_CLASS} />
      </th>
      <th className="pb-2 pr-3">
        <FilterSelect name="country" value={filters.countryCode} emptyLabel="All" options={pick(COUNTRY_LABELS, Object.values(COUNTRY_CODES))} />
      </th>
      <th className="pb-2 pr-3">
        <div className="flex flex-col gap-1">
          <FilterSelect name="workMode" value={filters.workModeCode} emptyLabel="Any work mode" options={pick(WORK_MODE_LABELS, Object.values(WORK_MODES))} />
          <FilterSelect name="seniority" value={filters.seniorityCode} emptyLabel="Any level" options={pick(SENIORITY_LABELS, Object.values(SENIORITIES))} />
        </div>
      </th>
      <th className="pb-2 pr-3">
        <FilterSelect name="salary" value={filters.salary} emptyLabel="Any" options={SALARY_FILTER_LABELS} />
      </th>
      <th className="pb-2 pr-3">
        <FilterNumber name="minSavings" value={filters.minSavingsIdr} placeholder="Min IDR" />
      </th>
      <th className="pb-2 pr-3">
        <FilterNumber name="minStack" value={filters.minStack} placeholder="Min %" max={100} />
      </th>
      <th className="pb-2 pr-3">
        <FilterNumber name="minPriority" value={filters.minPriority} placeholder="Min" max={100} />
      </th>
      <th className="pb-2">
        <FilterSelect name="status" value={filters.statusCode} emptyLabel="All" options={pick(STATUS_LABELS, Object.values(JOB_STATUSES))} />
        <button type="submit" form={FILTER_FORM_ID} className="mt-1 w-full rounded bg-slate-800 px-2 py-0.5 text-xs font-normal text-white dark:bg-slate-200 dark:text-slate-900">
          Filter
        </button>
      </th>
    </tr>
  );
}

// filterKey remounts the header inputs when the filters change, so they never keep stale values after a soft navigation.
export function JobTable({ jobs, day, filters, filterKey }: { jobs: DashboardJob[]; day: string; filters: JobFilters; filterKey: string }) {
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
              <FilterRow key={filterKey} filters={filters} />
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
