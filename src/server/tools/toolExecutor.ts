import { destinations } from "../../data/destinations";
import type { FanAtlasAIRequest } from "../../lib/fanAtlasAIContracts";
import type { FanAtlasAIReleasePolicy } from "../../lib/fanAtlasAIProductionPolicy";
import { isToolAllowedForRelease } from "../../lib/fanAtlasAIProductionPolicy";
import type { TravelContext, TravelTask, TravelToolPlan } from "../../lib/travelIntelligenceTypes";
import { MemoryToolCache, type ToolCache } from "./toolCache";
import { executeCurrencyTool } from "./currencyTool";
import { executeCurrentTravelResearchTool } from "./currentTravelResearchTool";
import { executeEmergencyInformationTool } from "./emergencyInformationTool";
import { executeWeatherTool, resolveWeatherInputFromDestination } from "./weatherTool";
import type {
  FanAtlasToolExecutor,
  ToolExecutionContext,
  ToolProviderConfig,
  TravelToolResult,
  ValidatedTravelToolRequest
} from "./toolContracts";

declare const process: {
  env: Record<string, string | undefined>;
};

const DEFAULT_TOOL_TIMEOUT_MS = 8_000;
const MAX_TOOL_CALLS = 3;
const cache = new MemoryToolCache();

export class ServerFanAtlasToolExecutor implements FanAtlasToolExecutor {
  constructor(private readonly config: ToolProviderConfig, private readonly toolCache: ToolCache = cache) {}

  async execute(request: ValidatedTravelToolRequest, context: ToolExecutionContext, signal?: AbortSignal): Promise<TravelToolResult> {
    const run = async () => {
      switch (request.toolId) {
        case "weather_lookup":
          return executeWeatherTool(request, context, this.config, this.toolCache, signal);
        case "currency_conversion":
          return executeCurrencyTool(request, context, this.config, this.toolCache, signal);
        case "emergency_services_lookup":
          return executeEmergencyInformationTool(request, context, this.config);
        case "destination_current_information":
          return executeCurrentTravelResearchTool(request, context, this.config, this.toolCache);
        default:
          return unavailable(request.toolId, context.now);
      }
    };
    return withTimeout(run(), this.config.toolTimeoutMs, request.toolId, context.now, signal);
  }
}

export function readToolProviderConfig(): ToolProviderConfig {
  const weatherProvider = provider(process.env.FANATLAS_WEATHER_PROVIDER, "open_meteo", ["open_meteo", "mock"]);
  const currencyProvider = provider(process.env.FANATLAS_CURRENCY_PROVIDER, "open_er_api", ["open_er_api", "mock"]);
  const researchProvider = provider(process.env.FANATLAS_CURRENT_RESEARCH_PROVIDER, "configured_allowlist", ["configured_allowlist", "mock"]);
  return {
    weatherEnabled: process.env.FANATLAS_WEATHER_ENABLED === "true",
    weatherProvider: process.env.FANATLAS_WEATHER_ENABLED === "true" ? weatherProvider as ToolProviderConfig["weatherProvider"] : "disabled",
    currencyEnabled: process.env.FANATLAS_CURRENCY_ENABLED === "true",
    currencyProvider: process.env.FANATLAS_CURRENCY_ENABLED === "true" ? currencyProvider as ToolProviderConfig["currencyProvider"] : "disabled",
    emergencyInfoEnabled: process.env.FANATLAS_EMERGENCY_INFO_ENABLED === "true",
    currentResearchEnabled: process.env.FANATLAS_CURRENT_RESEARCH_ENABLED === "true",
    currentResearchProvider: process.env.FANATLAS_CURRENT_RESEARCH_ENABLED === "true" ? researchProvider as ToolProviderConfig["currentResearchProvider"] : "disabled",
    liveDatabaseValidated: process.env.FANATLAS_AI_COORDINATION_LIVE_VALIDATED === "true",
    toolTimeoutMs: clampInteger(process.env.FANATLAS_TOOL_TIMEOUT_MS, 1_000, 20_000, DEFAULT_TOOL_TIMEOUT_MS)
  };
}

