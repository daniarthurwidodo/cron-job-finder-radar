import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ApplyProfile, FillReport } from "@/lib/apply/fillApplicationForm";
import type { OpenApplyWindow } from "@/lib/apply/headedBrowser";
import { APPLY_FILL_PROFILE_SOURCES, APPLY_STATES, APPLY_TEMP_DIR_PREFIX, APPLY_TEMP_MAX_AGE_MS, DOCUMENT_KINDS } from "@/lib/constants";
import { parseReferenceCv } from "@/lib/cv/parseReferenceCv";
import type { DocumentService } from "@/lib/cv/documentService";
import type { ApplyQueueRepository, QueuedJobRow } from "@/lib/repositories/applyQueueRepository";

export interface QueueItem extends QueuedJobRow {
  state: string;
}

export interface ApplyDependencies {
  queue: ApplyQueueRepository;
  documents: DocumentService;
  loadReferenceCvMarkdown: () => string;
  openApplyWindow: OpenApplyWindow;
}

function stateOf(row: QueuedJobRow): string {
  if (row.appliedAt) return APPLY_STATES.APPLIED;
  if (row.skippedAt) return APPLY_STATES.SKIPPED;
  return row.documentCount >= Object.keys(DOCUMENT_KINDS).length ? APPLY_STATES.READY : APPLY_STATES.NEEDS_DOCUMENTS;
}

function assertChanged({ changed, jobId, action }: { changed: boolean; jobId: number; action: string }): void {
  if (!changed) throw new Error(`Cannot ${action}: job ${jobId} not found or not in the apply queue`);
}

export function removeStaleTempDirs({ rootDir, nowMs }: { rootDir: string; nowMs: number }): number {
  let removed = 0;
  for (const entry of fs.readdirSync(rootDir)) {
    const fullPath = path.join(rootDir, entry);
    if (!entry.startsWith(APPLY_TEMP_DIR_PREFIX) || nowMs - fs.statSync(fullPath).mtimeMs < APPLY_TEMP_MAX_AGE_MS) continue;
    fs.rmSync(fullPath, { recursive: true, force: true });
    removed += 1;
  }
  return removed;
}

export class ApplyService {
  constructor(private readonly dependencies: ApplyDependencies) {}

  listQueue(): QueueItem[] {
    return this.dependencies.queue.list().map((row) => ({ ...row, state: stateOf(row) }));
  }

  queueJob(jobId: number): void {
    assertChanged({ changed: this.dependencies.queue.queue(jobId), jobId, action: "queue" });
  }

  unqueueJob(jobId: number): void {
    assertChanged({ changed: this.dependencies.queue.unqueue(jobId), jobId, action: "unqueue" });
  }

  skipJob(jobId: number): void {
    assertChanged({ changed: this.dependencies.queue.skip(jobId), jobId, action: "skip" });
  }

  confirmApplied(jobId: number): void {
    assertChanged({ changed: this.dependencies.queue.markApplied(jobId), jobId, action: "mark applied" });
  }

  async startApply(jobId: number): Promise<FillReport> {
    const { queue, documents, openApplyWindow } = this.dependencies;
    const row = queue.find(jobId);
    if (!row) throw new Error(`Job ${jobId} is not in the apply queue`);
    if (row.appliedAt) throw new Error(`Job ${jobId} is already marked as applied`);
    if (!row.sourceUrl) throw new Error(`Job ${jobId} has no apply link`);
    if (stateOf(row) === APPLY_STATES.NEEDS_DOCUMENTS) await documents.generateForJob(jobId);
    const profile = await this.buildProfile(jobId);
    const shouldFill = (APPLY_FILL_PROFILE_SOURCES as readonly (string | null)[]).includes(row.sourceCode);
    return openApplyWindow({ url: row.sourceUrl, profile, shouldFill });
  }

  private async buildProfile(jobId: number): Promise<ApplyProfile> {
    const { documents, loadReferenceCvMarkdown } = this.dependencies;
    const cv = parseReferenceCv(loadReferenceCvMarkdown());
    const [firstName, ...restOfName] = cv.name.split(" ");
    removeStaleTempDirs({ rootDir: os.tmpdir(), nowMs: Date.now() });
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), APPLY_TEMP_DIR_PREFIX));
    const cvPdfPath = path.join(directory, documents.buildFileName({ jobId, kind: DOCUMENT_KINDS.CV, extension: "pdf" }));
    fs.writeFileSync(cvPdfPath, await documents.renderDocumentPdf({ jobId, kind: DOCUMENT_KINDS.CV }));
    const coverLetter = documents.getDocuments(jobId).find((entry) => entry.kind === DOCUMENT_KINDS.COVER_LETTER)?.content ?? "";
    return {
      fullName: cv.name,
      firstName,
      lastName: restOfName.join(" "),
      email: cv.email,
      phone: cv.phone,
      linkedIn: cv.linkedIn,
      coverLetter,
      cvPdfPath,
    };
  }
}
