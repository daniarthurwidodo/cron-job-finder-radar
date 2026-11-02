import Link from "next/link";
import { connection } from "next/server";
import { DASHBOARD_PATH, MAX_COMPARE_JOBS } from "@/lib/constants";
import { getServices } from "@/lib/container";
import { parseCompareIds, type RawSearchParams } from "@/lib/dashboard/filters";
import { COUNTRY_LABELS, formatIdr, formatSalaryRange, labelOf, SENIORITY_LABELS, STATUS_LABELS, WORK_MODE_LABELS } from "@/lib/dashboard/format";
import type { DashboardJob } from "@/lib/repositories/jobQueryRepository";

const PERCENT_SUFFIX = "%";
const VISA_STATED = "Offers sponsorship";
const VISA_NOT_STATED = "Not stated";

function netSalaryIdr(job: DashboardJob): number | null {
  if (job.grossMonthlyIdr === null || job.taxMonthlyIdr === null) return null;
  return job.grossMonthlyIdr - job.taxMonthlyIdr;
}

const ROWS: { label: string; render: (job: DashboardJob) => string }[] = [
  { label: "Company", render: (job) => `${job.companyName} (${job.city})` },
  { label: "Country", render: (job) => labelOf({ labels: COUNTRY_LABELS, code: job.countryCode }) },
  { label: "Salary (native)", render: (job) => formatSalaryRange({ minMinor: job.salaryMinMonthlyMinor, maxMinor: job.salaryMaxMonthlyMinor, currencyCode: job.currencyCode }) },
  { label: "Gross / month (IDR)", render: (job) => formatIdr(job.grossMonthlyIdr) },
  { label: "Net after tax / month (IDR)", render: (job) => formatIdr(netSalaryIdr(job)) },
  { label: "Cost of living / month (IDR)", render: (job) => formatIdr(job.colMonthlyIdr) },
  { label: "Net savings / month (IDR)", render: (job) => formatIdr(job.netSavingsMonthlyIdr) },
  { label: "Stack overlap", render: (job) => `${job.stackMatchScore}${PERCENT_SUFFIX}` },
  { label: "Matched stack", render: (job) => job.techTags ?? "-" },
  { label: "Work mode", render: (job) => labelOf({ labels: WORK_MODE_LABELS, code: job.workModeCode }) },
  { label: "Level", render: (job) => labelOf({ labels: SENIORITY_LABELS, code: job.seniorityCode }) },
  { label: "Visa sponsorship", render: (job) => (job.hasVisaSponsorship ? VISA_STATED : VISA_NOT_STATED) },
  { label: "Status", render: (job) => labelOf({ labels: STATUS_LABELS, code: job.statusCode }) },
  { label: "Priority", render: (job) => String(job.priorityScore) },
];

export default async function ComparePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await connection();
  const requestedIds = parseCompareIds((await searchParams).ids);
  const jobs = getServices().dashboard.getCompareJobs(requestedIds);
  return (
    <div>
      <Link href={DASHBOARD_PATH} className="text-sm underline">
        Back to dashboard
      </Link>
      <h1 className="my-3 text-xl font-semibold">Compare jobs (up to {MAX_COMPARE_JOBS})</h1>
      {jobs.length === 0 ? (
        <p className="text-sm">Select jobs on the dashboard and press Compare.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 dark:border-slate-700">
                <th className="py-2 pr-4" />
                {jobs.map((job) => (
                  <th key={job.id} className="pr-4 align-top">
                    {job.sourceUrl ? (
                      <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                        {job.title}
                      </a>
                    ) : (
                      job.title
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b border-slate-200 align-top dark:border-slate-800">
                  <td className="py-2 pr-4 text-xs font-medium text-slate-500">{row.label}</td>
                  {jobs.map((job) => (
                    <td key={job.id} className="pr-4 text-xs">
                      {row.render(job)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