export async function executePlannedTravelTools(input: {
  request: FanAtlasAIRequest;
  userId: string;
  task: TravelTask;
  context: TravelContext;
  plan: TravelToolPlan;
  releasePolicy: FanAtlasAIReleasePolicy;
  mockMode: boolean;
  toolConfig: ToolProviderConfig;
  now?: Date;
  signal?: AbortSignal;
}) {
  const now = input.now || new Date();
  const executor = new ServerFanAtlasToolExecutor(input.toolConfig);
  const planned = input.plan.steps
    .filter((step) => step.status === "planned" && isToolAllowedForRelease(step.toolId, input.releasePolicy))
    .slice(0, MAX_TOOL_CALLS);
  const seen = new Set<string>();
  const results: TravelToolResult[] = [];

  for (const step of planned) {
    const toolRequest = buildToolRequest(step.toolId, input.request, input.context, input.task, now);
    const duplicateKey = JSON.stringify(toolRequest);
    if (seen.has(duplicateKey)) continue;
    seen.add(duplicateKey);
    results.push(await executor.execute(toolRequest, {
      requestId: input.request.clientRequestId,
      userId: input.userId,
      releaseMode: input.releasePolicy.mode,
      locale: input.request.locale,
      now,
      mockMode: input.mockMode,
      liveDatabaseValidated: input.toolConfig.liveDatabaseValidated
    }, input.signal));
  }

  return results;
}

export function buildToolRequest(
  toolId: ValidatedTravelToolRequest["toolId"],
  request: FanAtlasAIRequest,
  context: TravelContext,
  task: TravelTask,
  now: Date
): ValidatedTravelToolRequest {
  const destinationLabel = context.destinations[0]?.localizedDisplayName
    || context.destinations[0]?.canonicalCountryName
    || request.contextSnapshot?.activeTrip?.destinationLabel
    || "";
  switch (toolId) {
    case "weather_lookup": {
      const resolved = resolveWeatherInputFromDestination(destinationLabel, now);
      return { toolId, input: resolved ? { ...resolved, locale: request.locale } : { destinationLabel } };
    }
    case "currency_conversion": {
      const pair = inferCurrencyPair(request.message, destinationLabel);
      return { toolId, input: { ...pair, amount: inferAmount(request.message), locale: request.locale } };
    }
    case "emergency_services_lookup":
      return { toolId, input: { country: inferCountry(destinationLabel), category: inferEmergencyCategory(request.message), locale: request.locale } };
    case "destination_current_information":
      return { toolId, input: { destination: destinationLabel, category: inferResearchCategory(request.message, task), maxResults: 3, locale: request.locale } };
    default:
      return { toolId, input: {} };
  }
}

function inferCurrencyPair(message: string, destinationLabel: string) {
  const codes = Array.from(message.toUpperCase().matchAll(/\b[A-Z]{3}\b/g)).map((match) => match[0]);
  const destinationCurrency = destinations.find((destination) => destinationLabel.toLowerCase().includes(destination.country.toLowerCase()) || destinationLabel.toLowerCase().includes(destination.city.toLowerCase()))?.currency;
  return {
    baseCurrency: codes[0] || "USD",
    targetCurrency: codes[1] || destinationCurrency || "EUR"
  };
}

function inferAmount(message: string) {
  const match = message.match(/\b\d+(?:\.\d{1,2})?\b/);
  return match ? Number(match[0]) : undefined;
}

function inferCountry(destinationLabel: string) {
  const normalized = destinationLabel.toLowerCase();
  return destinations.find((destination) => normalized.includes(destination.country.toLowerCase()) || normalized.includes(destination.city.toLowerCase()))?.country || destinationLabel;
}

function inferEmergencyCategory(message: string) {
  const text = message.toLowerCase();
  if (text.includes("police")) return "police";
  if (text.includes("ambulance") || text.includes("hospital") || text.includes("medical")) return "ambulance";
  if (text.includes("fire")) return "fire";
  return "general";
}

function inferResearchCategory(message: string, task: TravelTask) {
  const text = message.toLowerCase();
  if (text.includes("airport")) return "airport";
  if (text.includes("train") || text.includes("metro") || text.includes("transport")) return "transport";
  if (text.includes("health")) return "health";
  if (text.includes("event")) return "events";
  if (task === "safety_guidance" || text.includes("advisory") || text.includes("alert")) return "advisory";
  return "tourism";
}

async function withTimeout(promise: Promise<TravelToolResult>, timeoutMs: number, toolId: ValidatedTravelToolRequest["toolId"], now: Date, signal?: AbortSignal) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<TravelToolResult>((resolve) => {
    timeoutId = setTimeout(() => resolve(unavailable(toolId, now, "provider_timeout")), timeoutMs);
  });
  if (signal?.aborted) return unavailable(toolId, now, "provider_timeout");
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function unavailable(toolId: ValidatedTravelToolRequest["toolId"], now: Date, code: "provider_timeout" | "provider_disabled" = "provider_disabled"): TravelToolResult {
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
    cache: "disabled"
  };
}

function provider(value: unknown, fallback: string, allowed: readonly string[]) {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

function clampInteger(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
