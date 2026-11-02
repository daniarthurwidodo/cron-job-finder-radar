import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import { COUNTRY_CODES, DOCUMENT_KINDS, SALARY_PERIODS } from "@/lib/constants";
import { buildServices } from "@/lib/container";
import { DocumentService } from "@/lib/cv/documentService";
import { FIXTURE_CV } from "@/lib/cv/testFixture";
import { migrateUp } from "@/lib/migrations";
import { DocumentRepository } from "@/lib/repositories/documentRepository";
import { JobRepository } from "@/lib/repositories/jobRepository";
import { WorkAuthorizationRepository } from "@/lib/repositories/workAuthorizationRepository";
import type { RawJob } from "@/lib/types";

const CHARACTERS_PER_FAKE_PAGE = 1200;

function buildRawJob(): RawJob {
  return {
    sourceCode: "mycareersfuture",
    sourceJobId: "a",
    sourceUrl: "https://x.test/a",
    title: "Senior Full Stack Developer",
    companyName: "Globex Pte Ltd",
    city: "Singapore",
    countryCode: COUNTRY_CODES.SINGAPORE,
    currencyCode: "SGD",
    descriptionHtml: "<p>Node.js and PostgreSQL with Docker</p>",
    postedAt: null,
    employmentTypes: ["Permanent"],
    positionLevels: ["Senior Executive"],
    flexibleWorkArrangements: [],
    skills: [],
    salaryMin: 9000,
    salaryMax: 10000,
    salaryPeriod: SALARY_PERIODS.MONTHLY,
  };
}

function buildWorld({ charactersPerPage, cvMarkdown }: { charactersPerPage: number; cvMarkdown: string }) {
  const db = new Database(":memory:");
  migrateUp(db);
  const services = buildServices(db);
  services.ingest.ingest([buildRawJob()]);
  const jobId = (db.prepare("SELECT MAX(id) AS id FROM jobs").get() as { id: number }).id;
  const documents = new DocumentRepository(db);
  const service = new DocumentService({
    jobs: new JobRepository(db),
    documents,
    workAuthorizations: new WorkAuthorizationRepository(db),
    loadReferenceCvMarkdown: () => cvMarkdown,
    renderPdf: async (html) => ({ pdf: Buffer.from("pdf"), pageCount: Math.ceil(html.length / charactersPerPage) }),
  });
  return { db, jobId, documents, service };
}

test("generateForJob stores a CV and a letter; regenerating replaces them", async () => {
  const world = buildWorld({ charactersPerPage: CHARACTERS_PER_FAKE_PAGE * 100, cvMarkdown: FIXTURE_CV });
  await world.service.generateForJob(world.jobId);
  await world.service.generateForJob(world.jobId);
  const stored = world.service.getDocuments(world.jobId);
  assert.deepEqual(stored.map((document) => document.kind), [DOCUMENT_KINDS.CV, DOCUMENT_KINDS.COVER_LETTER]);
  const cv = stored[0].content;
  assert.ok(cv.includes("Work authorization: Open to relocation to Singapore"));
  assert.ok(cv.includes("Node.js"));
  assert.ok(stored[1].content.includes("Globex Pte Ltd"));
});

test("the CV is compacted level by level until it fits two pages", async () => {
  const manyBullets = Array.from({ length: 12 }, (_, index) => `  - Build feature ${index} with Next.js`).join("\n");
  const longCv = FIXTURE_CV.replace("  - Build deployment pipeline for the website", `${manyBullets}\n  - Build deployment pipeline for the website`);
  const world = buildWorld({ charactersPerPage: CHARACTERS_PER_FAKE_PAGE, cvMarkdown: longCv });
  const countBullets = (html: string): number => html.split("<li>").length - 1;
  const service = new DocumentService({
    jobs: new JobRepository(world.db),
    documents: world.documents,
    workAuthorizations: new WorkAuthorizationRepository(world.db),
    loadReferenceCvMarkdown: () => longCv,
    renderPdf: async (html) => ({ pdf: Buffer.from("pdf"), pageCount: countBullets(html) > 6 ? 3 : 2 }),
  });
  await service.generateForJob(world.jobId);
  const cv = world.documents.find({ jobId: world.jobId, kind: DOCUMENT_KINDS.CV })!.content;
  assert.ok(cv.split("\n").filter((line) => line.startsWith("- ")).length <= 6 + 1);
  assert.ok(cv.includes("Certifications"));
});

test("a CV that never fits two pages is rejected, not stored", async () => {
  const world = buildWorld({ charactersPerPage: CHARACTERS_PER_FAKE_PAGE, cvMarkdown: FIXTURE_CV });
  const service = new DocumentService({
    jobs: new JobRepository(world.db),
    documents: world.documents,
    workAuthorizations: new WorkAuthorizationRepository(world.db),
    loadReferenceCvMarkdown: () => FIXTURE_CV,
    renderPdf: async () => ({ pdf: Buffer.from("pdf"), pageCount: 5 }),
  });
  await assert.rejects(service.generateForJob(world.jobId), /5 pages/);
  assert.equal(world.service.getDocuments(world.jobId).length, 0);
});

test("generation fails loudly when the reference CV is invalid", async () => {
  const world = buildWorld({ charactersPerPage: CHARACTERS_PER_FAKE_PAGE, cvMarkdown: "# Only A Name\n" });
  await assert.rejects(world.service.generateForJob(world.jobId), /Email/);
  assert.equal(world.service.getDocuments(world.jobId).length, 0);
});

test("buildFileName follows Firstname-Lastname-CV-Company with safe characters", () => {
  const world = buildWorld({ charactersPerPage: CHARACTERS_PER_FAKE_PAGE, cvMarkdown: FIXTURE_CV });
  assert.equal(world.service.buildFileName({ jobId: world.jobId, kind: DOCUMENT_KINDS.CV, extension: "pdf" }), "Jane-Example-CV-Globex-Pte-Ltd.pdf");
  assert.equal(world.service.buildFileName({ jobId: world.jobId, kind: DOCUMENT_KINDS.COVER_LETTER, extension: "txt" }), "Jane-Example-Cover-Letter-Globex-Pte-Ltd.txt");
});
