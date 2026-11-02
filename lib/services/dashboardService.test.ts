import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import { COUNTRY_CODES, JOB_STATUSES, LIST_PAGE_SIZE, SALARY_PERIODS, SORT_KEYS } from "@/lib/constants";
import { buildServices } from "@/lib/container";
import { buildFilterQuery, parseCompareIds, parseJobFilters } from "@/lib/dashboard/filters";
import { migrateUp } from "@/lib/migrations";
import { ExchangeRateRepository } from "@/lib/repositories/exchangeRateRepository";
import type { RawJob } from "@/lib/types";

const LATEST_DAY = "2026-11-02";
const PREVIOUS_DAY = "2026-11-01";
const SGD_RATE = 12000;

function buildRawJob(overrides: Partial<RawJob>): RawJob {
  return {
    sourceCode: "mycareersfuture",
    sourceJobId: "id",
    sourceUrl: "https://x.test/job/id",
    title: "Senior Full Stack Developer",
    companyName: "Acme",
    city: "Singapore",
    countryCode: COUNTRY_CODES.SINGAPORE,
    currencyCode: "SGD",
    descriptionHtml: "<p>Node.js TypeScript</p>",
    postedAt: null,
    employmentTypes: ["Permanent"],
    positionLevels: ["Senior Executive"],
    flexibleWorkArrangements: [],
    skills: [],
    salaryMin: 8000,
    salaryMax: 9000,
    salaryPeriod: SALARY_PERIODS.MONTHLY,
    ...overrides,
  };
}

function buildWorld() {
  const db = new Database(":memory:");
  migrateUp(db);
  const services = buildServices(db);
  const run = services.scrapeRuns.start("mycareersfuture");
  services.scrapeRuns.finish({ id: run, counts: { found: 0, inserted: 0, duplicates: 0, filtered: 0, invalid: 0 }, errorMessage: null });
  db.prepare("UPDATE scrape_runs SET started_at = ?").run(`${LATEST_DAY}T00:00:00.000Z`);
  return { db, ...services, exchangeRates: new ExchangeRateRepository(db) };
}

function addJob({ world, job, day }: { world: ReturnType<typeof buildWorld>; job: Partial<RawJob>; day: string }): number {
  world.ingest.ingest([buildRawJob(job)]);
  const row = world.db.prepare("SELECT MAX(id) AS id FROM jobs").get() as { id: number };
  world.db.prepare("UPDATE jobs SET created_at = ? WHERE id = ?").run(`${day} 08:00:00`, row.id);
  return row.id;
}

function titles(world: ReturnType<typeof buildWorld>, query: string): string[] {
  const params = Object.fromEntries(new URLSearchParams(query));
  return world.dashboard.getHome(parseJobFilters(params)).jobs.map((job) => job.title);
}

test("main list shows only jobs first saved on the latest run day", () => {
  const world = buildWorld();
  addJob({ world, job: { sourceJobId: "a", sourceUrl: "https://x.test/a", title: "Dev Today Web Developer" }, day: LATEST_DAY });
  addJob({ world, job: { sourceJobId: "b", sourceUrl: "https://x.test/b", title: "Dev Yesterday Web Developer" }, day: PREVIOUS_DAY });
  assert.deepEqual(titles(world, ""), ["Dev Today Web Developer"]);
});

test("tracked jobs stay visible; rejected and archived are hidden", () => {
  const world = buildWorld();
  const old = (sourceJobId: string, title: string) =>
    addJob({ world, job: { sourceJobId, sourceUrl: `https://x.test/${sourceJobId}`, title }, day: PREVIOUS_DAY });
  const bookmarked = old("a", "Old Bookmarked Web Developer");
  const untouched = old("b", "Old Untouched Web Developer");
  const rejected = old("c", "Old Rejected Web Developer");
  world.dashboard.changeStatus({ jobId: bookmarked, statusCode: JOB_STATUSES.BOOKMARKED });
  world.dashboard.changeStatus({ jobId: rejected, statusCode: JOB_STATUSES.REJECTED });
  assert.ok(untouched);
  assert.deepEqual(titles(world, ""), ["Old Bookmarked Web Developer"]);
  addJob({ world, job: { sourceJobId: "d", sourceUrl: "https://x.test/d", title: "New Rejected Web Developer" }, day: LATEST_DAY });
  const newRejected = (world.db.prepare("SELECT MAX(id) AS id FROM jobs").get() as { id: number }).id;
  world.dashboard.changeStatus({ jobId: newRejected, statusCode: JOB_STATUSES.ARCHIVED });
  assert.deepEqual(titles(world, ""), ["Old Bookmarked Web Developer"]);
});

