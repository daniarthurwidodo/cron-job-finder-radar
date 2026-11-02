import { CV_MONTH_ABBREVIATIONS, CV_PRESENT_LABEL, CV_PRESENT_PATTERN } from "@/lib/constants";
import type { CvEducation, CvRole, ReferenceCv } from "@/lib/cv/types";

const YEAR_PATTERN = /\d{4}/;
const DATE_SEPARATOR = " - ";
const LIST_SEPARATOR = ",";
const NAME_HEADING = /^# (.+)$/;
const SECTION_HEADING = /^## (.+)$/;
const ROLE_HEADING = /^### (.+)$/;
const FIELD_BULLET = /^- \*\*(.+?)\*\*:?\s*(.*)$/;
const NESTED_BULLET = /^\s{2,}- (.+)$/;
const PLAIN_BULLET = /^- (.+)$/;
const BOLD_LINE = /^\*\*(.+?)\*\*,?\s*(.*)$/;
const URL_PREFIX = /^https?:/i;

const SECTION_KEYS = {
  SUMMARY: "profile summary",
  EXPERIENCE: "work experience",
  EDUCATION: "education",
  SKILLS: "skills",
  CERTIFICATES: "licenses and certificates",
} as const;

export function normalizeDates(rawDates: string): string {
  return rawDates
    .split(DATE_SEPARATOR)
    .map((part) => {
      const trimmed = part.trim();
      if (CV_PRESENT_PATTERN.test(trimmed)) return CV_PRESENT_LABEL;
      const [month, ...rest] = trimmed.split(" ");
      const abbreviation = CV_MONTH_ABBREVIATIONS[month.toLowerCase()];
      return abbreviation ? [abbreviation, ...rest].join(" ") : trimmed;
    })
    .join(DATE_SEPARATOR);
}

function splitHeading(heading: string): { company: string; dates: string } {
  const separatorIndex = heading.lastIndexOf(", ");
  if (separatorIndex < 0) throw new Error(`Role heading needs "Company, dates": ${heading}`);
  return { company: heading.slice(0, separatorIndex).trim(), dates: heading.slice(separatorIndex + 2).trim() };
}

function startRole(heading: string): CvRole {
  const { company, dates } = splitHeading(heading);
  const normalizedDates = normalizeDates(dates);
  return { company, title: "", dates: normalizedDates, startYear: Number(YEAR_PATTERN.exec(normalizedDates)?.[0] ?? 0), technologies: [], bullets: [] };
}

function applyRoleLine({ role, line, project }: { role: CvRole; line: string; project: { label: string } }): void {
  const field = FIELD_BULLET.exec(line);
  if (field) {
    const [key, label] = field[1].split(":").map((part) => part.trim());
    const value = field[2].trim();
    if (key === "Role") role.title = value;
    if (key === "Technology") role.technologies = value.split(LIST_SEPARATOR).map((item) => item.trim()).filter(Boolean);
    if (key === "Project") project.label = label ?? (URL_PREFIX.test(value) ? "" : value);
    return;
  }
  const nested = NESTED_BULLET.exec(line);
  if (nested) role.bullets.push(project.label ? `${project.label}: ${nested[1].trim()}` : nested[1].trim());
}

function parseLabelledLine(line: string): { label: string; value: string } | null {
  const match = /^- (.+?):\s*(.+)$/.exec(line);
  return match ? { label: match[1].trim().toLowerCase(), value: match[2].trim() } : null;
}

export function parseReferenceCv(markdown: string): ReferenceCv {
  const cv: ReferenceCv = {
    name: "", headline: "", phone: "", email: "", location: "", linkedIn: "",
    summaryParagraphs: [], roles: [], education: [], skills: [], certifications: [],
  };
  let section = "";
  let role: CvRole | undefined;
  const project = { label: "" };
  let education: CvEducation | undefined;
  for (const line of markdown.split("\n")) {
    const name = NAME_HEADING.exec(line);
    const sectionHeading = SECTION_HEADING.exec(line);
    const roleHeading = ROLE_HEADING.exec(line);
    if (name) { cv.name = name[1].trim(); section = ""; continue; }
    if (sectionHeading) { section = sectionHeading[1].trim().toLowerCase(); continue; }
    if (roleHeading) { role = startRole(roleHeading[1]); project.label = ""; cv.roles.push(role); continue; }
    if (!line.trim()) continue;
    if (section === "") {
      const labelled = parseLabelledLine(line);
      if (labelled?.label.startsWith("phone")) cv.phone = labelled.value;
      else if (labelled?.label === "email") cv.email = labelled.value.split("/")[0].trim();
      else if (labelled?.label === "location") cv.location = labelled.value;
      else if (labelled?.label === "linkedin") cv.linkedIn = labelled.value;
      else if (!line.startsWith("-") && !cv.headline) cv.headline = line.trim();
    } else if (section === SECTION_KEYS.SUMMARY) cv.summaryParagraphs.push(line.trim());
    else if (section === SECTION_KEYS.EXPERIENCE && role) applyRoleLine({ role, line, project });
    else if (section === SECTION_KEYS.EDUCATION) {
      const bold = BOLD_LINE.exec(line);
      if (bold) { education = { institution: bold[1].trim(), period: bold[2].trim(), detail: "" }; cv.education.push(education); }
      else if (education) education.detail = line.trim();
    } else if (section === SECTION_KEYS.SKILLS) cv.skills.push(...line.split(LIST_SEPARATOR).map((item) => item.trim()).filter(Boolean));
    else if (section === SECTION_KEYS.CERTIFICATES) cv.certifications.push(PLAIN_BULLET.exec(line)?.[1].trim() ?? line.trim());
  }
  assertParsed(cv);
  return cv;
}

function assertParsed(cv: ReferenceCv): void {
  if (!cv.name) throw new Error("Reference CV has no name (# heading)");
  if (!cv.email) throw new Error("Reference CV has no Email line");
  if (!cv.location) throw new Error("Reference CV has no Location line");
  if (cv.roles.length === 0) throw new Error("Reference CV has no roles under Work Experience");
  if (cv.roles.some((role) => !role.title)) throw new Error("A role has no **Role:** line");
}
