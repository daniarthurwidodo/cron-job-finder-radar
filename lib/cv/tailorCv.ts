import { COVER_LETTER_MAX_SKILLS, CV_MAX_SKILLS, STACK_KEYWORDS } from "@/lib/constants";
import type { CvRole, JobContext, ReferenceCv, TailoredCv } from "@/lib/cv/types";

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;
const CONTACT_SEPARATOR = " | ";

export interface CompactionLevel {
  maxRoles: number;
  maxBulletsPerRole: number;
  includeSummaryParagraphs: number;
}

function escapeRegExp(text: string): string {
  return text.replace(REGEX_SPECIAL_CHARS, "\\$&");
}

function mentionsTerm({ text, term }: { text: string; term: string }): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(term.toLowerCase())}($|[^a-z0-9])`).test(text.toLowerCase());
}

function canonicalTagOf(skill: string): string | undefined {
  return STACK_KEYWORDS.find((keyword) => keyword.pattern.test(skill))?.tag;
}

export function isSkillRelevant({ skill, job }: { skill: string; job: JobContext }): boolean {
  const tag = canonicalTagOf(skill);
  if (tag) return job.techTags.includes(tag);
  return mentionsTerm({ text: job.text, term: skill });
}

export function jobSpelling({ skill, job }: { skill: string; job: JobContext }): string {
  const tag = canonicalTagOf(skill);
  return tag && job.techTags.includes(tag) ? tag : skill;
}

function orderSkills({ cv, job }: { cv: ReferenceCv; job: JobContext }): string[] {
  const relevant = cv.skills.filter((skill) => isSkillRelevant({ skill, job })).map((skill) => jobSpelling({ skill, job }));
  const others = cv.skills.filter((skill) => !isSkillRelevant({ skill, job }));
  return [...new Set([...relevant, ...others])].slice(0, CV_MAX_SKILLS);
}

function keywordsOf({ cv, job }: { cv: ReferenceCv; job: JobContext }): string[] {
  return cv.skills.filter((skill) => isSkillRelevant({ skill, job })).flatMap((skill) => [skill, jobSpelling({ skill, job })]);
}

function relevanceOf({ text, keywords }: { text: string; keywords: string[] }): number {
  return new Set(keywords.filter((term) => mentionsTerm({ text, term }))).size;
}

function sortByRelevance({ items, keywords }: { items: string[]; keywords: string[] }): string[] {
  return items
    .map((text, index) => ({ text, index, score: relevanceOf({ text, keywords }) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.text);
}

function tailorRole({ role, cv, job, level }: { role: CvRole; cv: ReferenceCv; job: JobContext; level: CompactionLevel }): CvRole {
  const keywords = keywordsOf({ cv, job });
  const technologies = [...role.technologies].sort(
    (left, right) => Number(isSkillRelevant({ skill: right, job })) - Number(isSkillRelevant({ skill: left, job })),
  );
  return {
    ...role,
    technologies: technologies.map((skill) => jobSpelling({ skill, job })),
    bullets: sortByRelevance({ items: role.bullets, keywords }).slice(0, level.maxBulletsPerRole),
  };
}

export function buildContactLine(cv: ReferenceCv): string {
  return [cv.email, cv.phone, cv.location, cv.linkedIn].filter(Boolean).join(CONTACT_SEPARATOR);
}

export function tailorCv({
  cv,
  job,
  workAuthorization,
  level,
}: {
  cv: ReferenceCv;
  job: JobContext;
  workAuthorization: string;
  level: CompactionLevel;
}): TailoredCv {
  return {
    name: cv.name,
    headline: cv.headline,
    contactLine: buildContactLine(cv),
    workAuthorization,
    summaryParagraphs: cv.summaryParagraphs.slice(0, level.includeSummaryParagraphs),
    roles: cv.roles.slice(0, level.maxRoles).map((role) => tailorRole({ role, cv, job, level })),
    education: cv.education,
    skills: orderSkills({ cv, job }),
    certifications: cv.certifications,
  };
}

export function topRelevantSkills({ cv, job }: { cv: ReferenceCv; job: JobContext }): string[] {
  return cv.skills
    .filter((skill) => isSkillRelevant({ skill, job }))
    .map((skill) => jobSpelling({ skill, job }))
    .slice(0, COVER_LETTER_MAX_SKILLS);
}

export function bestMatchingBullet({ cv, job }: { cv: ReferenceCv; job: JobContext }): { role: CvRole; bullet: string } | null {
  const keywords = keywordsOf({ cv, job });
  let best: { role: CvRole; bullet: string; score: number } | null = null;
  for (const role of cv.roles) {
    for (const bullet of role.bullets) {
      const score = relevanceOf({ text: bullet, keywords });
      if (score > 0 && (best === null || score > best.score)) best = { role, bullet, score };
    }
  }
  return best ? { role: best.role, bullet: best.bullet } : null;
}
