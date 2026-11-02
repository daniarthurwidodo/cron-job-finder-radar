import { DOCUMENT_KINDS, HTTP_STATUS } from "@/lib/constants";
import { getServices } from "@/lib/container";
import { logger } from "@/lib/logger";

const FORMAT_PDF = "pdf";
const NOT_FOUND_STATUS = 404;
const BAD_REQUEST_STATUS = 400;
const TEXT_CONTENT_TYPES: Record<string, string> = { md: "text/markdown; charset=utf-8", txt: "text/plain; charset=utf-8" };
const TEXT_FORMAT_BY_KIND: Record<string, string> = { [DOCUMENT_KINDS.CV]: "md", [DOCUMENT_KINDS.COVER_LETTER]: "txt" };

export async function GET(request: Request, { params }: { params: Promise<{ id: string; kind: string }> }): Promise<Response> {
  const { id, kind } = await params;
  const jobId = Number(id);
  const format = new URL(request.url).searchParams.get("format") ?? FORMAT_PDF;
  const textFormat = TEXT_FORMAT_BY_KIND[kind];
  if (!Number.isInteger(jobId) || jobId <= 0 || !textFormat || ![FORMAT_PDF, textFormat].includes(format)) {
    return Response.json({ error: "Bad request" }, { status: BAD_REQUEST_STATUS });
  }
  const { documents } = getServices();
  const stored = documents.getDocuments(jobId).find((entry) => entry.kind === kind);
  if (!stored) return Response.json({ error: "Nothing generated yet" }, { status: NOT_FOUND_STATUS });
  const disposition = `attachment; filename="${documents.buildFileName({ jobId, kind, extension: format })}"`;
  try {
    if (format !== FORMAT_PDF) {
      return new Response(stored.content, { status: HTTP_STATUS.OK, headers: { "Content-Type": TEXT_CONTENT_TYPES[format], "Content-Disposition": disposition } });
    }
    const pdf = await documents.renderDocumentPdf({ jobId, kind });
    return new Response(new Uint8Array(pdf), { status: HTTP_STATUS.OK, headers: { "Content-Type": "application/pdf", "Content-Disposition": disposition } });
  } catch (error) {
    logger.error("document download failed", { jobId, kind, error: String(error) });
    return Response.json({ error: "Could not render document" }, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
  }
}
