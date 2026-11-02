import { connection } from "next/server";
import { FilterBar } from "@/app/dashboard/_components/FilterBar";
import { JobTable } from "@/app/dashboard/_components/JobTable";
import { EmailPanel } from "@/app/dashboard/_components/EmailPanel";
import { Pagination } from "@/app/dashboard/_components/Pagination";
import { ScrapePanel } from "@/app/dashboard/_components/ScrapePanel";
import { FIRST_PAGE } from "@/lib/constants";
import { getServices } from "@/lib/container";
import { buildFilterQuery, parseJobFilters, type RawSearchParams } from "@/lib/dashboard/filters";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await connection();
  const filters = parseJobFilters(await searchParams);
  const home = getServices().dashboard.getHome(filters);
  const filterKey = buildFilterQuery({ filters, page: FIRST_PAGE });
  return (
    <div className="flex flex-col gap-5">
      <ScrapePanel runs={home.runs} newJobsCount={home.totalCount} day={home.day} />
      <EmailPanel />
      <section>
        <h2 className="mb-2 text-lg font-semibold">
          {home.isHistory ? `Jobs first saved on ${home.day}` : `New on ${home.day} + tracked jobs`} ({home.totalCount})
        </h2>
        <FilterBar key={filterKey} filters={filters} days={home.days} />
        <div className="mt-3">
          <JobTable jobs={home.jobs} day={home.day} />
        </div>
        <Pagination filters={filters} page={home.page} pageCount={home.pageCount} totalCount={home.totalCount} />
      </section>
    </div>
  );
}
