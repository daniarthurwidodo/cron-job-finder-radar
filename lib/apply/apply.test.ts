import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { chromium } from "playwright-core";
import { ApplyService, removeStaleTempDirs } from "@/lib/apply/applyService";
import { fillApplicationForm, type ApplyProfile, type FillReport } from "@/lib/apply/fillApplicationForm";
import { APPLY_STATES, COUNTRY_CODES, DEFAULT_BROWSER_PATHS, JOB_STATUSES, SALARY_PERIODS, SOURCE_CODES } from "@/lib/constants";
import { buildServices } from "@/lib/container";
import { DocumentService } from "@/lib/cv/documentService";
import { FIXTURE_CV } from "@/lib/cv/testFixture";
import { migrateUp } from "@/lib/migrations";
import { ApplyQueueRepository } from "@/lib/repositories/applyQueueRepository";
import { DocumentRepository } from "@/lib/repositories/documentRepository";
import { JobRepository } from "@/lib/repositories/jobRepository";
import { WorkAuthorizationRepository } from "@/lib/repositories/workAuthorizationRepository";
import type { RawJob } from "@/lib/types";

const BROWSER_PATH = process.env.CHROME_EXECUTABLE_PATH ?? DEFAULT_BROWSER_PATHS[process.platform];
const HAS_BROWSER = Boolean(BROWSER_PATH) && fs.existsSync(BROWSER_PATH);

function buildRawJob(overrides: Partial<RawJob> = {}): RawJob {
  return {
    sourceCode: SOURCE_CODES.MICHAEL_PAGE_SG,
    sourceJobId: "a",
    sourceUrl: "https://www.michaelpage.com.sg/job-detail/x/ref/a",
    title: "Senior Full Stack Developer",
    companyName: "Globex Pte Ltd",
    city: "Singapore",
    countryCode: COUNTRY_CODES.SINGAPORE,
    currencyCode: "SGD",
    descriptionHtml: "<p>Node.js with Docker</p>",
    postedAt: null,
    employmentTypes: ["Permanent"],
    positionLevels: ["Senior Executive"],
    flexibleWorkArrangements: [],
    skills: [],
    salaryMin: 9000,
    salaryMax: 10000,
    salaryPeriod: SALARY_PERIODS.MONTHLY,
    ...overrides,
  };
}

function buildWorld(rawJob: RawJob = buildRawJob()) {
  const db = new Database(":memory:");
  migrateUp(db);
  const services = buildServices(db);
  services.ingest.ingest([rawJob]);
  const jobId = (db.prepare("SELECT MAX(id) AS id FROM jobs").get() as { id: number }).id;
  const documents = new DocumentService({
    jobs: new JobRepository(db),
    documents: new DocumentRepository(db),
    workAuthorizations: new WorkAuthorizationRepository(db),
    loadReferenceCvMarkdown: () => FIXTURE_CV,
    renderPdf: async () => ({ pdf: Buffer.from("%PDF-fake"), pageCount: 2 }),
  });
  const launched: { url: string; shouldFill: boolean; profile: ApplyProfile }[] = [];
  const report: FillReport = { openedUrl: "", clickedApplyLink: false, loginRequired: false, filled: ["email"], uploadedCv: true, notes: [] };
  const apply = new ApplyService({
    queue: new ApplyQueueRepository(db),
    documents,
    loadReferenceCvMarkdown: () => FIXTURE_CV,
    openApplyWindow: async (request) => {
      launched.push(request);
      return report;
    },
  });
  return { db, jobId, apply, documents, launched };
}

function stateOfJob(world: ReturnType<typeof buildWorld>): string | undefined {
  return world.apply.listQueue().find((item) => item.id === world.jobId)?.state;
}

test("default is not queued; queue, skip, re-queue and unqueue move through the states", () => {
  const world = buildWorld();
  assert.deepEqual(world.apply.listQueue(), []);
  world.apply.queueJob(world.jobId);
  assert.equal(stateOfJob(world), APPLY_STATES.NEEDS_DOCUMENTS);
  world.apply.skipJob(world.jobId);
  assert.equal(stateOfJob(world), APPLY_STATES.SKIPPED);
  world.apply.queueJob(world.jobId);
  assert.equal(stateOfJob(world), APPLY_STATES.NEEDS_DOCUMENTS);
  world.apply.unqueueJob(world.jobId);
  assert.deepEqual(world.apply.listQueue(), []);
  assert.throws(() => world.apply.skipJob(world.jobId), /not in the apply queue/);
  assert.throws(() => world.apply.queueJob(9999));
});

test("startApply refuses jobs that are not queued and never runs without the user queueing", async () => {
  const world = buildWorld();
  await assert.rejects(world.apply.startApply(world.jobId), /not in the apply queue/);
  assert.equal(world.launched.length, 0);
});

test("startApply generates missing documents, opens the apply page and pre-fills only supported sources", async () => {
  const world = buildWorld();
  world.apply.queueJob(world.jobId);
  await world.apply.startApply(world.jobId);
  assert.equal(stateOfJob(world), APPLY_STATES.READY);
  const [request] = world.launched;
  assert.equal(request.url, "https://www.michaelpage.com.sg/job-detail/x/ref/a");
  assert.equal(request.shouldFill, true);
  assert.equal(request.profile.firstName, "Jane");
  assert.equal(request.profile.lastName, "Example");
  assert.equal(request.profile.email, "jane.work@example.com");
  assert.ok(request.profile.coverLetter.includes("Globex Pte Ltd"));
  assert.ok(fs.existsSync(request.profile.cvPdfPath));
  assert.ok(path.basename(request.profile.cvPdfPath).startsWith("Jane-Example-CV-Globex"));
  fs.rmSync(path.dirname(request.profile.cvPdfPath), { recursive: true });

  const other = buildWorld(buildRawJob({ sourceCode: SOURCE_CODES.MYCAREERSFUTURE, sourceUrl: "https://www.mycareersfuture.gov.sg/job/x/a" }));
  other.apply.queueJob(other.jobId);
  await other.apply.startApply(other.jobId);
  assert.equal(other.launched[0].shouldFill, false);
  fs.rmSync(path.dirname(other.launched[0].profile.cvPdfPath), { recursive: true });
});

