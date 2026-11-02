import { ScrapeNowForm } from "@/app/dashboard/_components/ScrapeNowForm";
import { labelOf, SOURCE_LABELS } from "@/lib/dashboard/format";
import type { ScrapeRunRow } from "@/lib/repositories/scrapeRunRepository";

const DAY_LENGTH = 10;

function dayOf(startedAt: string): string {
  return startedAt.slice(0, DAY_LENGTH);
}

export function ScrapePanel({ runs, newJobsCount, day }: { runs: ScrapeRunRow[]; newJobsCount: number; day: string }) {
  const latestRuns = runs.filter((run) => dayOf(run.startedAt) === day);
  const failedRuns = latestRuns.filter((run) => run.errorMessage);
  return (
    <section className="rounded border border-slate-300 p-4 dark:border-slate-700">
      <h2 className="mb-2 text-lg font-semibold">Daily scrape - {day}</h2>
      <ScrapeNowForm />
      {runs.length === 0 ? (
        <p className="text-sm">No scrape has run yet. Use the button above or wait for the daily timer.</p>
      ) : (
        <p className="mb-3 text-sm">
          {latestRuns.length} run(s) on this day, {failedRuns.length} with errors. {newJobsCount} job(s) shown for the day.
        </p>
      )}
      {runs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-300 dark:border-slate-700">
                <th className="py-1 pr-3">Started (UTC)</th>
                <th className="pr-3">Source</th>
                <th className="pr-3">Found</th>
                <th className="pr-3">New</th>
                <th className="pr-3">Duplicates</th>
                <th className="pr-3">Filtered</th>
                <th className="pr-3">Invalid</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-slate-200 dark:border-slate-800">
                  <td className="py-1 pr-3">{run.startedAt.replace("T", " ").slice(0, 16)}</td>
                  <td className="pr-3">{labelOf({ labels: SOURCE_LABELS, code: run.sourceCode })}</td>
                  <td className="pr-3">{run.found}</td>
                  <td className="pr-3 font-semibold">{run.inserted}</td>
                  <td className="pr-3">{run.duplicates}</td>
                  <td className="pr-3">{run.filtered}</td>
                  <td className="pr-3">{run.invalid}</td>
                  <td className={run.errorMessage ? "text-red-600" : run.finishedAt ? "text-green-700" : ""}>
                    {run.errorMessage ?? (run.finishedAt ? "OK" : "Running")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">Savings are estimates from tax tables and the cost-of-living benchmarks in Settings.</p>
    </section>
  );
}
