import assert from "node:assert/strict";
import { test } from "node:test";
import { SALARY_PERIODS } from "@/lib/constants";
import { mapMcfJob } from "@/lib/scrapers/mycareersfuture";

test("mapMcfJob maps an MCF job to a raw job", () => {
  const rawJob = mapMcfJob({
    uuid: "abc",
    title: "Web Developer",
    description: "<p>Next.js</p>",
    skills: [{ skill: "Docker" }],
    employmentTypes: [{ employmentType: "Full Time" }],
    positionLevels: [{ position: "Professional" }],
    flexibleWorkArrangements: [],
    postedCompany: { name: "ACME PTE. LTD." },
    salary: { minimum: 2100, maximum: 4000, type: { salaryType: "Monthly" } },
    metadata: { jobDetailsUrl: "https://www.mycareersfuture.gov.sg/job/x/abc", newPostingDate: "2026-10-03" },
  });
  assert.equal(rawJob.sourceJobId, "abc");
  assert.equal(rawJob.companyName, "ACME PTE. LTD.");
  assert.equal(rawJob.countryCode, "SG");
  assert.equal(rawJob.currencyCode, "SGD");
  assert.equal(rawJob.salaryPeriod, SALARY_PERIODS.MONTHLY);
  assert.deepEqual(rawJob.positionLevels, ["Professional"]);
  assert.equal(rawJob.postedAt, "2026-10-03");
});

test("mapMcfJob tolerates missing optional fields and unknown salary type", () => {
  const rawJob = mapMcfJob({ uuid: "x", title: "T", salary: { minimum: 10, type: { salaryType: "Hourly" } } });
  assert.equal(rawJob.salaryPeriod, null);
  assert.equal(rawJob.companyName, "");
  assert.deepEqual(rawJob.skills, []);
});
