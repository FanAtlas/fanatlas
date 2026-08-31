import { MemoryToolCache } from "../src/server/tools/toolCache";
import { executeCurrencyTool } from "../src/server/tools/currencyTool";
import { executeCurrentTravelResearchTool } from "../src/server/tools/currentTravelResearchTool";
import { executeWeatherTool } from "../src/server/tools/weatherTool";
import type { ToolExecutionContext, ToolProviderConfig, TravelToolResult, WeatherLookupInput, CurrencyConversionInput, DestinationCurrentInformationInput, WeatherLookupData, CurrencyConversionData, DestinationCurrentInformationData } from "../src/server/tools/toolContracts";
import { readToolProviderConfig } from "../src/server/tools/toolExecutor";
import type {
  TripDayCurrencyContextRequest,
  TripDayCurrencyContextResult,
  TripDayLiveContextIdentity,
  TripDayLiveContextRequest,
  TripDayOfficialFinding,
  TripDayOfficialUpdatesContextRequest,
  TripDayOfficialUpdatesContextResult,
  TripDayWeatherContextRequest,
  TripDayWeatherContextResult
} from "../src/lib/tripDayLiveContext";

declare const process: {
  env: Record<string, string | undefined>;
};

const cache = new MemoryToolCache();
const ALLOWED_UPDATE_CATEGORIES = new Set<DestinationCurrentInformationInput["category"]>(["advisory", "airport", "transport", "tourism", "health"]);

type ServerConfig = ToolProviderConfig & {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  mockMode: boolean;
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed", errorCode: "invalid_request" });

  const config = readServerConfig();
  const user = await authenticateRequest(req, config);
  if (!user) return res.status(401).json({ error: "Unauthorized", errorCode: "unauthenticated" });

  const validation = validateRequest(req.body);
  if (validation.ok === false) return res.status(400).json({ error: validation.error, errorCode: "invalid_request" });

  const context: ToolExecutionContext = {
    requestId: validation.request.requestId,
    userId: user.id,
    releaseMode: "internal",
    locale: validation.request.locale,
    now: new Date(),
    mockMode: config.mockMode,
    liveDatabaseValidated: config.liveDatabaseValidated
  };

  try {
    if (validation.request.action === "weather") {
      const result = await executeWeather(validation.request, context, config);
      return res.status(200).json(result);
    }

    if (validation.request.action === "currency") {
      const result = await executeCurrency(validation.request, context, config);
      return res.status(200).json(result);
    }

    const result = await executeOfficialUpdates(validation.request, context, config);
    return res.status(200).json(result);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "provider_timeout") return res.status(504).json({ error: "Timed out", errorCode: "provider_timeout" });
    if (code === "provider_rate_limited") return res.status(429).json({ error: "Rate limited", errorCode: "provider_rate_limited" });
    if (code === "provider_unavailable") return res.status(503).json({ error: "Unavailable", errorCode: "provider_unavailable" });
    if (code === "invalid_request") return res.status(400).json({ error: "Invalid request", errorCode: "invalid_request" });
    return res.status(500).json({ error: "Server error", errorCode: "server_error" });
  }
}

async function executeWeather(
  request: TripDayWeatherContextRequest,
  context: ToolExecutionContext,
  config: ServerConfig
): Promise<TripDayWeatherContextResult> {
  const input: WeatherLookupInput = {
    destinationLabel: request.destination.label,
    latitude: request.destination.latitude || 0,
    longitude: request.destination.longitude || 0,
    startDate: request.currentDate,
    durationDays: 1,
    units: request.units,
    locale: request.locale
  };
  const result = await executeWeatherTool({ toolId: "weather_lookup", input }, context, config, cache);
  return normalizeWeatherResult(request, result);
}

async function executeCurrency(
  request: TripDayCurrencyContextRequest,
  context: ToolExecutionContext,
  config: ServerConfig
): Promise<TripDayCurrencyContextResult> {
  const input: CurrencyConversionInput = {
    baseCurrency: request.baseCurrency,
    targetCurrency: request.targetCurrency,
    amount: request.amount,
    locale: request.locale
  };
  const result = await executeCurrencyTool({ toolId: "currency_conversion", input }, context, config, cache);
  return normalizeCurrencyResult(request, result);
}

