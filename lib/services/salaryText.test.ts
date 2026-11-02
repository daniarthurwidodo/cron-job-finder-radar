import assert from "node:assert/strict";
import { test } from "node:test";
import { SALARY_PERIODS } from "@/lib/constants";
import { parseSalaryText } from "@/lib/services/salaryText";

test("parses Michael Page style monthly range and ignores the yearly echo", () => {
  assert.deepEqual(parseSalaryText("SG$20,000 - SG$40,000 per month (SG$240,000 - SG$480,000 per year)"), {
    min: 20000,
    max: 40000,
    period: SALARY_PERIODS.MONTHLY,
  });
});

test("parses yearly ranges and k suffix", () => {
  assert.deepEqual(parseSalaryText("$80k - $100k per annum"), { min: 80000, max: 100000, period: SALARY_PERIODS.ANNUAL });
});

test("keeps an unknown period as null and rejects empty or non-numeric text", () => {
  assert.deepEqual(parseSalaryText("RM 2800 - RM 3200"), { min: 2800, max: 3200, period: null });
  assert.equal(parseSalaryText("Competitive"), null);
  assert.equal(parseSalaryText(""), null);
  assert.equal(parseSalaryText(null), null);
});
