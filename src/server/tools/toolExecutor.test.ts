import { describe, expect, it } from "vitest";
import { MemoryToolCache, createToolCacheKey } from "./toolCache";
import { executeCurrencyTool } from "./currencyTool";
import { executeCurrentTravelResearchTool } from "./currentTravelResearchTool";
import { executeEmergencyInformationTool } from "./emergencyInformationTool";
import { executeWeatherTool, resolveWeatherInputFromDestination } from "./weatherTool";
import { executePlannedTravelTools } from "./toolExecutor";
import { liveToolCachePolicy } from "./toolContracts";
import type { FanAtlasAIRequest } from "../../lib/fanAtlasAIContracts";
import { FANATLAS_AI_API_VERSION, createDefaultFanAtlasAIConsent } from "../../lib/fanAtlasAIContracts";
import type { TravelContext, TravelToolPlan } from "../../lib/travelIntelligenceTypes";

const now = new Date("2026-08-06T12:00:00.000Z");
const contextBase = {
  requestId: "request-1",
  userId: "user-1",
  releaseMode: "internal" as const,
  locale: "en",
  now,
  mockMode: true,
  liveDatabaseValidated: true
};
const toolConfig = {
  weatherEnabled: true,
  weatherProvider: "mock" as const,
  currencyEnabled: true,
  currencyProvider: "mock" as const,
  emergencyInfoEnabled: true,
  currentResearchEnabled: true,
  currentResearchProvider: "mock" as const,
  liveDatabaseValidated: true,
  toolTimeoutMs: 8_000
};

