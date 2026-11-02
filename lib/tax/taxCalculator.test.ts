import assert from "node:assert/strict";
import { test } from "node:test";
import { SG_TAX_BANDS } from "@/lib/constants";
import { calculateAnnualTax, progressiveTax } from "@/lib/tax/taxCalculator";

const CENT_PRECISION = 2;

function round(value: number): number {
  return Number(value.toFixed(CENT_PRECISION));
}

test("SG matches IRAS YA 2026 worked examples", () => {
  assert.equal(round(progressiveTax({ income: 34750, bands: SG_TAX_BANDS })), 366.25);
  assert.equal(round(progressiveTax({ income: 234100, bands: SG_TAX_BANDS })), 27629);
});

test("SG tax is zero at or below the first band and rises above it", () => {
  assert.equal(calculateAnnualTax({ countryCode: "SG", annualGross: 20000 }), 0);
  assert.equal(calculateAnnualTax({ countryCode: "SG", annualGross: 0 }), 0);
  assert.ok(calculateAnnualTax({ countryCode: "SG", annualGross: 120000 }) > 0);
});

test("NZ: income tax bands plus ACC levy (hand-calculated from IRD bands)", () => {
  const incomeTax = 15600 * 0.105 + (53500 - 15600) * 0.175 + (60000 - 53500) * 0.3;
  const accLevy = 60000 * 0.0175;
  assert.equal(round(calculateAnnualTax({ countryCode: "NZ", annualGross: 60000 })), round(incomeTax + accLevy));
});

test("NZ: ACC levy is capped at the maximum liable earnings", () => {
  const atCap = calculateAnnualTax({ countryCode: "NZ", annualGross: 156641 });
  const aboveCap = calculateAnnualTax({ countryCode: "NZ", annualGross: 256641 });
  const extraIncomeTax = (180000 - 156641) * 0.33 + (256641 - 180000) * 0.39;
  assert.equal(round(aboveCap - atCap), round(extraIncomeTax));
});

test("MY: personal relief, bands and RM400 rebate (hand-calculated from LHDN bands)", () => {
  const chargeable = 100000 - 9000;
  const expected = 15000 * 0.01 + 15000 * 0.03 + 15000 * 0.06 + 20000 * 0.11 + (chargeable - 70000) * 0.19;
  assert.equal(round(calculateAnnualTax({ countryCode: "MY", annualGross: 100000 })), round(expected));
  assert.equal(calculateAnnualTax({ countryCode: "MY", annualGross: 40000 }), 80);
  assert.equal(calculateAnnualTax({ countryCode: "MY", annualGross: 34000 }), 0);
  assert.equal(calculateAnnualTax({ countryCode: "MY", annualGross: 9000 }), 0);
});

test("rejects unknown country and invalid income", () => {
  assert.throws(() => calculateAnnualTax({ countryCode: "XX", annualGross: 1 }));
  assert.throws(() => calculateAnnualTax({ countryCode: "SG", annualGross: Number.NaN }));
  assert.throws(() => calculateAnnualTax({ countryCode: "SG", annualGross: -1 }));
});

test("AU: resident bands plus 2% Medicare levy (hand-calculated from ATO 2026-27 bands)", () => {
  assert.equal(round(calculateAnnualTax({ countryCode: "AU", annualGross: 100000 })), round(4020 + 16500 + 2000));
  assert.equal(round(calculateAnnualTax({ countryCode: "AU", annualGross: 250000 })), round(4020 + 27000 + 20350 + 27000 + 5000));
  assert.equal(round(calculateAnnualTax({ countryCode: "AU", annualGross: 18200 })), round(18200 * 0.02));
  assert.equal(calculateAnnualTax({ countryCode: "AU", annualGross: 0 }), 0);
});
