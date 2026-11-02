import { CV_COMPACTION_LEVELS, CV_MAX_PAGES, DOCUMENT_KINDS } from "@/lib/constants";
import { validateAtsCv } from "@/lib/cv/atsValidator";
import { buildCoverLetter } from "@/lib/cv/coverLetter";
import { parseReferenceCv } from "@/lib/cv/parseReferenceCv";
import type { PdfResult } from "@/lib/cv/renderPdf";
import { markdownToHtml, renderCvMarkdown } from "@/lib/cv/renderCv";
import { tailorCv } from "@/lib/cv/tailorCv";
import type { JobContext, ReferenceCv } from "@/lib/cv/types";
import type { DocumentRecord, DocumentRepository } from "@/lib/repositories/documentRepository";
import type { JobRepository } from "@/lib/repositories/jobRepository";
import type { WorkAuthorizationRepository } from "@/lib/repositories/workAuthorizationRepository";

const FILE_NAME_UNSAFE_PATTERN = /[^A-Za-z0-9]+/g;
const FILE_NAME_JOINER = "-";
const KIND_FILE_LABELS: Record<string, string> = {
  [DOCUMENT_KINDS.CV]: "CV",
  [DOCUMENT_KINDS.COVER_LETTER]: "Cover-Letter",
};

export interface DocumentDependencies {
  jobs: JobRepository;
  documents: DocumentRepository;
  workAuthorizations: WorkAuthorizationRepository;
  loadReferenceCvMarkdown: () => string;
  renderPdf: (html: string) => Promise<PdfResult>;
}

function toFileSegment(text: string): string {
  return text.replace(FILE_NAME_UNSAFE_PATTERN, FILE_NAME_JOINER).replace(/^-+|-+$/g, "");
}

export class DocumentService {
  constructor(private readonly dependencies: DocumentDependencies) {}

  async generateForJob(jobId: number): Promise<void> {
    const { jobs, documents, workAuthorizations, loadReferenceCvMarkdown } = this.dependencies;
    const context = jobs.findDocumentContext(jobId);
    if (!context) throw new Error(`Job not found: ${jobId}`);
    const workAuthorization = workAuthorizations.findStatement(context.countryCode);
    if (!workAuthorization) throw new Error(`No work authorization statement for country ${context.countryCode}`);
    const cv = parseReferenceCv(loadReferenceCvMarkdown());
    const job: JobContext = {
      title: context.title,
      companyName: context.companyName,
      countryCode: context.countryCode,
      techTags: context.techTags,
      text: [context.title, context.description, ...context.techTags].join(" "),
    };
    const cvMarkdown = await this.fitCvMarkdown({ cv, job, workAuthorization });
    documents.upsert({ jobId, kind: DOCUMENT_KINDS.CV, content: cvMarkdown });
    documents.upsert({ jobId, kind: DOCUMENT_KINDS.COVER_LETTER, content: buildCoverLetter({ cv, job, workAuthorization }) });
  }

  getDocuments(jobId: number): DocumentRecord[] {
    return this.dependencies.documents.listByJob(jobId);
  }

  async renderDocumentPdf({ jobId, kind }: { jobId: number; kind: string }): Promise<Buffer> {
    const document = this.dependencies.documents.find({ jobId, kind });
    if (!document) throw new Error(`No ${kind} generated for job ${jobId}`);
    return (await this.dependencies.renderPdf(markdownToHtml(document.content))).pdf;
  }

  buildFileName({ jobId, kind, extension }: { jobId: number; kind: string; extension: string }): string {
    const context = this.dependencies.jobs.findDocumentContext(jobId);
    const cv = parseReferenceCv(this.dependencies.loadReferenceCvMarkdown());
    const parts = [toFileSegment(cv.name), KIND_FILE_LABELS[kind] ?? kind, toFileSegment(context?.companyName ?? "Company")];
    return `${parts.join(FILE_NAME_JOINER)}.${extension}`;
  }

  private async fitCvMarkdown({ cv, job, workAuthorization }: { cv: ReferenceCv; job: JobContext; workAuthorization: string }): Promise<string> {
    let markdown = "";
    let pageCount = 0;
    for (const level of CV_COMPACTION_LEVELS) {
      markdown = renderCvMarkdown(tailorCv({ cv, job, workAuthorization, level }));
      pageCount = (await this.dependencies.renderPdf(markdownToHtml(markdown))).pageCount;
      if (pageCount <= CV_MAX_PAGES) break;
    }
    const issues = validateAtsCv({ markdown, pageCount });
    if (issues.length > 0) throw new Error(`CV failed ATS validation: ${issues.join("; ")}`);
    return markdown;
  }
}