test("a missed run day does not empty the list: day follows the latest run, not the clock", () => {
  const world = buildWorld();
  addJob({ world, job: { sourceJobId: "a", sourceUrl: "https://x.test/a", title: "Last Run Job Web Developer" }, day: LATEST_DAY });
  const home = world.dashboard.getHome(parseJobFilters({}));
  assert.equal(home.day, LATEST_DAY);
  assert.equal(home.jobs.length, 1);
});

test("history view shows only the picked day, any status", () => {
  const world = buildWorld();
  addJob({ world, job: { sourceJobId: "a", sourceUrl: "https://x.test/a", title: "Yesterday Job Web Developer" }, day: PREVIOUS_DAY });
  addJob({ world, job: { sourceJobId: "b", sourceUrl: "https://x.test/b", title: "Today Job Web Developer" }, day: LATEST_DAY });
  assert.deepEqual(titles(world, `day=${PREVIOUS_DAY}`), ["Yesterday Job Web Developer"]);
  assert.deepEqual(world.dashboard.getHome(parseJobFilters({ day: PREVIOUS_DAY })).days, [LATEST_DAY, PREVIOUS_DAY]);
});

test("jobs from different boards follow the same rule", () => {
  const world = buildWorld();
  addJob({ world, job: { sourceCode: "mycareersfuture", sourceJobId: "a", sourceUrl: "https://x.test/a", title: "MCF Job Web Developer" }, day: LATEST_DAY });
  addJob({ world, job: { sourceCode: "michaelpage_sg", sourceJobId: "b", sourceUrl: "https://mp.test/b", title: "MP Job Web Developer", companyName: "MP Client" }, day: LATEST_DAY });
  assert.deepEqual(titles(world, "sort=newest").sort(), ["MCF Job Web Developer", "MP Job Web Developer"]);
});

test("filters, search (with LIKE characters escaped) and savings sort with missing salary last", () => {
  const world = buildWorld();
  world.exchangeRates.upsert({ currencyCode: "SGD", rateToIdr: SGD_RATE });
  addJob({ world, job: { sourceJobId: "a", sourceUrl: "https://x.test/a", title: "Low Pay Dev Web Developer", salaryMin: 6000 }, day: LATEST_DAY });
  addJob({ world, job: { sourceJobId: "b", sourceUrl: "https://x.test/b", title: "High Pay Dev Web Developer", companyName: "Rich 100% Co", salaryMin: 12000 }, day: LATEST_DAY });
  addJob({ world, job: { sourceJobId: "c", sourceUrl: "https://x.test/c", title: "No Pay Dev Web Developer", salaryMin: null, salaryMax: null }, day: LATEST_DAY });
  world.financials.recalculateAll();
  assert.deepEqual(titles(world, `sort=${SORT_KEYS.SAVINGS}`), ["High Pay Dev Web Developer", "Low Pay Dev Web Developer", "No Pay Dev Web Developer"]);
  assert.deepEqual(titles(world, "q=100%25"), ["High Pay Dev Web Developer"]);
  assert.deepEqual(titles(world, "q=%25"), ["High Pay Dev Web Developer"]);
  assert.deepEqual(titles(world, "country=NZ"), []);
  assert.equal(titles(world, "country=SG&seniority=senior").length, 3);
});

test("list is paginated at 50 per page; page is clamped and filters keep working", () => {
  const world = buildWorld();
  const total = LIST_PAGE_SIZE * 2 + 3;
  for (let index = 0; index < total; index += 1) {
    addJob({ world, job: { sourceJobId: `j${index}`, sourceUrl: `https://x.test/j${index}`, title: `Web Developer ${index}` }, day: LATEST_DAY });
  }
  const first = world.dashboard.getHome(parseJobFilters({ sort: SORT_KEYS.NEWEST }));
  const third = world.dashboard.getHome(parseJobFilters({ sort: SORT_KEYS.NEWEST, page: "3" }));
  const beyond = world.dashboard.getHome(parseJobFilters({ sort: SORT_KEYS.NEWEST, page: "99" }));
  assert.equal(first.jobs.length, LIST_PAGE_SIZE);
  assert.equal(first.totalCount, total);
  assert.equal(first.pageCount, 3);
  assert.equal(third.jobs.length, 3);
  assert.equal(beyond.page, 3);
  const firstIds = new Set(first.jobs.map((job) => job.id));
  assert.ok(third.jobs.every((job) => !firstIds.has(job.id)));
});

