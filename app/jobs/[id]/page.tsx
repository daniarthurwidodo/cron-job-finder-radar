import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { GenerateForm } from "@/app/jobs/[id]/GenerateForm";
import { DOCUMENT_KINDS } from "@/lib/constants";
import { getServices } from "@/lib/container";
import { COUNTRY_LABELS, formatIdr, formatSalaryRange, labelOf, STATUS_LABELS } from "@/lib/dashboard/format";

const DOWNLOADS = [
  { kind: DOCUMENT_KINDS.CV, label: "CV", links: [["pdf", "PDF"], ["md", "Markdown"]] },
  { kind: DOCUMENT_KINDS.COVER_LETTER, label: "Interest letter", links: [["pdf", "PDF"], ["txt", "Text"]] },
] as const;

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const jobId = Number((await params).id);
  if (!Number.isInteger(jobId) || jobId <= 0) notFound();
  const { dashboard, documents } = getServices();
  const job = dashboard.getCompareJobs([jobId])[0];
  if (!job) notFound();
  const stored = documents.getDocuments(jobId);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/" className="text-sm underline">
        Back to dashboard
      </Link>
      <section>
        <h1 className="text-xl font-semibold">{job.title}</h1>
        <p className="text-sm text-slate-500">
          {job.companyName} - {labelOf({ labels: COUNTRY_LABELS, code: job.countryCode })} - {labelOf({ labels: STATUS_LABELS, code: job.statusCode })}
        </p>
        <p className="text-sm">
          {formatSalaryRange({ minMinor: job.salaryMinMonthlyMinor, maxMinor: job.salaryMaxMonthlyMinor, currencyCode: job.currencyCode })} - net savings{" "}
          {formatIdr(job.netSavingsMonthlyIdr)} / month
        </p>
        {job.sourceUrl && (
          <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="text-sm underline">
            Open job posting
          </a>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">CV and interest letter (ATS format)</h2>
        <GenerateForm jobId={jobId} hasDocuments={stored.length > 0} />
        {stored.length === 0 && <p className="text-sm">Nothing generated yet. The text comes only from your reference CV; nothing is invented.</p>}
        {DOWNLOADS.map((download) => {
          const document = stored.find((entry) => entry.kind === download.kind);
          if (!document) return null;
          return (
            <div key={download.kind} className="rounded border border-slate-300 p-3 dark:border-slate-700">
              <div className="mb-2 flex items-center gap-3 text-sm">
                <span className="font-medium">{download.label}</span>
                {download.links.map(([format, label]) => (
                  <a key={format} href={`/api/jobs/${jobId}/documents/${download.kind}?format=${format}`} className="underline">
                    Download {label}
                  </a>
                ))}
              </div>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">{document.content}</pre>
            </div>
          );
        })}
      </section>
    </div>
  );
}
