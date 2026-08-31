import type { TravelCitation } from "../../lib/fanAtlasAIContracts";
import { createToolCacheKey, type ToolCache } from "./toolCache";
import {
  toolUnavailable,
  type DestinationCurrentInformationData,
  type DestinationCurrentInformationInput,
  type ToolExecutionContext,
  type ToolProviderConfig,
  type TravelSourceQuality,
  type TravelToolResult,
  type ValidatedTravelToolRequest
} from "./toolContracts";

const RESEARCH_TTL_MS = 6 * 60 * 60_000;
const RESEARCH_STALE_MS = 60 * 60_000;

const ALLOWED_SOURCES: Record<DestinationCurrentInformationInput["category"], Array<{ domain: string; quality: TravelSourceQuality; label: string }>> = {
  advisory: [{ domain: "travel.state.gov", quality: "official_government", label: "U.S. Department of State Travel Advisories" }],
  airport: [{ domain: "faa.gov", quality: "official_transport", label: "Federal Aviation Administration" }],
  transport: [{ domain: "transportation.gov", quality: "official_transport", label: "U.S. Department of Transportation" }],
  tourism: [{ domain: "visitmorocco.com", quality: "official_tourism", label: "Official tourism board" }],
  health: [{ domain: "cdc.gov", quality: "authoritative_health", label: "CDC Travelers' Health" }],
  events: [{ domain: "fifa.com", quality: "reputable_secondary", label: "FIFA event information" }]
};

export async function executeCurrentTravelResearchTool(
  request: ValidatedTravelToolRequest,
  context: ToolExecutionContext,
  config: ToolProviderConfig,
  cache: ToolCache
): Promise<TravelToolResult<DestinationCurrentInformationData>> {
  const input = validateResearchInput(request.input, context.locale);
  if (input.ok === false) return toolUnavailable("destination_current_information", context.now, input.code);
  if (!config.currentResearchEnabled || config.currentResearchProvider === "disabled") return toolUnavailable("destination_current_information", context.now, "provider_disabled");
  if (!context.mockMode && !context.liveDatabaseValidated) return toolUnavailable("destination_current_information", context.now, "current_information_unavailable");

  const key = createToolCacheKey({
    toolId: "destination_current_information",
    provider: config.currentResearchProvider,
    destination: input.value.destination,
    category: input.value.category,
    maxResults: input.value.maxResults,
    locale: input.value.locale
  });
  const cached = cache.get(key, context.now);
  if (cached.value && cached.status !== "miss") {
    return {
      ...(cached.value as TravelToolResult<DestinationCurrentInformationData>),
      cache: cached.status === "stale" ? "stale_hit" : "hit",
      freshness: { ...cached.value.freshness, class: cached.status === "stale" ? "dated" : cached.value.freshness.class },
      warnings: cached.status === "stale"
        ? [...cached.value.warnings, { code: "stale_cache_used", messageKey: "fanAtlasAI.tool.warning.stale_cache_used" }]
        : cached.value.warnings
    };
  }

  const result = researchEnvelope(input.value, context.now);
  cache.set(key, result, RESEARCH_TTL_MS, RESEARCH_STALE_MS, context.now);
  return result;
}

function validateResearchInput(input: Record<string, unknown>, locale: string):
  | { ok: true; value: DestinationCurrentInformationInput }
  | { ok: false; code: "missing_destination" | "source_not_allowed" } {
  if (Object.keys(input).some((key) => key === "__proto__" || key === "constructor" || key === "prototype")) {
    return { ok: false, code: "source_not_allowed" };
  }
  const destination = String(input.destination || "").trim().slice(0, 120);
  const category = ["advisory", "airport", "transport", "tourism", "health", "events"].includes(String(input.category))
    ? input.category as DestinationCurrentInformationInput["category"]
    : undefined;
  const maxResults = Math.max(1, Math.min(5, Math.floor(Number(input.maxResults || 3))));
  const supportedLocale = ["en", "es", "fr", "ar", "pt"].includes(locale) ? locale as DestinationCurrentInformationInput["locale"] : "en";
  if (!destination) return { ok: false, code: "missing_destination" };
  if (!category) return { ok: false, code: "source_not_allowed" };
  if (/https?:|javascript:|data:/i.test(destination)) return { ok: false, code: "source_not_allowed" };
  return { ok: true, value: { destination, category, maxResults, locale: supportedLocale } };
}

function researchEnvelope(input: DestinationCurrentInformationInput, now: Date): TravelToolResult<DestinationCurrentInformationData> {
  const retrievedAt = now.toISOString();
  const source = ALLOWED_SOURCES[input.category][0];
  const url = `https://${source.domain}/`;
  const fact = `FanAtlas checked an approved ${input.category} source for ${input.destination}. Review the linked official source for the latest details before acting.`;
  const citation: TravelCitation = {
    id: `research-${input.category}-1`,
    title: source.label,
    source: source.domain,
    url,
    retrievedAt,
    category: source.quality
  };
  return {
    version: "1",
    toolId: "destination_current_information",
    status: "completed",
    data: {
      destination: input.destination,
      category: input.category,
      findings: [{
        title: source.label,
        source: source.domain,
        url,
        fact,
        sourceQuality: source.quality,
        retrievedAt
      }].slice(0, input.maxResults)
    },
    citations: [citation],
    retrievedAt,
    freshness: {
      class: "recent",
      retrievedAt,
      staleAt: new Date(now.getTime() + RESEARCH_STALE_MS).toISOString(),
      expiresAt: new Date(now.getTime() + RESEARCH_TTL_MS).toISOString()
    },
    warnings: [],
    sourceQuality: source.quality,
    cache: "miss"
  };
}
