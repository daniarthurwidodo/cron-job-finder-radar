import { CV_ALLOWED_HEADINGS, CV_MAX_PAGES } from "@/lib/constants";

const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_PATTERN = /\+?\d[\d\s-]{7,}/;
const TABLE_SEPARATOR_PATTERN = /^\s*\|?\s*:?-{3,}:?\s*\|/m;
const IMAGE_PATTERN = /!\[[^\]]*\]\(/;
const HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/i;
const EMOJI_PATTERN = /\p{Extended_Pictographic}/u;
const NON_PLAIN_BULLET_PATTERN = /^\s*[*•▪●◦]\s/m;
const SECTION_HEADING_PATTERN = /^## (.+)$/gm;
const WORK_AUTHORIZATION_PATTERN = /^Work authorization: .+/m;
const LINKEDIN_PATTERN = /linkedin\.com/i;

export function validateAtsCv({ markdown, pageCount }: { markdown: string; pageCount: number }): string[] {
  const issues: string[] = [];
  const headings = [...markdown.matchAll(SECTION_HEADING_PATTERN)].map((match) => match[1].trim());
  const allowedHeadings: readonly string[] = CV_ALLOWED_HEADINGS;
  for (const heading of headings) if (!allowedHeadings.includes(heading)) issues.push(`Non-standard section heading: ${heading}`);
  for (const required of ["Summary", "Work Experience", "Education", "Skills"]) {
    if (!headings.includes(required)) issues.push(`Missing section: ${required}`);
  }
  if (TABLE_SEPARATOR_PATTERN.test(markdown)) issues.push("Contains a table");
  if (IMAGE_PATTERN.test(markdown)) issues.push("Contains an image");
  if (HTML_TAG_PATTERN.test(markdown)) issues.push("Contains HTML markup");
  if (EMOJI_PATTERN.test(markdown)) issues.push("Contains emoji or icon characters");
  if (NON_PLAIN_BULLET_PATTERN.test(markdown)) issues.push("Uses non-plain bullet characters");
  if (!EMAIL_PATTERN.test(markdown)) issues.push("Missing email in the body");
  if (!PHONE_PATTERN.test(markdown)) issues.push("Missing phone in the body");
  if (!LINKEDIN_PATTERN.test(markdown)) issues.push("Missing LinkedIn URL");
  if (!WORK_AUTHORIZATION_PATTERN.test(markdown)) issues.push("Missing work authorization line");
  if (pageCount > CV_MAX_PAGES) issues.push(`CV is ${pageCount} pages, maximum is ${CV_MAX_PAGES}`);
  return issues;
}
