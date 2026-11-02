import { connection } from "next/server";
import { saveColBenchmark } from "@/app/actions";
import { getServices } from "@/lib/container";
import { COUNTRY_LABELS, formatMajorFromMinor, labelOf } from "@/lib/dashboard/format";
import { TAX_YEAR_NOTES } from "@/lib/constants";

export default async function SettingsPage() {
  await connection();
  const benchmarks = getServices().dashboard.listColBenchmarks();
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold">Settings - monthly cost of living</h1>
      <p className="text-sm">
        One-bedroom rent in the city centre plus living costs for a single person, in local currency. Saving a value recalculates net savings for every job.
        The defaults are rough estimates from sources that disagree, so adjust them.
      </p>
      {benchmarks.map((benchmark) => (
        <form key={benchmark.countryCode} action={saveColBenchmark} className="rounded border border-slate-300 p-3 dark:border-slate-700">
          <input type="hidden" name="countryCode" value={benchmark.countryCode} />
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-32 font-medium">{labelOf({ labels: COUNTRY_LABELS, code: benchmark.countryCode })}</span>
            <span>{benchmark.currencyCode}</span>
            <input
              name="monthlyMajor"
              type="number"
              min="1"
              step="1"
              required
              defaultValue={formatMajorFromMinor(benchmark.monthlyMinor)}
              className="w-32 rounded border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-600"
            />
            <button type="submit" className="rounded bg-slate-800 px-3 py-1 text-white dark:bg-slate-200 dark:text-slate-900">
              Save
            </button>
          </label>
          <p className="mt-1 text-xs text-slate-500">{benchmark.sourceNote} (as of {benchmark.asOfDate})</p>
          <p className="text-xs text-slate-500">Tax basis: {TAX_YEAR_NOTES[benchmark.countryCode as keyof typeof TAX_YEAR_NOTES]}</p>
        </form>
      ))}
    </div>
  );
}
