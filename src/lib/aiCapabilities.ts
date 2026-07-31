import type { TravelModelCapability, TravelModelProfile, TravelTask } from "./travelIntelligenceTypes";

export const TRAVEL_MODEL_PROFILES: TravelModelProfile[] = [
  {
    id: "fanatlas-primary-concierge",
    provider: "primary_concierge",
    enabled: true,
    capabilities: ["conversation", "itinerary_generation", "structured_output", "multilingual_response", "tool_calling", "high_reasoning"],
    maxContextClass: "medium",
    latencyClass: "standard",
    costClass: "medium",
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsImages: false,
    supportsDocuments: false,
    supportedLocales: ["en", "es", "fr", "ar", "pt"]
  },
  {
    id: "fanatlas-visual-location",
    provider: "visual_location",
    enabled: false,
    capabilities: ["conversation", "image_understanding", "map_reasoning", "translation", "multilingual_response", "tool_calling"],
    maxContextClass: "medium",
    latencyClass: "standard",
    costClass: "medium",
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsImages: true,
    supportsDocuments: false,
    supportedLocales: ["en", "es", "fr", "ar", "pt"]
  },
  {
    id: "fanatlas-long-document",
    provider: "long_document",
    enabled: false,
    capabilities: ["conversation", "long_context", "document_analysis", "high_reasoning", "multilingual_response", "tool_calling"],
    maxContextClass: "large",
    latencyClass: "slow",
    costClass: "high",
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsImages: false,
    supportsDocuments: true,
    supportedLocales: ["en", "es", "fr", "ar", "pt"]
  },
  {
    id: "fanatlas-local-low-risk",
    provider: "local_model",
    enabled: true,
    capabilities: ["conversation", "low_cost", "local_execution", "structured_output"],
    maxContextClass: "small",
    latencyClass: "fast",
    costClass: "low",
    supportsTools: false,
    supportsStructuredOutput: true,
    supportsImages: false,
    supportsDocuments: false,
    supportedLocales: ["en"]
  }
];

export function capabilitiesForTravelTask(task: TravelTask): TravelModelCapability[] {
  switch (task) {
    case "itinerary_generation":
    case "itinerary_revision":
    case "trip_planning":
      return ["conversation", "itinerary_generation", "structured_output"];
    case "image_understanding":
    case "landmark_recognition":
    case "menu_translation":
      return ["image_understanding", "multilingual_response"];
    case "document_analysis":
    case "visa_rule_research":
    case "customs_rule_research":
      return ["long_context", "document_analysis", "high_reasoning"];
    case "translation":
    case "language_assistance":
      return ["translation", "multilingual_response"];
    case "map_reasoning":
    case "transport_guidance":
      return ["map_reasoning", "tool_calling"];
    case "travel_summary":
    case "memory_summary":
    case "travel_insight_explanation":
      return ["conversation", "structured_output", "low_cost"];
    default:
      return ["conversation", "multilingual_response"];
  }
}

export function modelSupportsCapabilities(model: TravelModelProfile, capabilities: readonly TravelModelCapability[], locale: string) {
  return model.enabled
    && capabilities.every((capability) => model.capabilities.includes(capability))
    && (model.supportedLocales.includes(locale) || model.supportedLocales.includes("en"));
}
