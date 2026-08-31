import { findEmergencyNumbers } from "../../data/emergencyNumbers";
import type { TravelCitation } from "../../lib/fanAtlasAIContracts";
import {
  toolUnavailable,
  type EmergencyInformationData,
  type EmergencyInformationInput,
  type ToolExecutionContext,
  type ToolProviderConfig,
  type TravelToolResult,
  type ValidatedTravelToolRequest
} from "./toolContracts";

const DATASET_CITATION_ID = "fanatlas-emergency-dataset";

export async function executeEmergencyInformationTool(
  request: ValidatedTravelToolRequest,
  context: ToolExecutionContext,
  config: ToolProviderConfig
): Promise<TravelToolResult<EmergencyInformationData>> {
  const input = validateEmergencyInput(request.input, context.locale);
  if (input.ok === false) return toolUnavailable("emergency_services_lookup", context.now, input.code);
  if (!config.emergencyInfoEnabled) return toolUnavailable("emergency_services_lookup", context.now, "provider_disabled");

  const numbers = findEmergencyNumbers(input.value.country);
  if (!numbers || numbers.verificationState !== "locally_reviewed") return toolUnavailable("emergency_services_lookup", context.now, "unsupported_country");
  const phoneNumber = input.value.category === "police"
    ? numbers.police
    : input.value.category === "ambulance"
      ? numbers.ambulance
      : input.value.category === "fire"
        ? numbers.fire
        : numbers.emergency;
  const retrievedAt = context.now.toISOString();
  const citation: TravelCitation = {
    id: DATASET_CITATION_ID,
    title: "FanAtlas emergency number dataset",
    source: "FanAtlas locally reviewed emergency data",
    retrievedAt,
    updatedAt: numbers.reviewedAt,
    category: "official_emergency"
  };
  return {
    version: "1",
    toolId: "emergency_services_lookup",
    status: "completed",
    data: {
      country: numbers.country,
      category: input.value.category,
      phoneNumber,
      availabilityNote: "Emergency numbers may vary locally. Use the SOS page for nearby help and official local guidance.",
      reviewedAt: numbers.reviewedAt || retrievedAt.slice(0, 10),
      sosPath: "/sos"
    },
    citations: [citation],
    retrievedAt,
    freshness: {
      class: "dated",
      retrievedAt,
      staleAt: new Date(Date.parse(`${numbers.reviewedAt || retrievedAt.slice(0, 10)}T00:00:00.000Z`) + 180 * 24 * 60 * 60_000).toISOString(),
      expiresAt: new Date(Date.parse(`${numbers.reviewedAt || retrievedAt.slice(0, 10)}T00:00:00.000Z`) + 365 * 24 * 60 * 60_000).toISOString()
    },
    warnings: [],
    sourceQuality: "official_emergency",
    cache: "disabled"
  };
}

function validateEmergencyInput(input: Record<string, unknown>, locale: string):
  | { ok: true; value: EmergencyInformationInput }
  | { ok: false; code: "unsupported_country" } {
  if (Object.keys(input).some((key) => key === "__proto__" || key === "constructor" || key === "prototype")) {
    return { ok: false, code: "unsupported_country" };
  }
  const country = String(input.country || "").trim().slice(0, 80);
  const category = input.category === "police" || input.category === "ambulance" || input.category === "fire"
    ? input.category
    : "general";
  const supportedLocale = ["en", "es", "fr", "ar", "pt"].includes(locale) ? locale as EmergencyInformationInput["locale"] : "en";
  if (!country || /https?:|javascript:|data:/i.test(country)) return { ok: false, code: "unsupported_country" };
  return { ok: true, value: { country, category, locale: supportedLocale } };
}