test("ascending and descending order; jobs without a salary stay last both ways", () => {
  const world = buildWorld();
  world.exchangeRates.upsert({ currencyCode: "SGD", rateToIdr: SGD_RATE });
  addJob({ world, job: { sourceJobId: "a", sourceUrl: "https://x.test/a", title: "Low Web Developer", salaryMin: 6000 }, day: LATEST_DAY });
  addJob({ world, job: { sourceJobId: "b", sourceUrl: "https://x.test/b", title: "High Web Developer", salaryMin: 12000 }, day: LATEST_DAY });
  addJob({ world, job: { sourceJobId: "c", sourceUrl: "https://x.test/c", title: "None Web Developer", salaryMin: null, salaryMax: null }, day: LATEST_DAY });
  world.financials.recalculateAll();
  assert.deepEqual(titles(world, "sort=savings"), ["High Web Developer", "Low Web Developer", "None Web Developer"]);
  assert.deepEqual(titles(world, "sort=savings&dir=desc"), ["High Web Developer", "Low Web Developer", "None Web Developer"]);
  assert.deepEqual(titles(world, "sort=savings&dir=asc"), ["Low Web Developer", "High Web Developer", "None Web Developer"]);
  assert.deepEqual(titles(world, "sort=newest&dir=asc"), ["Low Web Developer", "High Web Developer", "None Web Developer"]);
  assert.deepEqual(titles(world, "sort=newest"), ["None Web Developer", "High Web Developer", "Low Web Developer"]);
  assert.equal(parseJobFilters({ dir: "sideways" }).direction, "desc");
  const ascending = parseJobFilters({ sort: "savings", dir: "asc" });
  assert.equal(buildFilterQuery({ filters: ascending, page: 2 }), "sort=savings&dir=asc&page=2");
});

test("column filters: work mode, salary disclosed, and minimum savings / stack / priority", () => {
  const world = buildWorld();
  world.exchangeRates.upsert({ currencyCode: "SGD", rateToIdr: SGD_RATE });
  addJob({ world, job: { sourceJobId: "a", sourceUrl: "https://x.test/a", title: "Rich Web Developer", salaryMin: 12000, descriptionHtml: "<p>Hybrid. Node.js TypeScript Angular</p>" }, day: LATEST_DAY });
  addJob({ world, job: { sourceJobId: "b", sourceUrl: "https://x.test/b", title: "Poor Web Developer", salaryMin: 6000 }, day: LATEST_DAY });
  addJob({ world, job: { sourceJobId: "c", sourceUrl: "https://x.test/c", title: "Hidden Web Developer", salaryMin: null, salaryMax: null }, day: LATEST_DAY });
  world.financials.recalculateAll();
  const sorted = (query: string): string[] => titles(world, `${query}&sort=newest`).sort();
  assert.deepEqual(sorted("workMode=hybrid"), ["Rich Web Developer"]);
  assert.deepEqual(sorted("salary=yes"), ["Poor Web Developer", "Rich Web Developer"]);
  assert.deepEqual(sorted("salary=no"), ["Hidden Web Developer"]);
  assert.deepEqual(sorted("minSavings=50000000"), ["Rich Web Developer"]);
  assert.deepEqual(sorted("minStack=20"), ["Rich Web Developer"]);
  assert.deepEqual(sorted("minPriority=1&minSavings=0"), ["Poor Web Developer", "Rich Web Developer"]);
  assert.deepEqual(sorted("workMode=hybrid&minSavings=999999999999"), []);
});

test("minimum filters ignore bad input, clamp percentages and survive pagination links", () => {
  const filters = parseJobFilters({ minSavings: "-5", minStack: "250", minPriority: "abc", workMode: "bogus", salary: "maybe" });
  assert.equal(filters.minSavingsIdr, undefined);
  assert.equal(filters.minStack, 100);
  assert.equal(filters.minPriority, undefined);
  assert.equal(filters.workModeCode, undefined);
  assert.equal(filters.salary, undefined);
  const kept = parseJobFilters({ workMode: "hybrid", salary: "yes", minSavings: "1000", minStack: "20", minPriority: "5" });
  assert.equal(buildFilterQuery({ filters: kept, page: 2 }), "workMode=hybrid&salary=yes&minSavings=1000&minStack=20&minPriority=5&sort=priority&page=2");
});

test("buildFilterQuery keeps filters and only adds page after the first", () => {
  const filters = parseJobFilters({ q: "node", country: "SG", sort: "savings" });
  assert.equal(buildFilterQuery({ filters, page: 1 }), "q=node&country=SG&sort=savings");
  assert.equal(buildFilterQuery({ filters, page: 2 }), "q=node&country=SG&sort=savings&page=2");
});

