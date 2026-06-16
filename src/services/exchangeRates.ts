export type ExchangeRateResult = {
  error?: string;
  mode: "live" | "demo";
  rates: Record<string, number>;
};

export const fallbackRates: Record<string, number> = {
  USD: 1,
  CAD: 1.37,
  MXN: 18.2,
  EUR: 0.92,
  GBP: 0.78,
  MAD: 10.0,
  BRL: 5.3,
  JPY: 157,
  ARS: 925,
  AUD: 1.52,
  CHF: 0.9,
  CNY: 7.24,
  COP: 3900,
  EGP: 48.5,
  JOD: 0.71,
  KRW: 1380,
  QAR: 3.64,
  SAR: 3.75,
  TRY: 32.5,
  UYU: 39.2,
  ZAR: 18.1
};

function normalizeRates(payload: any) {
  const rates = payload?.rates || payload?.conversion_rates || payload?.data?.rates;

  if (!rates || typeof rates !== "object") {
    throw new Error("Exchange-rate response did not include a rates object.");
  }

  const normalized = Object.fromEntries(
    Object.entries(rates)
      .map(([code, value]) => ({
        code: code.toUpperCase(),
        value: Number(value)
      }))
      .filter(({ value }) => Number.isFinite(value) && value > 0)
      .map(({ code, value }) => [code, value])
  );

  if (!normalized.USD) {
    throw new Error("Exchange-rate response must include USD-based rates.");
  }

  return {
    ...fallbackRates,
    ...normalized
  };
}

export async function getExchangeRates(): Promise<ExchangeRateResult> {
  const url = import.meta.env.VITE_EXCHANGE_RATES_URL;

  if (!url) {
    return {
      mode: "demo",
      rates: fallbackRates
    };
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Exchange-rate provider returned ${response.status}.`);
    }

    const data = await response.json();
    const rates = normalizeRates(data);

    return { mode: "live", rates };
  } catch (error: any) {
    return {
      error: error?.message || "Could not load live exchange rates.",
      mode: "demo",
      rates: fallbackRates
    };
  }
}
