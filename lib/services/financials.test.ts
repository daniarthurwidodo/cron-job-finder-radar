import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import { COUNTRY_CODES, SALARY_PERIODS, SOURCE_CODES, WORK_MODES } from "@/lib/constants";
import { toRatesToIdr } from "@/lib/fx/exchangeRateClient";
import { migrateUp } from "@/lib/migrations";
import { ColBenchmarkRepository } from "@/lib/repositories/colBenchmarkRepository";
import { CompanyRepository } from "@/lib/repositories/companyRepository";
import { ExchangeRateRepository } from "@/lib/repositories/exchangeRateRepository";
import { JobRepository } from "@/lib/repositories/jobRepository";
import { JobSourceRepository } from "@/lib/repositories/jobSourceRepository";
import { ExchangeRateService } from "@/lib/services/exchangeRateService";
import { computeFinancialEstimate } from "@/lib/services/financialEstimate";
import { FinancialService } from "@/lib/services/financialService";
import { IngestService } from "@/lib/services/ingestService";
import { calculatePriorityScore } from "@/lib/services/priorityScore";
import type { RawJob } from "@/lib/types";

const SGD_RATE_TO_IDR = 12000;
const SG_GROSS_MONTHLY_MINOR = 1000000;
const SG_COL_MONTHLY_MINOR = 490000;

function buildRawJob(overrides: Partial<RawJob> = {}): RawJob {
  return {
    sourceCode: SOURCE_CODES.MYCAREERSFUTURE,
    sourceJobId: "abc",
    sourceUrl: "https://www.mycareersfuture.gov.sg/job/abc",
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
    salaryMin: 10000,
    salaryMax: 12000,
    salaryPeriod: SALARY_PERIODS.MONTHLY,
    ...overrides,
  };
}

function buildWorld() {
  const db = new Database(":memory:");
  migrateUp(db);
  const jobs = new JobRepository(db);
  const exchangeRates = new ExchangeRateRepository(db);
  const colBenchmarks = new ColBenchmarkRepository(db);
  const runInTransaction = <T>(work: () => T): T => db.transaction(work)();
  const ingest = new IngestService({
    companies: new CompanyRepository(db),
    jobs,
    jobSources: new JobSourceRepository(db),
    runInTransaction,
  });
  const financials = new FinancialService({ jobs, exchangeRates, colBenchmarks, runInTransaction });
  return { db, jobs, exchangeRates, colBenchmarks, ingest, financials };
}

test("toRatesToIdr converts USD-based rates to IDR per currency", () => {
  const rates = toRatesToIdr({ IDR: 16000, SGD: 1.25, MYR: 4, NZD: 1.6 });
  assert.equal(rates.SGD, 12800);
  assert.equal(rates.MYR, 4000);
  assert.equal(rates.USD, 16000);
  assert.throws(() => toRatesToIdr({ IDR: 16000, SGD: 1.25 }));
  assert.throws(() => toRatesToIdr({ SGD: 1.25, MYR: 4, NZD: 1.6 }));
});

test("offline refresh keeps the cached rate", async () => {
  const { exchangeRates } = buildWorld();
  const online = new ExchangeRateService(exchangeRates, async () => ({ SGD: SGD_RATE_TO_IDR }));
  assert.equal(await online.refresh(), true);
  const offline = new ExchangeRateService(exchangeRates, async () => {
    throw new Error("network down");
  });
  assert.equal(await offline.refresh(), false);
  assert.equal(exchangeRates.list()[0].rateToIdr, SGD_RATE_TO_IDR);
});

test("computeFinancialEstimate: SG SGD 10,000/month, col 4,900", () => {
  const estimate = computeFinancialEstimate({
    countryCode: COUNTRY_CODES.SINGAPORE,
    grossMonthlyMinor: SG_GROSS_MONTHLY_MINOR,
    colMonthlyMinor: SG_COL_MONTHLY_MINOR,
    rateToIdr: SGD_RATE_TO_IDR,
  });
  assert.ok(estimate.taxMonthlyIdr > 0);
  assert.equal(estimate.grossMonthlyIdr, 120000000);
  assert.equal(estimate.colMonthlyIdr, 58800000);
  assert.equal(estimate.grossMonthlyIdr - estimate.taxMonthlyIdr - estimate.colMonthlyIdr, estimate.netSavingsMonthlyIdr);
  assert.throws(() => computeFinancialEstimate({ countryCode: "SG", grossMonthlyMinor: 1, colMonthlyMinor: 1, rateToIdr: 0 }));
});

test("priority score ranks SG savings job above a no-salary NZ job", () => {
  const strong = calculatePriorityScore({
    countryCode: COUNTRY_CODES.SINGAPORE,
    workModeCode: WORK_MODES.FULL_TIME,
    stackMatchScore: 60,
    isMncOrAccredited: false,
    netSavingsMonthlyIdr: 30000000,
  });
  const weak = calculatePriorityScore({
    countryCode: COUNTRY_CODES.NEW_ZEALAND,
    workModeCode: WORK_MODES.FLEXIBLE,
    stackMatchScore: 60,
    isMncOrAccredited: false,
    netSavingsMonthlyIdr: null,
  });
  assert.ok(strong > weak);
  assert.ok(strong <= 100 && weak >= 0);
});

test("no salary is not penalised: same job scores equal with or without a salary-driven zero", () => {
  const base = {
    countryCode: COUNTRY_CODES.SINGAPORE,
    workModeCode: WORK_MODES.FULL_TIME,
    stackMatchScore: 60,
    isMncOrAccredited: false,
  };
  const noSalary = calculatePriorityScore({ ...base, netSavingsMonthlyIdr: null });
  const zeroSavings = calculatePriorityScore({ ...base, netSavingsMonthlyIdr: 0 });
  assert.ok(noSalary > zeroSavings);
});

test("recalculateAll fills IDR estimates; changing a benchmark changes savings", () => {
  const { jobs, exchangeRates, colBenchmarks, ingest, financials } = buildWorld();
  exchangeRates.upsert({ currencyCode: "SGD", rateToIdr: SGD_RATE_TO_IDR });
  ingest.ingest([buildRawJob()]);
  const jobId = jobs.listFinancialInputs()[0].id;
  assert.deepEqual(financials.recalculateAll(), { total: 1, estimated: 1 });
  const before = jobs.findFinancials(jobId);
  assert.ok(before?.netSavingsMonthlyIdr);
  colBenchmarks.updateMonthly({ countryCode: COUNTRY_CODES.SINGAPORE, monthlyMinor: SG_COL_MONTHLY_MINOR + 100000 });
  financials.recalculateAll();
  const after = jobs.findFinancials(jobId);
  assert.equal(before.netSavingsMonthlyIdr - after!.netSavingsMonthlyIdr!, 12000000);
});

test("jobs without salary or rate stay listed with null estimates", () => {
  const { jobs, exchangeRates, ingest, financials } = buildWorld();
  ingest.ingest([buildRawJob({ salaryMin: null, salaryMax: null })]);
  assert.deepEqual(financials.recalculateAll(), { total: 1, estimated: 0 });
  const jobId = jobs.listFinancialInputs()[0].id;
  assert.equal(jobs.findFinancials(jobId)?.netSavingsMonthlyIdr, null);
  exchangeRates.upsert({ currencyCode: "SGD", rateToIdr: SGD_RATE_TO_IDR });
  assert.equal(financials.recalculateAll().estimated, 0);
});
