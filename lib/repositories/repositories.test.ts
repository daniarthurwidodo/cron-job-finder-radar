import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import { COUNTRY_CODES, JOB_STATUSES, SENIORITIES, WORK_MODES } from "@/lib/constants";
import { migrateUp } from "@/lib/migrations";
import { CompanyRepository } from "@/lib/repositories/companyRepository";
import { JobRepository, type JobInsert } from "@/lib/repositories/jobRepository";
import { JobSourceRepository } from "@/lib/repositories/jobSourceRepository";
import { ScrapeRunRepository } from "@/lib/repositories/scrapeRunRepository";

function createDb(): Database.Database {
  const db = new Database(":memory:");
  migrateUp(db);
  return db;
}

function buildJobInsert(companyId: number): JobInsert {
  return {
    companyId,
    title: "Senior Node.js Developer",
    city: "Singapore",
    countryCode: COUNTRY_CODES.SINGAPORE,
    workModeCode: WORK_MODES.HYBRID,
    seniorityCode: SENIORITIES.SENIOR,
    description: "Build APIs",
    postedAt: null,
    dedupHash: "hash-1",
    currencyCode: "SGD",
    salaryMinMonthlyMinor: 800000,
    salaryMaxMonthlyMinor: null,
    stackMatchScore: 17,
    hasVisaSponsorship: 1,
    techTags: ["Node.js", "TypeScript"],
  };
}

test("company insert then find by normalized name", () => {
  const companies = new CompanyRepository(createDb());
  const id = companies.insert({ name: "Acme Pte Ltd", nameNormalized: "acme pte ltd" });
  assert.equal(companies.findIdByNormalizedName("acme pte ltd"), id);
  assert.equal(companies.findIdByNormalizedName("other"), undefined);
});

test("job insert then read back with lookup codes and tags", () => {
  const db = createDb();
  const companyId = new CompanyRepository(db).insert({ name: "Acme", nameNormalized: "acme" });
  const jobs = new JobRepository(db);
  const jobId = jobs.insert(buildJobInsert(companyId));
  assert.deepEqual(jobs.findById(jobId), {
    id: jobId,
    title: "Senior Node.js Developer",
    city: "Singapore",
    countryCode: COUNTRY_CODES.SINGAPORE,
    workModeCode: WORK_MODES.HYBRID,
    seniorityCode: SENIORITIES.SENIOR,
    statusCode: JOB_STATUSES.DISCOVERED,
    stackMatchScore: 17,
    dedupHash: "hash-1",
  });
  assert.deepEqual(jobs.listTechTags(jobId), ["Node.js", "TypeScript"]);
  assert.equal(jobs.findIdByDedupHash("hash-1"), jobId);
});

test("job insert fails loudly on an unknown lookup code", () => {
  const db = createDb();
  const jobs = new JobRepository(db);
  assert.throws(() => jobs.insert({ ...buildJobInsert(1), workModeCode: "unknown" }));
});

test("job source insert, find by url and touch", () => {
  const sources = new JobSourceRepository(createDb());
  sources.insert({ jobId: 7, sourceCode: "mcf", sourceJobId: "abc", sourceUrl: "https://x.test/job/abc" });
  assert.equal(sources.findJobIdBySourceUrl("https://x.test/job/abc"), 7);
  assert.equal(sources.countByJobId(7), 1);
  sources.touch("https://x.test/job/abc");
  assert.equal(sources.findJobIdBySourceUrl("https://x.test/other"), undefined);
});

test("scrape run start then finish records counts", () => {
  const runs = new ScrapeRunRepository(createDb());
  const id = runs.start("mcf");
  runs.finish({ id, counts: { found: 5, inserted: 2, duplicates: 1, filtered: 1, invalid: 1 }, errorMessage: null });
  const run = runs.findById(id);
  assert.equal(run?.found, 5);
  assert.equal(run?.inserted, 2);
  assert.equal(run?.errorMessage, null);
  assert.ok(run?.finishedAt);
});

test("job insert stores the visa sponsorship flag", () => {
  const db = createDb();
  const companyId = new CompanyRepository(db).insert({ name: "Acme", nameNormalized: "acme" });
  const jobId = new JobRepository(db).insert(buildJobInsert(companyId));
  const row = db.prepare("SELECT has_visa_sponsorship AS flag FROM jobs WHERE id = ?").get(jobId) as { flag: number };
  assert.equal(row.flag, 1);
});
