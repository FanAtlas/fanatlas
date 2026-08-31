import type { TravelCitation } from "../../lib/fanAtlasAIContracts";
import { createToolCacheKey, type ToolCache } from "./toolCache";
import {
  toolUnavailable,
  type CurrencyConversionData,
  type CurrencyConversionInput,
  type ToolExecutionContext,
  type ToolProviderConfig,
  type TravelToolResult,
  type ValidatedTravelToolRequest
} from "./toolContracts";

const CURRENCY_TTL_MS = 60 * 60_000;
const CURRENCY_STALE_MS = 15 * 60_000;
export const SUPPORTED_CURRENCY_CODES = new Set([
  "USD", "EUR", "GBP", "CAD", "MXN", "MAD", "AED", "JPY", "KRW", "TRY", "EGP", "SAR", "BRL", "ARS", "CHF", "AUD", "NZD"
]);

export async function executeCurrencyTool(
  request: ValidatedTravelToolRequest,
  context: ToolExecutionContext,
  config: ToolProviderConfig,
  cache: ToolCache,
  signal?: AbortSignal
): Promise<TravelToolResult<CurrencyConversionData>> {
  const input = validateCurrencyInput(request.input, context.locale);
  if (input.ok === false) return toolUnavailable("currency_conversion", context.now, input.code);
  if (!config.currencyEnabled || config.currencyProvider === "disabled") return toolUnavailable("currency_conversion", context.now, "provider_disabled");
  if (!context.mockMode && !context.liveDatabaseValidated) return toolUnavailable("currency_conversion", context.now, "current_information_unavailable");

  const key = createToolCacheKey({
    toolId: "currency_conversion",
    provider: config.currencyProvider,
    base: input.value.baseCurrency,
    target: input.value.targetCurrency,
    amount: input.value.amount,
    locale: input.value.locale
  });
  const cached = cache.get(key, context.now);
  if (cached.value && cached.status !== "miss") {
    return {
      ...(cached.value as TravelToolResult<CurrencyConversionData>),
      cache: cached.status === "stale" ? "stale_hit" : "hit",
      freshness: { ...cached.value.freshness, class: cached.status === "stale" ? "dated" : cached.value.freshness.class },
      warnings: cached.status === "stale"
        ? [...cached.value.warnings, { code: "stale_cache_used", messageKey: "fanAtlasAI.tool.warning.stale_cache_used" }]
        : cached.value.warnings
    };
  }

  const result = config.currencyProvider === "mock"
    ? currencyEnvelope(input.value, 0.92, context.now, "Mock exchange-rate fixture", "https://example.test/exchange-rates")
    : await fetchExchangeRate(input.value, context.now, signal);
  cache.set(key, result, CURRENCY_TTL_MS, CURRENCY_STALE_MS, context.now);
  return result;
}

function validateCurrencyInput(input: Record<string, unknown>, locale: string):
  | { ok: true; value: CurrencyConversionInput }
  | { ok: false; code: "unsupported_currency" } {
  if (Object.keys(input).some((key) => key === "__proto__" || key === "constructor" || key === "prototype")) {
    return { ok: false, code: "unsupported_currency" };
  }
  const baseCurrency = String(input.baseCurrency || "").trim().toUpperCase();
  const targetCurrency = String(input.targetCurrency || "").trim().toUpperCase();
  const amount = input.amount === undefined || input.amount === null || input.amount === ""
    ? undefined
    : Number(input.amount);
  const supportedLocale = ["en", "es", "fr", "ar", "pt"].includes(locale) ? locale as CurrencyConversionInput["locale"] : "en";
  if (!SUPPORTED_CURRENCY_CODES.has(baseCurrency) || !SUPPORTED_CURRENCY_CODES.has(targetCurrency)) return { ok: false, code: "unsupported_currency" };
  if (amount !== undefined && (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000)) return { ok: false, code: "unsupported_currency" };
  return { ok: true, value: { baseCurrency, targetCurrency, amount, locale: supportedLocale } };
}

async function fetchExchangeRate(input: CurrencyConversionInput, now: Date, signal?: AbortSignal): Promise<TravelToolResult<CurrencyConversionData>> {
  if (input.baseCurrency === input.targetCurrency) {
    return currencyEnvelope(input, 1, now, "Same-currency conversion", undefined);
  }
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(input.baseCurrency)}`;
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) return toolUnavailable("currency_conversion", now, "provider_unavailable", "miss");
  const payload = await response.json().catch(() => undefined);
  const rate = Number(payload?.rates?.[input.targetCurrency] || payload?.conversion_rates?.[input.targetCurrency]);
  if (!Number.isFinite(rate) || rate <= 0) return toolUnavailable("currency_conversion", now, "malformed_provider_response", "miss");
  return currencyEnvelope(input, rate, now, "open.er-api.com", "https://open.er-api.com/");
}

function currencyEnvelope(
  input: CurrencyConversionInput,
  rate: number,
  now: Date,
  source: string,
  url: string | undefined
): TravelToolResult<CurrencyConversionData> {
  const retrievedAt = now.toISOString();
  const data: CurrencyConversionData = {
    baseCurrency: input.baseCurrency,
    targetCurrency: input.targetCurrency,
    amount: input.amount,
    rate,
    convertedAmount: input.amount === undefined ? undefined : roundMoney(input.amount * rate),
    rateDate: retrievedAt.slice(0, 10)
  };
  const citations: TravelCitation[] = [{
    id: "currency-rate-source",
    title: "Exchange-rate source",
    source,
    url,
    retrievedAt,
    category: "currency"
  }];
  return {
    version: "1",
    toolId: "currency_conversion",
    status: "completed",
    data,
    citations,
    retrievedAt,
    freshness: {
      class: "live",
      retrievedAt,
      staleAt: new Date(now.getTime() + CURRENCY_STALE_MS).toISOString(),
      expiresAt: new Date(now.getTime() + CURRENCY_TTL_MS).toISOString()
    },
    warnings: [],
    sourceQuality: "reputable_secondary",
    cache: "miss"
  };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
