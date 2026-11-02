import {
  FX_API_URL,
  FX_BASE_CURRENCY,
  FX_REQUEST_TIMEOUT_MS,
  FX_TARGET_CURRENCIES,
  IDR_CURRENCY_CODE,
} from "@/lib/constants";

export type RatesToIdr = Record<string, number>;
export type FetchRatesToIdr = () => Promise<RatesToIdr>;

interface RatesResponse {
  result?: string;
  rates?: Record<string, number>;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function toRatesToIdr(rates: Record<string, number>): RatesToIdr {
  const idrPerBase = rates[IDR_CURRENCY_CODE];
  if (!isPositiveNumber(idrPerBase)) throw new Error("Rates response has no valid IDR rate");
  const ratesToIdr: RatesToIdr = {};
  for (const currency of FX_TARGET_CURRENCIES) {
    const currencyPerBase = currency === FX_BASE_CURRENCY ? 1 : rates[currency];
    if (!isPositiveNumber(currencyPerBase)) throw new Error(`Rates response has no valid ${currency} rate`);
    ratesToIdr[currency] = idrPerBase / currencyPerBase;
  }
  return ratesToIdr;
}

export const fetchRatesToIdr: FetchRatesToIdr = async () => {
  const response = await fetch(FX_API_URL, { signal: AbortSignal.timeout(FX_REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Exchange rate API HTTP ${response.status}`);
  const body = (await response.json()) as RatesResponse;
  if (body.result !== "success" || !body.rates) throw new Error("Exchange rate API returned no rates");
  return toRatesToIdr(body.rates);
};
