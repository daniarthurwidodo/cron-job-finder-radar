import {
  AU_MEDICARE_LEVY_RATE,
  AU_TAX_BANDS,
  COUNTRY_CODES,
  MY_PERSONAL_RELIEF,
  MY_REBATE_AMOUNT,
  MY_REBATE_MAX_CHARGEABLE_INCOME,
  MY_TAX_BANDS,
  NZ_ACC_LEVY_RATE,
  NZ_ACC_MAX_LIABLE_EARNINGS,
  NZ_TAX_BANDS,
  SG_TAX_BANDS,
  type TaxBand,
} from "@/lib/constants";

export function progressiveTax({ income, bands }: { income: number; bands: TaxBand[] }): number {
  let tax = 0;
  let lowerBound = 0;
  for (const band of bands) {
    if (income <= lowerBound) break;
    const upperBound = band.upTo ?? Number.POSITIVE_INFINITY;
    tax += (Math.min(income, upperBound) - lowerBound) * band.rate;
    lowerBound = upperBound;
  }
  return tax;
}

function calculateSingaporeTax(annualGross: number): number {
  return progressiveTax({ income: annualGross, bands: SG_TAX_BANDS });
}

function calculateNewZealandTax(annualGross: number): number {
  const incomeTax = progressiveTax({ income: annualGross, bands: NZ_TAX_BANDS });
  const accLevy = Math.min(annualGross, NZ_ACC_MAX_LIABLE_EARNINGS) * NZ_ACC_LEVY_RATE;
  return incomeTax + accLevy;
}

function calculateAustraliaTax(annualGross: number): number {
  return progressiveTax({ income: annualGross, bands: AU_TAX_BANDS }) + annualGross * AU_MEDICARE_LEVY_RATE;
}

function calculateMalaysiaTax(annualGross: number): number {
  const chargeableIncome = Math.max(annualGross - MY_PERSONAL_RELIEF, 0);
  const tax = progressiveTax({ income: chargeableIncome, bands: MY_TAX_BANDS });
  const rebate = chargeableIncome <= MY_REBATE_MAX_CHARGEABLE_INCOME ? MY_REBATE_AMOUNT : 0;
  return Math.max(tax - rebate, 0);
}

const ANNUAL_TAX_CALCULATORS: Record<string, (annualGross: number) => number> = {
  [COUNTRY_CODES.SINGAPORE]: calculateSingaporeTax,
  [COUNTRY_CODES.NEW_ZEALAND]: calculateNewZealandTax,
  [COUNTRY_CODES.MALAYSIA]: calculateMalaysiaTax,
  [COUNTRY_CODES.AUSTRALIA]: calculateAustraliaTax,
};

export function calculateAnnualTax({ countryCode, annualGross }: { countryCode: string; annualGross: number }): number {
  const calculator = ANNUAL_TAX_CALCULATORS[countryCode];
  if (!calculator) throw new Error(`No tax profile for country: ${countryCode}`);
  if (!Number.isFinite(annualGross) || annualGross < 0) throw new Error(`Invalid annual gross: ${annualGross}`);
  return calculator(annualGross);
}
