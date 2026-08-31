import type { TravelCitation } from "../../lib/fanAtlasAIContracts";
import type { FanAtlasAIReleaseMode } from "../../lib/fanAtlasAIContracts";
import type { TravelToolId } from "../../lib/travelIntelligenceTypes";

export type TravelFreshnessClass = "live" | "recent" | "dated" | "unknown" | "expired";
export type TravelSourceQuality =
  | "official_government"
  | "official_embassy"
  | "official_tourism"
  | "official_transport"
  | "official_airport"
  | "official_emergency"
  | "authoritative_health"
  | "recognized_weather"
  | "reputable_secondary"
  | "unknown";

export type TravelFreshness = {
  class: TravelFreshnessClass;
  retrievedAt: string;
  expiresAt?: string;
  staleAt?: string;
};

export type TravelToolWarningCode =
  | "missing_destination"
  | "ambiguous_destination"
  | "invalid_coordinates"
  | "outside_forecast_horizon"
  | "provider_disabled"
  | "provider_unavailable"
  | "provider_timeout"
  | "malformed_provider_response"
  | "stale_cache_used"
  | "unsupported_currency"
  | "unsupported_country"
  | "source_not_allowed"
  | "current_information_unavailable";

export type TravelToolWarning = {
  code: TravelToolWarningCode;
  messageKey: string;
};

export type TravelToolResult<T = unknown> = {
  version: "1";
  toolId: TravelToolId;
  status: "completed" | "partial" | "unavailable" | "failed";
  data?: T;
  citations: TravelCitation[];
  retrievedAt: string;
  freshness: TravelFreshness;
  warnings: TravelToolWarning[];
  sourceQuality: TravelSourceQuality;
  cache: "hit" | "stale_hit" | "miss" | "disabled";
};

export type ToolExecutionContext = {
  requestId: string;
  userId: string;
  releaseMode: FanAtlasAIReleaseMode;
  locale: string;
  now: Date;
  mockMode: boolean;
  liveDatabaseValidated: boolean;
};

export type ValidatedTravelToolRequest = {
  toolId: TravelToolId;
  input: Record<string, unknown>;
};

export type FanAtlasToolExecutor = {
  execute(
    request: ValidatedTravelToolRequest,
    context: ToolExecutionContext,
    signal?: AbortSignal
  ): Promise<TravelToolResult>;
};

export type WeatherLookupInput = {
  destinationLabel: string;
  latitude: number;
  longitude: number;
  startDate: string;
  durationDays: number;
  units: "metric" | "imperial";
  locale: "en" | "es" | "fr" | "ar" | "pt";
};

export type WeatherLookupData = {
  destination: string;
  forecastStart: string;
  forecastEnd: string;
  units: "metric" | "imperial";
  daily: Array<{
    date: string;
    condition: string;
    temperatureMin: number | null;
    temperatureMax: number | null;
    precipitationChance: number | null;
  }>;
  alerts: Array<{
    title: string;
    severity: "watch" | "warning" | "advisory";
    effectiveAt?: string;
    expiresAt?: string;
  }>;
};

export type CurrencyConversionInput = {
  baseCurrency: string;
  targetCurrency: string;
  amount?: number;
  locale: "en" | "es" | "fr" | "ar" | "pt";
};

export type CurrencyConversionData = {
  baseCurrency: string;
  targetCurrency: string;
  amount?: number;
  rate: number;
  convertedAmount?: number;
  rateDate: string;
};

export type EmergencyInformationInput = {
  country: string;
  category: "general" | "police" | "ambulance" | "fire";
  locale: "en" | "es" | "fr" | "ar" | "pt";
};

export type EmergencyInformationData = {
  country: string;
  category: "general" | "police" | "ambulance" | "fire";
  phoneNumber: string;
  availabilityNote: string;
  reviewedAt: string;
  sosPath: "/sos";
};

export type DestinationCurrentInformationInput = {
  destination: string;
  category: "advisory" | "airport" | "transport" | "tourism" | "health" | "events";
  maxResults: number;
  locale: "en" | "es" | "fr" | "ar" | "pt";
};

export type DestinationCurrentInformationData = {
  destination: string;
  category: DestinationCurrentInformationInput["category"];
  findings: Array<{
    title: string;
    source: string;
    url: string;
    fact: string;
    sourceQuality: TravelSourceQuality;
    retrievedAt: string;
    updatedAt?: string;
  }>;
};

export type ToolProviderConfig = {
  weatherEnabled: boolean;
  weatherProvider: "open_meteo" | "mock" | "disabled";
  currencyEnabled: boolean;
  currencyProvider: "open_er_api" | "mock" | "disabled";
  emergencyInfoEnabled: boolean;
  currentResearchEnabled: boolean;
  currentResearchProvider: "configured_allowlist" | "mock" | "disabled";
  liveDatabaseValidated: boolean;
  toolTimeoutMs: number;
};

export type LiveToolCachePolicy = {
  toolId: TravelToolId;
  cacheable: boolean;
  ttlMs: number;
  staleMs: number;
  allowStale: boolean;
  highStakes: boolean;
};

export const LIVE_TOOL_CACHE_POLICIES: readonly LiveToolCachePolicy[] = [
  { toolId: "weather_lookup", cacheable: true, ttlMs: 30 * 60_000, staleMs: 10 * 60_000, allowStale: true, highStakes: false },
  { toolId: "currency_conversion", cacheable: true, ttlMs: 15 * 60_000, staleMs: 5 * 60_000, allowStale: true, highStakes: false },
  { toolId: "emergency_services_lookup", cacheable: false, ttlMs: 0, staleMs: 0, allowStale: false, highStakes: true },
  { toolId: "destination_current_information", cacheable: true, ttlMs: 60 * 60_000, staleMs: 15 * 60_000, allowStale: false, highStakes: true }
];

export function liveToolCachePolicy(toolId: TravelToolId) {
  return LIVE_TOOL_CACHE_POLICIES.find((policy) => policy.toolId === toolId);
}

export function toolUnavailable<T>(
  toolId: TravelToolId,
  now: Date,
  code: TravelToolWarningCode,
  cache: TravelToolResult["cache"] = "disabled"
): TravelToolResult<T> {
  const retrievedAt = now.toISOString();
  return {
    version: "1",
    toolId,
    status: "unavailable",
    citations: [],
    retrievedAt,
    freshness: { class: "unknown", retrievedAt },
    warnings: [{ code, messageKey: `fanAtlasAI.tool.warning.${code}` }],
    sourceQuality: "unknown",
    cache
  };
}
