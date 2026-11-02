import Link from "next/link";
import { COUNTRY_CODES, SENIORITIES, SORT_KEYS, JOB_STATUSES } from "@/lib/constants";
import type { JobFilters } from "@/lib/dashboard/filters";
import { COUNTRY_LABELS, SENIORITY_LABELS, SORT_LABELS, STATUS_LABELS } from "@/lib/dashboard/format";

const FIELD_CLASS = "rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-600";

function Select({ name, value, options, emptyLabel }: { name: string; value?: string; options: Record<string, string>; emptyLabel?: string }) {
  return (
    <select name={name} defaultValue={value ?? ""} className={FIELD_CLASS}>
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {Object.entries(options).map(([code, label]) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}

function pick(labels: Record<string, string>, codes: string[]): Record<string, string> {
  return Object.fromEntries(codes.map((code) => [code, labels[code]]));
}

export function FilterBar({ filters, days }: { filters: JobFilters; days: string[] }) {
  const dayOptions = Object.fromEntries(days.map((day) => [day, day]));
  return (
    <form action="/" method="get" className="flex flex-wrap items-center gap-2">
      <input name="q" defaultValue={filters.search ?? ""} placeholder="Search title or company" className={`${FIELD_CLASS} w-56`} />
      <Select name="country" value={filters.countryCode} emptyLabel="All countries" options={pick(COUNTRY_LABELS, Object.values(COUNTRY_CODES))} />
      <Select name="seniority" value={filters.seniorityCode} emptyLabel="All levels" options={pick(SENIORITY_LABELS, Object.values(SENIORITIES))} />
      <Select name="status" value={filters.statusCode} emptyLabel="All statuses" options={pick(STATUS_LABELS, Object.values(JOB_STATUSES))} />
      <Select name="sort" value={filters.sortKey} options={pick(SORT_LABELS, Object.values(SORT_KEYS))} />
      <Select name="day" value={filters.day} emptyLabel="Latest day (+ tracked)" options={dayOptions} />
      <button type="submit" className="rounded bg-slate-800 px-3 py-1 text-sm text-white dark:bg-slate-200 dark:text-slate-900">
        Apply
      </button>
      <Link href="/" className="text-sm underline">
        Reset
      </Link>
    </form>
  );
}
