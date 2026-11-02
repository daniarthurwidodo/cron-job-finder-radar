import Link from "next/link";
import { queueJobForApply } from "@/app/actions";
import { StatusForm } from "@/app/dashboard/_components/StatusForm";
import { BULK_STATUS_FORM_ID, COMPARE_FORM_ID } from "@/lib/constants";
import { COUNTRY_LABELS, formatIdr, formatSalaryRange, labelOf, SENIORITY_LABELS, WORK_MODE_LABELS } from "@/lib/dashboard/format";
import type { DashboardJob } from "@/lib/repositories/jobQueryRepository";

const DAY_LENGTH = 10;

export function JobRow({ job, day }: { job: DashboardJob; day: string }) {
  const isNew = job.createdAt.slice(0, DAY_LENGTH) === day;
  return (
    <tr className="border-b border-slate-200 align-top dark:border-slate-800">
      <td className="py-2 pr-2">
        <input type="checkbox" name="bulkIds" value={job.id} form={BULK_STATUS_FORM_ID} aria-label={`Select ${job.title} for bulk status`} />
      </td>
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