async function executeOfficialUpdates(
  request: TripDayOfficialUpdatesContextRequest,
  context: ToolExecutionContext,
  config: ServerConfig
): Promise<TripDayOfficialUpdatesContextResult> {
  const findings: TripDayOfficialFinding[] = [];
  const citations: TravelToolResult["citations"] = [];
  const warningCodes = new Set<string>();
  let freshest: TravelToolResult<DestinationCurrentInformationData> | null = null;
  let sourceQuality: string | null = null;

  for (const category of request.categories) {
    if (!ALLOWED_UPDATE_CATEGORIES.has(category)) continue;
    const input: DestinationCurrentInformationInput = {
      destination: request.destination.label,
      category,
      maxResults: 1,
      locale: request.locale
    };
    const result = await executeCurrentTravelResearchTool({ toolId: "destination_current_information", input }, context, config, cache);
    if (result.warnings.length) result.warnings.forEach((warning) => warningCodes.add(warning.code));
    if (result.status === "completed" || result.status === "partial") {
      freshest ||= result;
      sourceQuality ||= result.sourceQuality;
      citations.push(...result.citations);
      for (const finding of result.data?.findings || []) {
        findings.push({
          ...finding,
          category
        });
      }
    }
  }

  const retrievedAt = freshest?.retrievedAt || context.now.toISOString();
  const freshness = freshest?.freshness || { class: "unknown" as const, retrievedAt };
  const status = findings.length > 0 ? (findings.length < request.categories.length ? "partial" : "success") : "unavailable";
  return {
    kind: "official_updates",
    requestId: request.requestId,
    currentDate: request.currentDate,
    identity: request.identity,
    status,
    retrievedAt: findings.length > 0 ? retrievedAt : null,
    freshness: findings.length > 0 ? freshness : null,
    source: freshest?.citations[0]?.source || null,
    sourceQuality,
    warningCodes: [...warningCodes],
    destination: request.destination.label,
    categoryCount: request.categories.length,
    findings,
    citationCount: citations.length,
    unavailableReason: findings.length > 0 ? undefined : "current_information_unavailable"
  };
}

function normalizeWeatherResult(
  request: TripDayWeatherContextRequest,
  result: TravelToolResult<WeatherLookupData>
): TripDayWeatherContextResult {
  const targetDate = request.currentDate;
  const targetDay = result.data?.daily.find((entry) => entry.date === targetDate) || result.data?.daily[0] || null;
  return {
    kind: "weather",
    requestId: request.requestId,
    currentDate: request.currentDate,
    identity: request.identity,
    status: result.status === "completed" ? "success" : result.status === "partial" ? "partial" : result.status === "unavailable" ? "unavailable" : "error",
    retrievedAt: result.retrievedAt || null,
    freshness: result.freshness || null,
    source: result.citations[0]?.source || null,
    sourceQuality: result.sourceQuality || null,
    warningCodes: result.warnings.map((warning) => warning.code),
    destination: result.data?.destination || request.destination.label,
    date: targetDay?.date || request.currentDate,
    forecastStart: result.data?.forecastStart || targetDay?.date || null,
    forecastEnd: result.data?.forecastEnd || targetDay?.date || null,
    units: result.data?.units || request.units,
    daily: result.data?.daily || [],
    alerts: result.data?.alerts || [],
    citationCount: result.citations.length,
    unavailableReason: result.status === "unavailable" ? result.warnings[0]?.code : undefined
  };
}

function normalizeCurrencyResult(
  request: TripDayCurrencyContextRequest,
  result: TravelToolResult<CurrencyConversionData>
): TripDayCurrencyContextResult {
  return {
    kind: "currency",
    requestId: request.requestId,
    currentDate: request.currentDate,
    identity: request.identity,
    status: result.status === "completed" ? "success" : result.status === "partial" ? "partial" : result.status === "unavailable" ? "unavailable" : "error",
    retrievedAt: result.retrievedAt || null,
    freshness: result.freshness || null,
    source: result.citations[0]?.source || null,
    sourceQuality: result.sourceQuality || null,
    warningCodes: result.warnings.map((warning) => warning.code),
    baseCurrency: result.data?.baseCurrency || request.baseCurrency,
    targetCurrency: result.data?.targetCurrency || request.targetCurrency,
    amount: result.data?.amount ?? request.amount,
    rate: result.data?.rate ?? null,
    convertedAmount: result.data?.convertedAmount ?? null,
    rateDate: result.data?.rateDate || null,
    citationCount: result.citations.length,
    ratesMayChange: true,
    unavailableReason: result.status === "unavailable" ? result.warnings[0]?.code : undefined
  };
}

function validateRequest(body: any):
  | { ok: true; request: TripDayLiveContextRequest & { requestId: string } }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Missing request body." };
  if (body.version !== "1") return { ok: false, error: "Unsupported request version." };
  if (body.action === "weather") return validateWeatherRequest(body);
  if (body.action === "currency") return validateCurrencyRequest(body);
  if (body.action === "official_updates") return validateOfficialUpdatesRequest(body);
  return { ok: false, error: "Unsupported action." };
}

function validateWeatherRequest(body: any) {
  if (!isSafeIdentity(body.identity)) return { ok: false as const, error: "Invalid identity." };
  if (!isValidDate(body.currentDate)) return { ok: false as const, error: "Invalid date." };
  if (!body.destination || !isLatitude(body.destination.latitude) || !isLongitude(body.destination.longitude) || !body.destination.label) {
    return { ok: false as const, error: "Invalid destination." };
  }
  if (typeof body.destination.label === "string" && /https?:|javascript:|data:/i.test(body.destination.label)) {
    return { ok: false as const, error: "Invalid destination." };
  }
  const locale = normalizeLocale(body.locale);
  return {
    ok: true as const,
      request: {
      action: "weather" as const,
      requestId: safeRequestId(body.requestId),
      locale,
      currentDate: String(body.currentDate).slice(0, 10),
      identity: normalizeIdentity(body.identity),
      destination: normalizeDestination(body.destination),
      units: body.units === "imperial" ? "imperial" as const : "metric" as const
    }
  };
}

