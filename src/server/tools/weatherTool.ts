import type { TravelCitation } from "../../lib/fanAtlasAIContracts";
import { destinations } from "../../data/destinations";
import { createToolCacheKey, type ToolCache } from "./toolCache";
import {
  toolUnavailable,
  type ToolExecutionContext,
  type ToolProviderConfig,
  type TravelToolResult,
  type ValidatedTravelToolRequest,
  type WeatherLookupData,
  type WeatherLookupInput
} from "./toolContracts";

const WEATHER_TTL_MS = 30 * 60_000;
const WEATHER_STALE_MS = 10 * 60_000;
const FORECAST_HORIZON_DAYS = 16;

export async function executeWeatherTool(
  request: ValidatedTravelToolRequest,
  context: ToolExecutionContext,
  config: ToolProviderConfig,
  cache: ToolCache,
  signal?: AbortSignal
): Promise<TravelToolResult<WeatherLookupData>> {
  const input = validateWeatherInput(request.input, context.locale, context.now);
  if (input.ok === false) return toolUnavailable("weather_lookup", context.now, input.code);
  if (!config.weatherEnabled || config.weatherProvider === "disabled") return toolUnavailable("weather_lookup", context.now, "provider_disabled");
  if (!context.mockMode && !context.liveDatabaseValidated) return toolUnavailable("weather_lookup", context.now, "current_information_unavailable");

  const key = createToolCacheKey({
    toolId: "weather_lookup",
    provider: config.weatherProvider,
    lat: input.value.latitude.toFixed(3),
    lon: input.value.longitude.toFixed(3),
    start: input.value.startDate,
    days: input.value.durationDays,
    units: input.value.units,
    locale: input.value.locale
  });
  const cached = cache.get(key, context.now);
  if (cached.value && cached.status !== "miss") {
    return {
      ...(cached.value as TravelToolResult<WeatherLookupData>),
      cache: cached.status === "stale" ? "stale_hit" : "hit",
      warnings: cached.status === "stale"
        ? [...cached.value.warnings, { code: "stale_cache_used", messageKey: "fanAtlasAI.tool.warning.stale_cache_used" }]
        : cached.value.warnings,
      freshness: {
        ...cached.value.freshness,
        class: cached.status === "stale" ? "dated" : cached.value.freshness.class
      }
    };
  }

  const result = config.weatherProvider === "mock"
    ? mockWeatherResult(input.value, context.now)
    : await fetchOpenMeteo(input.value, context.now, signal);
  cache.set(key, result, WEATHER_TTL_MS, WEATHER_STALE_MS, context.now);
  return result;
}

export function resolveWeatherInputFromDestination(destinationLabel: string, now = new Date()): WeatherLookupInput | null {
  const normalized = destinationLabel.trim().toLowerCase();
  const match = destinations.find((destination) => {
    const city = destination.city.toLowerCase();
    const country = destination.country.toLowerCase();
    return normalized === city || normalized === country || normalized.includes(city) || normalized.includes(country);
  });
  if (!match) return null;
  return {
    destinationLabel: `${match.city}, ${match.country}`,
    latitude: match.latitude,
    longitude: match.longitude,
    startDate: now.toISOString().slice(0, 10),
    durationDays: 1,
    units: "metric",
    locale: "en"
  };
}

