import type { TailoredCv } from "@/lib/cv/types";

const WORK_AUTHORIZATION_LABEL = "Work authorization: ";
const SKILL_SEPARATOR = ", ";
const SECTION_SUMMARY = "Summary";
const SECTION_EXPERIENCE = "Work Experience";
const SECTION_EDUCATION = "Education";
const SECTION_SKILLS = "Skills";
const SECTION_CERTIFICATIONS = "Certifications";
const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const HTML_ESCAPE_PATTERN = /[&<>"]/g;
const CV_STYLE = `
  @page { size: A4; margin: 14mm 15mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.35; color: #000; margin: 0; }
  h1 { font-size: 17pt; margin: 0 0 2pt 0; }
  h2 { font-size: 11.5pt; margin: 10pt 0 3pt 0; border-bottom: 1px solid #000; padding-bottom: 1pt; text-transform: uppercase; }
  h3 { font-size: 10.5pt; margin: 6pt 0 0 0; }
  p { margin: 2pt 0; }
  ul { margin: 2pt 0 2pt 14pt; padding: 0; }
  li { margin: 0; }
`;

export function renderCvMarkdown(cv: TailoredCv): string {
  const lines: string[] = [`# ${cv.name}`, "", cv.headline, "", cv.contactLine, "", `${WORK_AUTHORIZATION_LABEL}${cv.workAuthorization}`, ""];
  lines.push(`## ${SECTION_SUMMARY}`, "", ...cv.summaryParagraphs.flatMap((paragraph) => [paragraph, ""]));
  lines.push(`## ${SECTION_EXPERIENCE}`, "");
  for (const role of cv.roles) {
    lines.push(`### ${role.title}, ${role.company}`, role.dates, "");
    if (role.technologies.length > 0) lines.push(`Technologies: ${role.technologies.join(SKILL_SEPARATOR)}`, "");
    lines.push(...role.bullets.map((bullet) => `- ${bullet}`), "");
  }
  lines.push(`## ${SECTION_EDUCATION}`, "");
  for (const entry of cv.education) lines.push(`### ${entry.institution}`, entry.period, "", entry.detail, "");
  lines.push(`## ${SECTION_SKILLS}`, "", cv.skills.join(SKILL_SEPARATOR), "");
  if (cv.certifications.length > 0) lines.push(`## ${SECTION_CERTIFICATIONS}`, "", ...cv.certifications.map((item) => `- ${item}`), "");
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

function escapeHtml(text: string): string {
  return text.replace(HTML_ESCAPE_PATTERN, (char) => HTML_ESCAPES[char]);
}

// Converts the fixed Markdown shape produced above (and plain-text letters) into single-column HTML.
export function markdownToHtml(markdown: string): string {
  const body: string[] = [];
  let openList = false;
  const closeList = (): void => {
    if (openList) body.push("</ul>");
    openList = false;
  };
  for (const line of markdown.split("\n")) {
    const text = escapeHtml(line.trim());
    if (line.startsWith("- ")) {
      if (!openList) body.push("<ul>");
      openList = true;
      body.push(`<li>${escapeHtml(line.slice(2).trim())}</li>`);
      continue;
    }
    closeList();
    if (line.startsWith("### ")) body.push(`<h3>${escapeHtml(line.slice(4).trim())}</h3>`);
    else if (line.startsWith("## ")) body.push(`<h2>${escapeHtml(line.slice(3).trim())}</h2>`);
    else if (line.startsWith("# ")) body.push(`<h1>${escapeHtml(line.slice(2).trim())}</h1>`);
    else if (text) body.push(`<p>${text}</p>`);
  }
  closeList();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${CV_STYLE}</style></head><body>${body.join("\n")}</body></html>`;
}
