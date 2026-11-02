import assert from "node:assert/strict";
import { test } from "node:test";
import { SALARY_PERIODS } from "@/lib/constants";
import { mapMichaelPageTile } from "@/lib/scrapers/michaelpage";

test("mapMichaelPageTile maps a tile to a raw job", () => {
  const rawJob = mapMichaelPageTile({
    href: "/job-detail/chief-technology-officer-banking/ref/jn-102026-7127343",
    title: "Chief Technology Officer - Banking",
    location: "Singapore",
    contractType: "Permanent",
    salaryText: "SG$20,000 - SG$40,000 per month (SG$240,000 - SG$480,000 per year)",
    summary: "Lead the technology agenda",
    bullets: ["Shape AI strategy"],
  });
  assert.equal(rawJob.sourceJobId, "jn-102026-7127343");
  assert.equal(rawJob.sourceUrl, "https://www.michaelpage.com.sg/job-detail/chief-technology-officer-banking/ref/jn-102026-7127343");
  assert.equal(rawJob.salaryMin, 20000);
  assert.equal(rawJob.salaryPeriod, SALARY_PERIODS.MONTHLY);
  assert.deepEqual(rawJob.employmentTypes, ["Permanent"]);
  assert.ok(rawJob.descriptionHtml.includes("Shape AI strategy"));
});

test("mapMichaelPageTile tolerates missing salary and contract type", () => {
  const rawJob = mapMichaelPageTile({
    href: "/job-detail/x/ref/abc",
    title: "Dev",
    location: "",
    contractType: "",
    salaryText: "",
    summary: "",
    bullets: [],
  });
  assert.equal(rawJob.salaryMin, null);
  assert.deepEqual(rawJob.employmentTypes, []);
});
