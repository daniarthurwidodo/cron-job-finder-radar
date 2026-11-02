import assert from "node:assert/strict";
import { test } from "node:test";
import { COUNTRY_CODES, LINKEDIN_LOCATIONS } from "@/lib/constants";
import { mapLinkedInCard, readCredentials } from "@/lib/scrapers/linkedin";

const SINGAPORE = LINKEDIN_LOCATIONS.find((location) => location.countryCode === COUNTRY_CODES.SINGAPORE)!;

test("mapLinkedInCard maps a card and escapes the description", () => {
  const rawJob = mapLinkedInCard({
    card: { id: "123", title: "Full Stack Developer", company: "Acme", location: "Singapore" },
    location: SINGAPORE,
    description: "Node.js & <React>",
  });
  assert.equal(rawJob.sourceCode, "linkedin");
  assert.equal(rawJob.sourceUrl, "https://www.linkedin.com/jobs/view/123/");
  assert.equal(rawJob.currencyCode, "SGD");
  assert.equal(rawJob.descriptionHtml, "<p>Node.js &amp; &lt;React&gt;</p>");
  assert.equal(rawJob.salaryMin, null);
});

test("mapLinkedInCard falls back for missing company and location", () => {
  const rawJob = mapLinkedInCard({ card: { id: "1", title: "Dev", company: "", location: "" }, location: SINGAPORE, description: "" });
  assert.equal(rawJob.companyName, "Company not shown");
  assert.equal(rawJob.city, "Singapore");
});

test("readCredentials requires both variables and never echoes their values", () => {
  assert.deepEqual(readCredentials({ LINKEDIN_EMAIL: "a@b.test", LINKEDIN_PASSWORD: "secret" }), { email: "a@b.test", password: "secret" });
  for (const env of [{}, { LINKEDIN_EMAIL: "a@b.test" }, { LINKEDIN_PASSWORD: "secret" }, { LINKEDIN_EMAIL: "", LINKEDIN_PASSWORD: "secret" }]) {
    assert.throws(
      () => readCredentials(env),
      (error: Error) => !error.message.includes("secret") && !error.message.includes("a@b.test"),
    );
  }
});