describe("server current-information tools", () => {
  it("keeps live tool cache and freshness policies explicit by tool risk", () => {
    expect(liveToolCachePolicy("weather_lookup")).toMatchObject({ cacheable: true, allowStale: true, highStakes: false });
    expect(liveToolCachePolicy("currency_conversion")).toMatchObject({ cacheable: true, allowStale: true, highStakes: false });
    expect(liveToolCachePolicy("emergency_services_lookup")).toMatchObject({ cacheable: false, allowStale: false, highStakes: true });
    expect(liveToolCachePolicy("destination_current_information")).toMatchObject({ cacheable: true, allowStale: false, highStakes: true });
  });

  it("resolves weather from trusted local destination coordinates", () => {
    const input = resolveWeatherInputFromDestination("Casablanca, Morocco", now);

    expect(input).toMatchObject({
      destinationLabel: "Casablanca, Morocco",
      latitude: 33.5731,
      longitude: -7.5898
    });
  });

  it("returns source-backed weather with freshness and citations", async () => {
    const cache = new MemoryToolCache();
    const result = await executeWeatherTool({
      toolId: "weather_lookup",
      input: {
        destinationLabel: "Casablanca, Morocco",
        latitude: 33.5731,
        longitude: -7.5898,
        startDate: "2026-08-07",
        durationDays: 1,
        units: "metric",
        locale: "en"
      }
    }, contextBase, toolConfig, cache);

    expect(result.status).toBe("completed");
    expect(result.sourceQuality).toBe("recognized_weather");
    expect(result.citations[0].id).toBe("weather-open-meteo");
    expect(result.data?.daily[0].precipitationChance).toBe(20);
  });

  it("rejects weather dates outside the forecast horizon", async () => {
    const result = await executeWeatherTool({
      toolId: "weather_lookup",
      input: {
        destinationLabel: "Casablanca, Morocco",
        latitude: 33.5731,
        longitude: -7.5898,
        startDate: "2026-10-30",
        durationDays: 1,
        units: "metric",
        locale: "en"
      }
    }, contextBase, toolConfig, new MemoryToolCache());

    expect(result.status).toBe("unavailable");
    expect(result.warnings.map((warning) => warning.code)).toContain("outside_forecast_horizon");
  });

  it("converts currency deterministically and rejects unsupported codes", async () => {
    const cache = new MemoryToolCache();
    const result = await executeCurrencyTool({
      toolId: "currency_conversion",
      input: { baseCurrency: "USD", targetCurrency: "EUR", amount: 100, locale: "en" }
    }, contextBase, toolConfig, cache);
    const invalid = await executeCurrencyTool({
      toolId: "currency_conversion",
      input: { baseCurrency: "USD", targetCurrency: "ZZZ", amount: 100, locale: "en" }
    }, contextBase, toolConfig, cache);

    expect(result.status).toBe("completed");
    expect(result.data?.convertedAmount).toBe(92);
    expect(result.citations[0].category).toBe("currency");
    expect(invalid.status).toBe("unavailable");
    expect(invalid.warnings[0].code).toBe("unsupported_currency");
  });

  it("returns emergency information from the verified local dataset with SOS path", async () => {
    const result = await executeEmergencyInformationTool({
      toolId: "emergency_services_lookup",
      input: { country: "Morocco", category: "police", locale: "en" }
    }, contextBase, toolConfig);

    expect(result.status).toBe("completed");
    expect(result.data).toMatchObject({ phoneNumber: "19", sosPath: "/sos" });
    expect(result.sourceQuality).toBe("official_emergency");
  });

  it("limits controlled research to approved source categories", async () => {
    const result = await executeCurrentTravelResearchTool({
      toolId: "destination_current_information",
      input: { destination: "Paris", category: "airport", maxResults: 3, locale: "en" }
    }, contextBase, toolConfig, new MemoryToolCache());
    const invalid = await executeCurrentTravelResearchTool({
      toolId: "destination_current_information",
      input: { destination: "https://example.com/private", category: "airport", maxResults: 3, locale: "en" }
    }, contextBase, toolConfig, new MemoryToolCache());

    expect(result.status).toBe("completed");
    expect(result.data?.findings[0].sourceQuality).toBe("official_transport");
    expect(result.citations[0].url).toBe("https://faa.gov/");
    expect(invalid.status).toBe("unavailable");
    expect(invalid.warnings[0].code).toBe("source_not_allowed");
  });

  it("uses cache keys that exclude user and prompt context", () => {
    const key = createToolCacheKey({
      toolId: "weather_lookup",
      destination: "Casablanca",
      userId: undefined,
      rawPrompt: undefined,
      units: "metric"
    });

    expect(key).toContain("destination=casablanca");
    expect(key).not.toContain("user");
    expect(key).not.toContain("prompt");
  });

  it("executes only release-allowed planned tools and avoids duplicates", async () => {
    const request = aiRequest("What is the weather in Casablanca?");
    const travelContext = context("Casablanca, Morocco");
    const plan: TravelToolPlan = {
      canExecute: true,
      requiresConfirmation: false,
      blockedReasons: [],
      steps: [
        { id: "1", toolId: "weather_lookup", purpose: "weather", inputProjection: {}, dependsOn: [], status: "planned", blockedReasons: [] },
        { id: "2", toolId: "weather_lookup", purpose: "weather", inputProjection: {}, dependsOn: [], status: "planned", blockedReasons: [] },
        { id: "3", toolId: "currency_conversion", purpose: "currency", inputProjection: {}, dependsOn: [], status: "planned", blockedReasons: [] }
      ]
    };
    const results = await executePlannedTravelTools({
      request,
      userId: "user-1",
      task: "packing_guidance",
      context: travelContext,
      plan,
      releasePolicy: {
        mode: "internal",
        internalAllowlist: ["user-1"],
        betaAllowlist: [],
        taskAllowlist: ["packing_guidance"],
        toolAllowlist: ["weather_lookup"],
        killSwitch: false
      },
      mockMode: true,
      toolConfig,
      now
    });

    expect(results).toHaveLength(1);
    expect(results[0].toolId).toBe("weather_lookup");
  });
});

function aiRequest(message: string): FanAtlasAIRequest {
  return {
    version: FANATLAS_AI_API_VERSION,
    conversationId: "conversation-1",
    messages: [],
    message,
    consent: createDefaultFanAtlasAIConsent(),
    locale: "en",
    clientRequestId: "request-1",
    contextSnapshot: {
      activeTrip: {
        id: "trip-1",
        title: "Synthetic Trip",
        status: "planned",
        destinationLabel: "Casablanca, Morocco",
        itineraryDayCount: 1,
        plannedPlaceCount: 1,
        visitedPlaceCount: 0,
        journalEntryCount: 0,
        photoCount: 0
      }
    }
  };
}

function context(destination: string): TravelContext {
  return {
    schemaVersion: "1",
    requestId: "request-1",
    destinations: [{ id: destination, localizedDisplayName: destination, canonicalCountryName: destination, travelStatus: "planned" }],
    provenance: [],
    privacy: { highestClassification: "public", includesPersonalData: false, includesSensitiveData: false, includesHighlySensitiveData: false, excludedSensitiveFields: 0 },
    warnings: [],
    estimatedCharacters: 0
  };
}