test("confirmApplied sets status Applied; the job cannot be started again", async () => {
  const world = buildWorld();
  world.apply.queueJob(world.jobId);
  world.apply.confirmApplied(world.jobId);
  assert.equal(stateOfJob(world), APPLY_STATES.APPLIED);
  const status = world.db.prepare("SELECT st.code AS code FROM jobs j JOIN job_statuses st ON st.id = j.status_id WHERE j.id = ?").get(world.jobId) as { code: string };
  assert.equal(status.code, JOB_STATUSES.APPLIED);
  await assert.rejects(world.apply.startApply(world.jobId), /already marked as applied/);
});

test("stale temp folders with a CV are removed; fresh ones and other folders are kept", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "radar-root-"));
  const oldDir = path.join(root, "radar-apply-old");
  const freshDir = path.join(root, "radar-apply-fresh");
  const otherDir = path.join(root, "other-old");
  for (const dir of [oldDir, freshDir, otherDir]) fs.mkdirSync(dir);
  const longAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  fs.utimesSync(oldDir, longAgo, longAgo);
  fs.utimesSync(otherDir, longAgo, longAgo);
  assert.equal(removeStaleTempDirs({ rootDir: root, nowMs: Date.now() }), 1);
  assert.deepEqual(fs.readdirSync(root).sort(), ["other-old", "radar-apply-fresh"]);
  fs.rmSync(root, { recursive: true });
});

const FORM_FIXTURE = `<!doctype html><html><body>
  <a id="apply" href="#" onclick="document.getElementById('form').style.display='block';return false;">Apply now</a>
  <form id="form" style="display:none" onsubmit="window.__submitted = true; return false;">
    <label for="fn">First name</label><input id="fn" type="text">
    <label for="ln">Last name</label><input id="ln" type="text">
    <label for="em">Email address</label><input id="em" type="email">
    <label for="ph">Mobile number</label><input id="ph" type="tel">
    <label for="cl">Cover letter</label><textarea id="cl"></textarea>
    <label for="cv">Upload CV</label><input id="cv" type="file">
    <label for="pre">Phone (already filled)</label><input id="pre" type="text" value="keep me">
    <button id="submit" type="submit" onclick="window.__submitClicked = true">Submit application</button>
  </form></body></html>`;

const LOGIN_FIXTURE = `<!doctype html><html><body><form>
  <label for="em">Email</label><input id="em" type="email">
  <label for="pw">Password</label><input id="pw" type="password">
  <button type="submit" onclick="window.__submitClicked = true">Sign in</button></form></body></html>`;

async function runFiller(html: string): Promise<{ report: FillReport; values: Record<string, string>; submitted: boolean; clicked: boolean; fileName: string }> {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "radar-test-"));
  const cvPdfPath = path.join(directory, "Jane-Example-CV-Test.pdf");
  fs.writeFileSync(cvPdfPath, "%PDF-fake");
  const browser = await chromium.launch({ executablePath: BROWSER_PATH, headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html);
    const profile: ApplyProfile = {
      fullName: "Jane Example", firstName: "Jane", lastName: "Example", email: "jane@example.com",
      phone: "+62 812 000", linkedIn: "https://linkedin.com/in/jane", coverLetter: "Dear team", cvPdfPath,
    };
    const report = await fillApplicationForm({ page, profile });
    const read = (id: string): Promise<string> =>
      page.evaluate((elementId) => (document.getElementById(elementId) as HTMLInputElement | null)?.value ?? "", id);
    const values = { fn: await read("fn"), ln: await read("ln"), em: await read("em"), ph: await read("ph"), cl: await read("cl"), pre: await read("pre"), pw: await read("pw") };
    const submitted = await page.evaluate(() => Boolean((window as unknown as { __submitted?: boolean }).__submitted));
    const clicked = await page.evaluate(() => Boolean((window as unknown as { __submitClicked?: boolean }).__submitClicked));
    const fileName = await page.evaluate(() => (document.getElementById("cv") as HTMLInputElement | null)?.files?.[0]?.name ?? "");
    return { report, values, submitted, clicked, fileName };
  } finally {
    await browser.close();
    fs.rmSync(directory, { recursive: true });
  }
}

test("form filler clicks Apply, fills empty fields, uploads the CV and never submits", { skip: !HAS_BROWSER }, async () => {
  const result = await runFiller(FORM_FIXTURE);
  assert.equal(result.report.clickedApplyLink, true);
  assert.deepEqual(result.values, { fn: "Jane", ln: "Example", em: "jane@example.com", ph: "+62 812 000", cl: "Dear team", pre: "keep me", pw: "" });
  assert.equal(result.report.uploadedCv, true);
  assert.equal(result.fileName, "Jane-Example-CV-Test.pdf");
  assert.equal(result.submitted, false);
  assert.equal(result.clicked, false);
});

test("on a login page nothing is filled and no button is clicked", { skip: !HAS_BROWSER }, async () => {
  const result = await runFiller(LOGIN_FIXTURE);
  assert.equal(result.report.loginRequired, true);
  assert.deepEqual(result.report.filled, []);
  assert.equal(result.values.pw, "");
  assert.equal(result.values.em, "");
  assert.equal(result.clicked, false);
});
