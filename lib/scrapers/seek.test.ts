import assert from "node:assert/strict";
import { test } from "node:test";
import { COUNTRY_CODES, SALARY_PERIODS } from "@/lib/constants";
import { mapSeekCard, SEEK_AU_REGION, SEEK_NZ_REGION } from "@/lib/scrapers/seek";

test("mapSeekCard maps an NZ card with an annual salary range", () => {
  const rawJob = mapSeekCard({
    region: SEEK_NZ_REGION,
    card: {
      id: "95623476",
      title: "Full Stack Developer",
      company: "Acme Ltd",
      location: "Auckland CBD, Auckland",
      salaryText: "$70,000 – $80,000 per year (pro-rated)",
      workTypeText: "This is a Part time job",
      summary: "Build <web> apps & APIs",
    },
  });
  assert.equal(rawJob.sourceCode, "seek_nz");
  assert.equal(rawJob.sourceUrl, "https://nz.seek.com/job/95623476");
  assert.equal(rawJob.countryCode, COUNTRY_CODES.NEW_ZEALAND);
  assert.equal(rawJob.currencyCode, "NZD");
  assert.equal(rawJob.salaryMin, 70000);
  assert.equal(rawJob.salaryMax, 80000);
  assert.equal(rawJob.salaryPeriod, SALARY_PERIODS.ANNUAL);
  assert.deepEqual(rawJob.employmentTypes, ["Part time"]);
  assert.equal(rawJob.descriptionHtml, "<p>Build &lt;web&gt; apps &amp; APIs</p>");
});

test("mapSeekCard treats hourly or text-only pay as no salary", () => {
  const base = { id: "1", title: "Dev", company: "X", location: "Sydney NSW", workTypeText: "This is a Full time job", summary: "" };
  for (const salaryText of ["$80 – $90 per hour", "Salary + Super", ""]) {
    const rawJob = mapSeekCard({ region: SEEK_AU_REGION, card: { ...base, salaryText } });
    assert.equal(rawJob.salaryMin, null, salaryText);
    assert.equal(rawJob.salaryPeriod, null, salaryText);
  }
});

test("mapSeekCard falls back for a missing company, location and work type", () => {
  const rawJob = mapSeekCard({
    region: SEEK_AU_REGION,
    card: { id: "2", title: "Dev", company: "", location: "", salaryText: "", workTypeText: "", summary: "" },
  });
  assert.equal(rawJob.companyName, "Private advertiser");
  assert.equal(rawJob.city, "Sydney");
  assert.equal(rawJob.countryCode, COUNTRY_CODES.AUSTRALIA);
  assert.equal(rawJob.currencyCode, "AUD");
  assert.deepEqual(rawJob.employmentTypes, []);
});
