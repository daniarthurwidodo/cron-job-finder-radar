import Link from "next/link";
import { DASHBOARD_PATH } from "@/lib/constants";
import { buildFilterQuery, type JobFilters } from "@/lib/dashboard/filters";

const LINK_CLASS = "rounded border border-slate-400 px-3 py-1 text-sm";
const DISABLED_CLASS = "rounded border border-slate-200 px-3 py-1 text-sm text-slate-400 dark:border-slate-800";

function pageHref({ filters, page }: { filters: JobFilters; page: number }): string {
  const query = buildFilterQuery({ filters, page });
  return query ? `${DASHBOARD_PATH}?${query}` : DASHBOARD_PATH;
}

export function Pagination({ filters, page, pageCount, totalCount }: { filters: JobFilters; page: number; pageCount: number; totalCount: number }) {
  const hasPrevious = page > 1;
  const hasNext = page < pageCount;
  return (
    <nav className="my-3 flex items-center gap-3" aria-label="Pagination">
      {hasPrevious ? (
        <Link href={pageHref({ filters, page: page - 1 })} className={LINK_CLASS}>
          Previous
        </Link>
      ) : (
        <span className={DISABLED_CLASS}>Previous</span>
      )}
      <span className="text-sm">
        Page {page} of {pageCount} ({totalCount} jobs)
      </span>
      {hasNext ? (
        <Link href={pageHref({ filters, page: page + 1 })} className={LINK_CLASS}>
          Next
        </Link>
      ) : (
        <span className={DISABLED_CLASS}>Next</span>
      )}
    </nav>
  );
}
