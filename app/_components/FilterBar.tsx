import Link from "next/link";
import { FILTER_FORM_ID, SORT_DIRECTIONS, SORT_KEYS } from "@/lib/constants";
import type { JobFilters } from "@/lib/dashboard/filters";
import { SORT_LABELS } from "@/lib/dashboard/format";

const DIRECTION_LABELS: Record<string, string> = {
  [SORT_DIRECTIONS.DESC]: "Descending (high to low)",
  [SORT_DIRECTIONS.ASC]: "Ascending (low to high)",
};
const FIELD_CLASS = "rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-600";

function pick(labels: Record<string, string>, codes: string[]): Record<string, string> {
  return Object.fromEntries(codes.map((code) => [code, labels[code]]));
}

// The column filters live in the table header and submit through this same form (form="filter-form").
export function FilterBar({ filters, days }: { filters: JobFilters; days: string[] }) {
  const sortOptions = pick(SORT_LABELS, Object.values(SORT_KEYS));
  return (
    <form id={FILTER_FORM_ID} action="/" method="get" className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1 text-sm">
        Sort
        <select name="sort" defaultValue={filters.sortKey} className={FIELD_CLASS}>
          {Object.entries(sortOptions).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1 text-sm">
        Order
        <select name="dir" defaultValue={filters.direction} className={FIELD_CLASS}>
          {Object.entries(DIRECTION_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1 text-sm">
        Day
        <select name="day" defaultValue={filters.day ?? ""} className={FIELD_CLASS}>
          <option value="">Latest day (+ tracked)</option>
          {days.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="rounded bg-slate-800 px-3 py-1 text-sm text-white dark:bg-slate-200 dark:text-slate-900">
        Apply filters
      </button>
      <Link href="/" className="text-sm underline">
        Reset all
      </Link>
      <span className="text-xs text-slate-500">Column filters are in the table header (press Enter or Apply).</span>
    </form>
  );
}
