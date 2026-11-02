import assert from "node:assert/strict";
import { test } from "node:test";
import { CV_COMPACTION_LEVELS } from "@/lib/constants";
import { validateAtsCv } from "@/lib/cv/atsValidator";
import { buildCoverLetter } from "@/lib/cv/coverLetter";
import { normalizeDates, parseReferenceCv } from "@/lib/cv/parseReferenceCv";
import { markdownToHtml, renderCvMarkdown } from "@/lib/cv/renderCv";
import { tailorCv } from "@/lib/cv/tailorCv";
import { FIXTURE_CV } from "@/lib/cv/testFixture";
import type { JobContext } from "@/lib/cv/types";


const JOB: JobContext = {
  title: "Senior Full Stack Developer",
  companyName: "Globex Pte Ltd",
  countryCode: "SG",
  text: "Senior Full Stack Developer We use Node.js, PostgreSQL and Docker for APIs.",
  techTags: ["Node.js", "PostgreSQL"],
};
const WORK_AUTHORIZATION = "Open to relocation. Requires visa sponsorship.";

test("normalizeDates abbreviates months and maps current to Present", () => {
  assert.equal(normalizeDates("February 2024 - current"), "Feb 2024 - Present");
  assert.equal(normalizeDates("2012 - 2013"), "2012 - 2013");
  assert.equal(normalizeDates("Jan 2023 - May 2024"), "Jan 2023 - May 2024");
});

test("parseReferenceCv reads contact, roles, projects, education, skills", () => {
  const cv = parseReferenceCv(FIXTURE_CV);
  assert.equal(cv.name, "Jane Example");
  assert.equal(cv.email, "jane.work@example.com");
  assert.equal(cv.location, "Jakarta, Indonesia");
  assert.equal(cv.summaryParagraphs.length, 2);
  assert.equal(cv.roles.length, 2);
  assert.equal(cv.roles[0].dates, "Feb 2024 - Present");
  assert.equal(cv.roles[0].startYear, 2024);
  assert.deepEqual(cv.roles[0].bullets, [
    "Build deployment pipeline for the website",
    "Develop internal dashboard with Next.js",
    "Unfold: Develop Unfold with React.js and AWS S3",
  ]);
  assert.deepEqual(cv.roles[1].bullets, ["Maintain the school portal with PHP"]);
  assert.equal(cv.education[0].institution, "Example University");
  assert.deepEqual(cv.skills, ["JavaScript", "NodeJS", "Docker", "Linux", "Postgres", "Figma"]);
  assert.deepEqual(cv.certifications, ["Angular Certificate"]);
});

test("parseReferenceCv fails loudly on a CV without location", () => {
  assert.throws(() => parseReferenceCv(FIXTURE_CV.replace("- Location: Jakarta, Indonesia\n", "")), /Location/);
});

test("tailorCv puts relevant skills first in the job's spelling and adds no new facts", () => {
  const cv = parseReferenceCv(FIXTURE_CV);
  const tailored = tailorCv({ cv, job: JOB, workAuthorization: WORK_AUTHORIZATION, level: CV_COMPACTION_LEVELS[0] });
  assert.deepEqual(tailored.skills.slice(0, 3), ["Node.js", "Docker", "PostgreSQL"]);
  assert.equal(tailored.skills.length, cv.skills.length);
  const originalBullets = new Set(cv.roles.flatMap((role) => role.bullets));
  for (const bullet of tailored.roles.flatMap((role) => role.bullets)) assert.ok(originalBullets.has(bullet), bullet);
  assert.deepEqual(tailored.roles.map((role) => role.company), ["Acme Bank", "Old Corp"]);
});

test("tailorCv compaction limits roles and bullets", () => {
  const cv = parseReferenceCv(FIXTURE_CV);
  const compact = { maxRoles: 1, maxBulletsPerRole: 1, includeSummaryParagraphs: 1 };
  const tailored = tailorCv({ cv, job: JOB, workAuthorization: WORK_AUTHORIZATION, level: compact });
  assert.equal(tailored.roles.length, 1);
  assert.equal(tailored.roles[0].bullets.length, 1);
  assert.equal(tailored.summaryParagraphs.length, 1);
});

test("rendered CV passes the ATS validator; each violation is caught", () => {
  const cv = parseReferenceCv(FIXTURE_CV);
  const markdown = renderCvMarkdown(tailorCv({ cv, job: JOB, workAuthorization: WORK_AUTHORIZATION, level: CV_COMPACTION_LEVELS[0] }));
  assert.deepEqual(validateAtsCv({ markdown, pageCount: 2 }), []);
  assert.match(validateAtsCv({ markdown, pageCount: 3 }).join(), /3 pages/);
  assert.match(validateAtsCv({ markdown: `${markdown}\n| a | b |\n|---|---|\n`, pageCount: 1 }).join(), /table/);
  assert.match(validateAtsCv({ markdown: `${markdown}\n![logo](x.png)`, pageCount: 1 }).join(), /image/);
  assert.match(validateAtsCv({ markdown: `${markdown}\nGreat 🚀`, pageCount: 1 }).join(), /emoji/);
  assert.match(validateAtsCv({ markdown: `${markdown}\n## Hobbies\n`, pageCount: 1 }).join(), /Hobbies/);
  assert.match(validateAtsCv({ markdown: markdown.replace(/^Work authorization:.*$/m, ""), pageCount: 1 }).join(), /work authorization/);
});

test("markdownToHtml is single column, escapes text and has no table or image", () => {
  const html = markdownToHtml("# A & B\n\n## Skills\n\n- <script>x</script>\n");
  assert.ok(html.includes("<h1>A &amp; B</h1>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!/<table|<img/i.test(html));
});

test("cover letter uses only CV facts, job title, company and the work authorization line", () => {
  const cv = parseReferenceCv(FIXTURE_CV);
  const letter = buildCoverLetter({ cv, job: JOB, workAuthorization: WORK_AUTHORIZATION });
  assert.ok(letter.includes("Senior Full Stack Developer position at Globex Pte Ltd"));
  assert.ok(letter.includes("Senior fullstack developer at Acme Bank"));
  assert.ok(letter.includes(WORK_AUTHORIZATION));
  assert.ok(letter.includes("Node.js, Docker and PostgreSQL"));
  const undisclosed = buildCoverLetter({ cv, job: { ...JOB, companyName: "Michael Page (client undisclosed)" }, workAuthorization: WORK_AUTHORIZATION });
  assert.ok(undisclosed.includes("at your client"));
});
