"use client";

import Link from "next/link";
import { COUNTRY_CODES, DASHBOARD_PATH, JOB_STATUSES, PERCENT_MAX, SALARY_FILTER, SENIORITIES, SORT_DIRECTIONS, SORT_KEYS, WORK_MODES } from "@/lib/constants";
import type { JobFilters } from "@/lib/dashboard/filters";
import { COUNTRY_LABELS, pick, SENIORITY_LABELS, SORT_LABELS, STATUS_LABELS, WORK_MODE_LABELS } from "@/lib/dashboard/format";
import { useQueryNavigation } from "@/lib/hooks/useQueryNavigation";

const DIRECTION_LABELS: Record<string, string> = {
  [SORT_DIRECTIONS.DESC]: "High to low",
  [SORT_DIRECTIONS.ASC]: "Low to high",
};
const SALARY_FILTER_LABELS: Record<string, string> = {
  [SALARY_FILTER.DISCLOSED]: "Disclosed",
  [SALARY_FILTER.HIDDEN]: "Not disclosed",
};
const FIELD_CLASS = "rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-600";

function SelectField({ name, label, value, options }: { name: string; label: string; value?: string; options: Record<string, string> }) {
  return (
    <label className="flex flex-col gap-0.5 text-xs">
      {label}
      <select name={name} defaultValue={value ?? ""} className={FIELD_CLASS}>
        <option value="">Any</option>
        {Object.entries(options).map(([code, optionLabel]) => (
          <option key={code} value={code}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({ name, label, value, max }: { name: string; label: string; value?: number; max?: number }) {
  return (
    <label className="flex flex-col gap-0.5 text-xs">
      {label}
      <input type="number" name={name} min={0} max={max} defaultValue={value} className={`${FIELD_CLASS} w-28`} />
    </label>
  );
}

function MoreFilters({ filters, days }: { filters: JobFilters; days: string[] }) {
  const dayOptions = Object.fromEntries(days.map((day) => [day, day]));
  return (
    <div className="mt-2 flex flex-wrap items-end gap-3">
      <SelectField name="workMode" label="Work mode" value={filters.workModeCode} options={pick(WORK_MODE_LABELS, Object.values(WORK_MODES))} />
      <SelectField name="seniority" label="Level" value={filters.seniorityCode} options={pick(SENIORITY_LABELS, Object.values(SENIORITIES))} />
      <SelectField name="salary" label="Salary" value={filters.salary} options={SALARY_FILTER_LABELS} />
      <SelectField name="day" label="Day" value={filters.day} options={dayOptions} />
      <SelectField name="dir" label="Order" value={filters.direction} options={DIRECTION_LABELS} />
      <NumberField name="minSavings" label="Min savings (IDR)" value={filters.minSavingsIdr} />
      <NumberField name="minStack" label="Min stack %" value={filters.minStack} max={PERCENT_MAX} />
      <NumberField name="minPriority" label="Min priority" value={filters.minPriority} max={PERCENT_MAX} />
    </div>
  );
}

function hasMoreFilters(filters: JobFilters): boolean {
  return [filters.workModeCode, filters.seniorityCode, filters.salary, filters.day, filters.minSavingsIdr, filters.minStack, filters.minPriority].some((value) => value !== undefined);
}

// Submitting navigates on the client (no full page reload); without JavaScript it is still a normal GET form.
export function FilterBar({ filters, days }: { filters: JobFilters; days: string[] }) {
  const { isPending, handleSubmit } = useQueryNavigation(DASHBOARD_PATH);

  return (
    <form action={DASHBOARD_PATH} method="get" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-0.5 text-xs">
          Search
          <input type="search" name="q" defaultValue={filters.search ?? ""} placeholder="Title or company" className={FIELD_CLASS} />
        </label>
        <SelectField name="country" label="Country" value={filters.countryCode} options={pick(COUNTRY_LABELS, Object.values(COUNTRY_CODES))} />
        <SelectField name="status" label="Status" value={filters.statusCode} options={pick(STATUS_LABELS, Object.values(JOB_STATUSES))} />
        <label className="flex flex-col gap-0.5 text-xs">
          Sort by
          <select name="sort" defaultValue={filters.sortKey} className={FIELD_CLASS}>
            {Object.entries(pick(SORT_LABELS, Object.values(SORT_KEYS))).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded bg-slate-800 px-3 py-1 text-sm text-white dark:bg-slate-200 dark:text-slate-900">
          Apply
        </button>
        <Link href={DASHBOARD_PATH} className="py-1 text-sm underline">
          Reset
        </Link>
        <span className="py-1 text-xs text-slate-500" aria-live="polite">
          {isPending ? "Updating..." : ""}
        </span>
      </div>
      <details open={hasMoreFilters(filters)} className="mt-2">
        <summary className="cursor-pointer text-sm underline">More filters</summary>
        <MoreFilters filters={filters} days={days} />
      </details>
    </form>
  );
}