function validateCurrencyRequest(body: any) {
  if (!isSafeIdentity(body.identity)) return { ok: false as const, error: "Invalid identity." };
  if (!isValidDate(body.currentDate)) return { ok: false as const, error: "Invalid date." };
  if (typeof body.baseCurrency !== "string" || typeof body.targetCurrency !== "string") {
    return { ok: false as const, error: "Invalid currencies." };
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) return { ok: false as const, error: "Invalid amount." };
  const locale = normalizeLocale(body.locale);
  return {
    ok: true as const,
      request: {
      action: "currency" as const,
      requestId: safeRequestId(body.requestId),
      locale,
      currentDate: String(body.currentDate).slice(0, 10),
      identity: normalizeIdentity(body.identity),
      baseCurrency: body.baseCurrency,
      targetCurrency: body.targetCurrency,
      amount
    }
  };
}

function validateOfficialUpdatesRequest(body: any) {
  if (!isSafeIdentity(body.identity)) return { ok: false as const, error: "Invalid identity." };
  if (!isValidDate(body.currentDate)) return { ok: false as const, error: "Invalid date." };
  if (!body.destination || typeof body.destination.label !== "string") return { ok: false as const, error: "Invalid destination." };
  if (/https?:|javascript:|data:/i.test(body.destination.label)) return { ok: false as const, error: "Invalid destination." };
  const categories = Array.isArray(body.categories) ? body.categories.filter((category) => ALLOWED_UPDATE_CATEGORIES.has(category)) : [];
  if (categories.length === 0) return { ok: false as const, error: "No allowed update categories." };
  return {
    ok: true as const,
      request: {
      action: "official_updates" as const,
      requestId: safeRequestId(body.requestId),
      locale: normalizeLocale(body.locale),
      currentDate: String(body.currentDate).slice(0, 10),
      identity: normalizeIdentity(body.identity),
      destination: normalizeDestination(body.destination),
      categories
    }
  };
}

function normalizeIdentity(identity: any): TripDayLiveContextIdentity {
  return {
    tripId: typeof identity.tripId === "string" ? identity.tripId : null,
    dayId: typeof identity.dayId === "string" ? identity.dayId : null,
    selectedDate: typeof identity.selectedDate === "string" ? identity.selectedDate : null,
    nextPlaceId: typeof identity.nextPlaceId === "string" ? identity.nextPlaceId : null
  };
}

function normalizeDestination(destination: any) {
  return {
    label: String(destination.label).slice(0, 120),
    city: typeof destination.city === "string" ? destination.city.slice(0, 100) : undefined,
    country: typeof destination.country === "string" ? destination.country.slice(0, 100) : undefined,
    countryCode: typeof destination.countryCode === "string" ? destination.countryCode.slice(0, 8).toUpperCase() : undefined,
    latitude: Number(destination.latitude),
    longitude: Number(destination.longitude),
    currency: typeof destination.currency === "string" ? destination.currency.slice(0, 8).toUpperCase() : undefined,
    timezone: typeof destination.timezone === "string" ? destination.timezone.slice(0, 80) : undefined
  };
}

function isSafeIdentity(identity: any) {
  return identity && typeof identity === "object" && !Object.keys(identity).some((key) => key === "__proto__" || key === "constructor" || key === "prototype");
}

function isValidDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isLatitude(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= -90 && number <= 90;
}

function isLongitude(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= -180 && number <= 180;
}

function normalizeLocale(value: unknown) {
  return ["en", "es", "fr", "ar", "pt"].includes(String(value)) ? String(value) as TripDayWeatherContextRequest["locale"] : "en";
}

function safeRequestId(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length < 200 ? value : `trip-day-live-${Date.now()}`;
}

function readServerConfig(): ServerConfig {
  const toolConfig = readToolProviderConfig();
  return {
    ...toolConfig,
    mockMode: process.env.FANATLAS_TRIP_DAY_LIVE_CONTEXT_MOCK === "true",
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  };
}

async function authenticateRequest(req: any, config: ServerConfig): Promise<{ id: string; email?: string } | null> {
  const token = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  if (config.mockMode && token === "test-token") return { id: "test-user", email: "test@example.com" };
  if (!config.supabaseUrl || !config.supabaseAnonKey) return null;
  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) return null;
  const user = await response.json().catch(() => ({}));
  return user?.id ? { id: String(user.id), email: typeof user.email === "string" ? user.email : undefined } : null;
}
