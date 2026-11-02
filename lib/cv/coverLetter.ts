import { UNDISCLOSED_COMPANY_PATTERN } from "@/lib/constants";
import { bestMatchingBullet, topRelevantSkills } from "@/lib/cv/tailorCv";
import type { JobContext, ReferenceCv } from "@/lib/cv/types";

const SKILL_SEPARATOR = ", ";
const GREETING_DEFAULT = "Dear Hiring Manager,";

function listSkills(skills: string[]): string {
  if (skills.length <= 1) return skills.join("");
  return `${skills.slice(0, -1).join(SKILL_SEPARATOR)} and ${skills.at(-1)}`;
}

function describeCompany(job: JobContext): string {
  return UNDISCLOSED_COMPANY_PATTERN.test(job.companyName) ? "your client" : job.companyName;
}

function buildIntroParagraph({ cv, job }: { cv: ReferenceCv; job: JobContext }): string {
  const current = cv.roles[0];
  return `I am writing to apply for the ${job.title} position at ${describeCompany(job)}. I currently work as ${current.title} at ${current.company} (${current.dates}), and I would like to bring that experience to this role.`;
}

function buildFitParagraph({ cv, job }: { cv: ReferenceCv; job: JobContext }): string {
  const skills = topRelevantSkills({ cv, job });
  const match = bestMatchingBullet({ cv, job });
  const skillsSentence = skills.length > 0 ? `My background matches your requirements in ${listSkills(skills)}.` : "";
  const evidenceSentence = match ? `For example, at ${match.role.company} (${match.role.dates}): ${match.bullet}.` : "";
  return [skillsSentence, evidenceSentence].filter(Boolean).join(" ");
}

export function buildCoverLetter({ cv, job, workAuthorization }: { cv: ReferenceCv; job: JobContext; workAuthorization: string }): string {
  const paragraphs = [
    GREETING_DEFAULT,
    buildIntroParagraph({ cv, job }),
    buildFitParagraph({ cv, job }),
    `Regarding work authorization: ${workAuthorization}`,
    "Thank you for your time and consideration. I would welcome the chance to discuss how I can contribute to your team.",
    `Sincerely,\n${cv.name}\n${cv.email} | ${cv.phone}`,
  ];
  return `${paragraphs.filter(Boolean).join("\n\n")}\n`;
}
