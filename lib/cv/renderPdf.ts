import { withBrowserPage } from "@/lib/scrapers/browser";

const PDF_PAGE_PATTERN = /\/Type\s*\/Page[^s]/g;
const PDF_BYTE_ENCODING = "latin1";

export interface PdfResult {
  pdf: Buffer;
  pageCount: number;
}

export async function renderPdf(html: string): Promise<PdfResult> {
  return withBrowserPage(async (page) => {
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", printBackground: false, preferCSSPageSize: true });
    const pageCount = pdf.toString(PDF_BYTE_ENCODING).match(PDF_PAGE_PATTERN)?.length ?? 0;
    return { pdf, pageCount };
  });
}