function validateWeatherInput(input: Record<string, unknown>, locale: string, now: Date):
  | { ok: true; value: WeatherLookupInput }
  | { ok: false; code: "missing_destination" | "invalid_coordinates" | "outside_forecast_horizon" } {
  if (Object.keys(input).some((key) => key === "__proto__" || key === "constructor" || key === "prototype")) {
    return { ok: false, code: "missing_destination" };
  }
  const destinationLabel = typeof input.destinationLabel === "string" ? input.destinationLabel.trim().slice(0, 120) : "";
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const durationDays = Math.max(1, Math.min(7, Math.floor(Number(input.durationDays || 1))));
  const units = input.units === "imperial" ? "imperial" : "metric";
  const startDate = typeof input.startDate === "string" ? input.startDate.slice(0, 10) : now.toISOString().slice(0, 10);
  const supportedLocale = ["en", "es", "fr", "ar", "pt"].includes(locale) ? locale as WeatherLookupInput["locale"] : "en";
  if (!destinationLabel) return { ok: false, code: "missing_destination" };
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { ok: false, code: "invalid_coordinates" };
  }
  const start = dateOnlyUtc(startDate);
  if (!start) return { ok: false, code: "outside_forecast_horizon" };
  const today = dateOnlyUtc(now.toISOString().slice(0, 10)) as number;
  const daysAhead = Math.floor((start - today) / 86_400_000);
  if (daysAhead < 0 || daysAhead > FORECAST_HORIZON_DAYS) return { ok: false, code: "outside_forecast_horizon" };
  return {
    ok: true,
    value: { destinationLabel, latitude, longitude, startDate, durationDays, units, locale: supportedLocale }
  };
}

async function fetchOpenMeteo(input: WeatherLookupInput, now: Date, signal?: AbortSignal): Promise<TravelToolResult<WeatherLookupData>> {
  const params = new URLSearchParams({
    latitude: String(input.latitude),
    longitude: String(input.longitude),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
    forecast_days: String(input.durationDays),
    temperature_unit: input.units === "imperial" ? "fahrenheit" : "celsius",
    timezone: "auto"
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" }
  });
  if (!response.ok) return toolUnavailable("weather_lookup", now, "provider_unavailable", "miss");
  const payload = await response.json().catch(() => undefined);
  const times = Array.isArray(payload?.daily?.time) ? payload.daily.time : [];
  if (times.length === 0) return toolUnavailable("weather_lookup", now, "malformed_provider_response", "miss");
  return weatherEnvelope(input, now, times.map((date: string, index: number) => ({
    date,
    condition: weatherCodeLabel(Number(payload?.daily?.weather_code?.[index])),
    temperatureMin: finiteOrNull(payload?.daily?.temperature_2m_min?.[index]),
    temperatureMax: finiteOrNull(payload?.daily?.temperature_2m_max?.[index]),
    precipitationChance: finiteOrNull(payload?.daily?.precipitation_probability_max?.[index])
  })));
}

function mockWeatherResult(input: WeatherLookupInput, now: Date): TravelToolResult<WeatherLookupData> {
  return weatherEnvelope(input, now, [{
    date: input.startDate,
    condition: "partly cloudy",
    temperatureMin: input.units === "imperial" ? 61 : 16,
    temperatureMax: input.units === "imperial" ? 75 : 24,
    precipitationChance: 20
  }]);
}

function weatherEnvelope(input: WeatherLookupInput, now: Date, daily: WeatherLookupData["daily"]): TravelToolResult<WeatherLookupData> {
  const retrievedAt = now.toISOString();
  const citation: TravelCitation = {
    id: "weather-open-meteo",
    title: "Open-Meteo forecast",
    source: "Open-Meteo",
    url: "https://open-meteo.com/",
    retrievedAt,
    category: "recognized_weather"
  };
  return {
    version: "1",
    toolId: "weather_lookup",
    status: "completed",
    data: {
      destination: input.destinationLabel,
      forecastStart: daily[0]?.date || input.startDate,
      forecastEnd: daily[daily.length - 1]?.date || input.startDate,
      units: input.units,
      daily,
      alerts: []
    },
    citations: [citation],
    retrievedAt,
    freshness: {
      class: "live",
      retrievedAt,
      staleAt: new Date(now.getTime() + WEATHER_STALE_MS).toISOString(),
      expiresAt: new Date(now.getTime() + WEATHER_TTL_MS).toISOString()
    },
    warnings: [],
    sourceQuality: "recognized_weather",
    cache: "miss"
  };
}

function dateOnlyUtc(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return Date.parse(`${value}T00:00:00Z`);
}

function finiteOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function weatherCodeLabel(code: number) {
  if ([0, 1].includes(code)) return "clear";
  if ([2, 3].includes(code)) return "cloudy";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 95) return "thunderstorm";
  return "forecast";
}
