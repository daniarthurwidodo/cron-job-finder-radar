import type Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { REFERENCE_CV_PATH } from "@/lib/constants";
import { DocumentService } from "@/lib/cv/documentService";
import { renderPdf } from "@/lib/cv/renderPdf";
import { DocumentRepository } from "@/lib/repositories/documentRepository";
import { WorkAuthorizationRepository } from "@/lib/repositories/workAuthorizationRepository";
import { getDb } from "@/lib/db";
import { ColBenchmarkRepository } from "@/lib/repositories/colBenchmarkRepository";
import { CompanyRepository } from "@/lib/repositories/companyRepository";
import { ExchangeRateRepository } from "@/lib/repositories/exchangeRateRepository";
import { JobQueryRepository } from "@/lib/repositories/jobQueryRepository";
import { JobRepository } from "@/lib/repositories/jobRepository";
import { JobSourceRepository } from "@/lib/repositories/jobSourceRepository";
import { ScrapeRunRepository } from "@/lib/repositories/scrapeRunRepository";
import { DashboardService } from "@/lib/services/dashboardService";
import { ExchangeRateService } from "@/lib/services/exchangeRateService";
import { FinancialService } from "@/lib/services/financialService";
import { IngestService } from "@/lib/services/ingestService";
import { fetchRatesToIdr } from "@/lib/fx/exchangeRateClient";

export function buildServices(db: Database.Database) {
  const jobs = new JobRepository(db);
  const exchangeRates = new ExchangeRateRepository(db);
  const scrapeRuns = new ScrapeRunRepository(db);
  const runInTransaction = <T>(work: () => T): T => db.transaction(work)();
  const financials = new FinancialService({
    jobs,
    exchangeRates,
    colBenchmarks: new ColBenchmarkRepository(db),
    runInTransaction,
  });
  return {
    scrapeRuns,
    financials,
    exchangeRateService: new ExchangeRateService(exchangeRates, fetchRatesToIdr),
    ingest: new IngestService({
      companies: new CompanyRepository(db),
      jobs,
      jobSources: new JobSourceRepository(db),
      runInTransaction,
    }),
    documents: new DocumentService({
      jobs,
      documents: new DocumentRepository(db),
      workAuthorizations: new WorkAuthorizationRepository(db),
      loadReferenceCvMarkdown: () => fs.readFileSync(path.join(process.cwd(), REFERENCE_CV_PATH), "utf8"),
      renderPdf,
    }),
    dashboard: new DashboardService({
      jobQueries: new JobQueryRepository(db),
      scrapeRuns,
      colBenchmarks: new ColBenchmarkRepository(db),
      financials,
      workAuthorizations: new WorkAuthorizationRepository(db),
    }),
  };
}

export function getServices() {
  return buildServices(getDb());
}