test("parseJobFilters ignores unknown values; parseCompareIds caps at four unique ids", () => {
  assert.deepEqual(parseJobFilters({ country: "XX", sort: "bad", day: "yesterday" }), {
    day: undefined,
    countryCode: undefined,
    seniorityCode: undefined,
    statusCode: undefined,
    workModeCode: undefined,
    salary: undefined,
    minSavingsIdr: undefined,
    minStack: undefined,
    minPriority: undefined,
    search: undefined,
    sortKey: SORT_KEYS.PRIORITY,
    direction: "desc",
    page: 1,
  });
  assert.deepEqual(parseCompareIds(["1", "2", "2", "x", "-3", "4", "5", "6"]), [1, 2, 4, 5]);
  assert.deepEqual(parseCompareIds("7,8"), [7, 8]);
  assert.deepEqual(parseCompareIds(undefined), []);
});

test("changeStatus rejects bad input; updating a benchmark recomputes savings", () => {
  const world = buildWorld();
  world.exchangeRates.upsert({ currencyCode: "SGD", rateToIdr: SGD_RATE });
  const jobId = addJob({ world, job: { sourceJobId: "a", sourceUrl: "https://x.test/a" }, day: LATEST_DAY });
  world.financials.recalculateAll();
  const before = world.dashboard.getCompareJobs([jobId])[0].netSavingsMonthlyIdr ?? 0;
  assert.throws(() => world.dashboard.changeStatus({ jobId, statusCode: "nope" }));
  assert.throws(() => world.dashboard.changeStatus({ jobId: 9999, statusCode: JOB_STATUSES.APPLIED }));
  assert.throws(() => world.dashboard.updateColBenchmark({ countryCode: "SG", monthlyMajor: -5 }));
  assert.throws(() => world.dashboard.updateColBenchmark({ countryCode: "SG", monthlyMajor: Number.NaN }));
  world.dashboard.updateColBenchmark({ countryCode: "SG", monthlyMajor: 5900 });
  const after = world.dashboard.getCompareJobs([jobId])[0].netSavingsMonthlyIdr ?? 0;
  assert.equal(before - after, 12000000);
});

function statusOf(world: ReturnType<typeof buildWorld>, jobId: number): string {
  const row = world.db.prepare("SELECT js.code AS code FROM jobs j JOIN job_statuses js ON js.id = j.status_id WHERE j.id = ?").get(jobId) as { code: string };
  return row.code;
}

test("changeStatuses updates every selected job and ignores duplicates and unknown ids", () => {
  const world = buildWorld();
  const first = addJob({ world, job: { sourceJobId: "a", sourceUrl: "https://x.test/a", title: "Bulk First Web Developer" }, day: LATEST_DAY });
  const second = addJob({ world, job: { sourceJobId: "b", sourceUrl: "https://x.test/b", title: "Bulk Second Web Developer" }, day: LATEST_DAY });
  const untouched = addJob({ world, job: { sourceJobId: "c", sourceUrl: "https://x.test/c", title: "Bulk Untouched Web Developer" }, day: LATEST_DAY });
  const updated = world.dashboard.changeStatuses({ jobIds: [first, second, second, 9999], statusCode: JOB_STATUSES.INTERVIEWING });
  assert.equal(updated, 2);
  assert.equal(statusOf(world, first), JOB_STATUSES.INTERVIEWING);
  assert.equal(statusOf(world, second), JOB_STATUSES.INTERVIEWING);
  assert.notEqual(statusOf(world, untouched), JOB_STATUSES.INTERVIEWING);
});

test("changeStatuses rejects empty, oversized, invalid ids and unknown status", () => {
  const world = buildWorld();
  const jobId = addJob({ world, job: { sourceJobId: "a", sourceUrl: "https://x.test/a" }, day: LATEST_DAY });
  assert.throws(() => world.dashboard.changeStatuses({ jobIds: [], statusCode: JOB_STATUSES.INTERVIEWING }));
  assert.throws(() => world.dashboard.changeStatuses({ jobIds: Array.from({ length: LIST_PAGE_SIZE + 1 }, (_, index) => index + 1), statusCode: JOB_STATUSES.INTERVIEWING }));
  assert.throws(() => world.dashboard.changeStatuses({ jobIds: [jobId, Number.NaN], statusCode: JOB_STATUSES.INTERVIEWING }));
  assert.throws(() => world.dashboard.changeStatuses({ jobIds: [jobId], statusCode: "nope" }));
  assert.notEqual(statusOf(world, jobId), JOB_STATUSES.INTERVIEWING);
});
