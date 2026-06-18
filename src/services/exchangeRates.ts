export type ExchangeRateResult = {
  base: string;
  provider: string;
  rates: Record<string, number>;
  timeLastUpdate?: string | number;
  timeNextUpdate?: string;
};

const DEFAULT_EXCHANGE_RATES_URL = "https://open.er-api.com/v6/latest/USD";
const FALLBACK_EXCHANGE_RATES_URL = "https://api.exchangerate.host/latest";

function getExchangeRateUrls() {
  const configuredUrl = import.meta.env.VITE_EXCHANGE_RATES_URL;
  const urls = [configuredUrl || DEFAULT_EXCHANGE_RATES_URL, FALLBACK_EXCHANGE_RATES_URL];
  return Array.from(new Set(urls));
}

function normalizeRates(payload: any, provider: string): ExchangeRateResult {
  const rates = payload?.rates || payload?.conversion_rates;
  const base = String(payload?.base_code || payload?.base || "USD").toUpperCase();

  if (!rates || typeof rates !== "object") {
    throw new Error("Exchange-rate response did not include a rates object.");
  }

  const normalized = Object.fromEntries(
    Object.entries(rates)
      .map(([code, value]) => [code.toUpperCase(), Number(value)] as [string, number])
      .filter(([, value]) => Number.isFinite(value) && value > 0)
  );

  if (!normalized[base]) {
    normalized[base] = 1;
  }

  if (Object.keys(normalized).length < 2) {
    throw new Error("Exchange-rate response did not include enough currencies.");
  }

  return {
    base,
    provider,
    rates: normalized,
    timeLastUpdate: payload?.time_last_update_utc || payload?.time_last_update_unix || payload?.date,
    timeNextUpdate: payload?.time_next_update_utc
  };
}

export async function getExchangeRates(): Promise<ExchangeRateResult> {
  const urls = getExchangeRateUrls();
  let lastError: unknown;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return normalizeRates(data, url);
    } catch (error) {
      lastError = error;
      console.error("Exchange-rate API error:", error);
    }
  }

  throw lastError || new Error("Unable to load exchange rates.");
}
