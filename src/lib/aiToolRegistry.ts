import type {
  TravelContext,
  TravelIntelligenceRequest,
  TravelTask,
  TravelToolDefinition,
  TravelToolId,
  TravelToolPlan,
  TravelToolPlanStep,
  TravelToolValidation
} from "./travelIntelligenceTypes";

export const TRAVEL_TOOL_REGISTRY: TravelToolDefinition[] = [
  tool("weather_lookup", "Weather lookup", ["packing_guidance", "trip_planning"], true, true, []),
  tool("visa_rules_lookup", "Visa rules lookup", ["visa_rule_research"], true, false, []),
  tool("customs_rules_lookup", "Customs rules lookup", ["customs_rule_research"], true, false, []),
  tool("emergency_services_lookup", "Emergency services lookup", ["emergency_guidance"], false, true, []),
  tool("translation", "Translation", ["translation", "language_assistance", "menu_translation"], false, false, []),
  tool("image_analysis", "Image analysis", ["image_understanding", "landmark_recognition", "menu_translation"], false, true, ["allowImageContent"]),
  tool("document_analysis", "Document analysis", ["document_analysis", "visa_rule_research", "customs_rule_research"], false, true, ["allowUploadedDocuments"]),
  tool("itinerary_read", "Itinerary reader", ["itinerary_generation", "itinerary_revision", "trip_planning", "transport_guidance"], false, true, ["allowItinerary"]),
  tool("saved_places_read", "Saved places reader", ["place_recommendation", "saved_place_organization"], false, true, ["allowSavedPlaces"]),
  tool("passport_summary_read", "Passport summary reader", ["travel_summary", "travel_insight_explanation", "trip_reflection"], false, true, ["allowPassport"]),
  tool("travel_insights_read", "Travel insights reader", ["travel_summary", "travel_insight_explanation", "trip_reflection"], false, true, ["allowInsights"]),
  tool("place_search", "Place search", ["place_recommendation"], true, false, []),
  tool("route_planning", "Route planning", ["transport_guidance", "map_reasoning"], true, false, ["allowCurrentLocation"]),
  tool("currency_conversion", "Currency conversion", ["budget_guidance"], true, true, []),
  tool("destination_current_information", "Destination current information", ["transport_guidance", "safety_guidance"], true, true, []),
  tool("flight_search", "Flight search", ["transport_guidance"], true, false, []),
  tool("hotel_search", "Hotel search", ["trip_planning"], true, false, []),
  tool("restaurant_search", "Restaurant search", ["place_recommendation"], true, false, []),
  tool("event_search", "Event search", ["trip_planning"], true, false, [])
];

export function validateToolRegistry(registry: readonly TravelToolDefinition[] = TRAVEL_TOOL_REGISTRY) {
  const ids = new Set<TravelToolId>();
  const errors: string[] = [];
  registry.forEach((definition) => {
    if (ids.has(definition.id)) errors.push(`duplicate_tool:${definition.id}`);
    ids.add(definition.id);
    if (definition.supportedTasks.length === 0) errors.push(`missing_tasks:${definition.id}`);
    if (!definition.privacyLevel) errors.push(`missing_privacy:${definition.id}`);
  });
  return { valid: errors.length === 0, errors };
}

export function getTravelTool(id: TravelToolId) {
  return TRAVEL_TOOL_REGISTRY.find((toolDefinition) => toolDefinition.id === id);
}

export function validateToolRequest(
  toolDefinition: TravelToolDefinition,
  request: TravelIntelligenceRequest,
  _context: TravelContext
): TravelToolValidation {
  const blockedReasons: string[] = [];
  if (!toolDefinition.enabled) blockedReasons.push("tool_disabled");
  if (!toolDefinition.supportedTasks.includes(request.task)) blockedReasons.push("unsupported_task");
  if (toolDefinition.requiresNetwork && !request.constraints.usagePolicy.allowExternalResearch) blockedReasons.push("external_research_disabled");
  toolDefinition.requiredPermissions.forEach((permission) => {
    if (!request.permissions[permission]) blockedReasons.push(`permission_denied:${permission}`);
  });
  if (toolDefinition.kind === "write" || toolDefinition.kind === "external_action") blockedReasons.push("write_actions_disabled");
  return {
    allowed: blockedReasons.length === 0,
    blockedReasons,
    requiresConfirmation: toolDefinition.requiresConfirmation || toolDefinition.kind !== "read"
  };
}

export function planTravelTools(request: TravelIntelligenceRequest, context: TravelContext): TravelToolPlan {
  const toolIds = toolsForTask(request.task);
  const steps: TravelToolPlanStep[] = toolIds.map((toolId, index) => {
    const toolDefinition = getTravelTool(toolId);
    if (!toolDefinition) {
      return {
        id: `tool-step-${index + 1}`,
        toolId,
        purpose: "unsupported tool",
        inputProjection: {},
        dependsOn: [],
        status: "blocked",
        blockedReasons: ["unknown_tool"]
      };
    }
    const validation = validateToolRequest(toolDefinition, request, context);
    return {
      id: `tool-step-${index + 1}`,
      toolId,
      purpose: toolDefinition.description,
      inputProjection: {
        requestId: request.id,
        task: request.task,
        destinationCount: context.destinations.length,
        hasTrip: Boolean(context.trip)
      },
      dependsOn: index === 0 ? [] : [`tool-step-${index}`],
      status: !toolDefinition.enabled ? "disabled" : validation.allowed ? "planned" : "blocked",
      blockedReasons: validation.blockedReasons
    };
  });
  const blockedReasons = Array.from(new Set(steps.flatMap((step) => step.blockedReasons))).sort();
  return {
    steps,
    canExecute: steps.length > 0 && blockedReasons.length === 0,
    requiresConfirmation: steps.some((step) => {
      const definition = getTravelTool(step.toolId);
      return Boolean(definition?.requiresConfirmation);
    }),
    blockedReasons
  };
}

function toolsForTask(task: TravelTask): TravelToolId[] {
  switch (task) {
    case "packing_guidance":
      return ["weather_lookup"];
    case "visa_rule_research":
      return ["visa_rules_lookup"];
    case "customs_rule_research":
      return ["customs_rules_lookup"];
    case "emergency_guidance":
      return ["emergency_services_lookup"];
    case "translation":
    case "language_assistance":
    case "menu_translation":
      return ["translation"];
    case "image_understanding":
    case "landmark_recognition":
      return ["image_analysis"];
    case "document_analysis":
      return ["document_analysis"];
    case "itinerary_revision":
    case "itinerary_generation":
      return ["itinerary_read"];
    case "place_recommendation":
      return ["saved_places_read", "place_search"];
    case "travel_summary":
    case "travel_insight_explanation":
    case "trip_reflection":
      return ["passport_summary_read", "travel_insights_read"];
    case "transport_guidance":
    case "safety_guidance":
      return ["destination_current_information"];
    case "map_reasoning":
      return ["route_planning"];
    case "budget_guidance":
      return ["currency_conversion"];
    default:
      return [];
  }
}

function tool(
  id: TravelToolId,
  name: string,
  supportedTasks: TravelTask[],
  requiresNetwork: boolean,
  enabled: boolean,
  requiredPermissions: TravelToolDefinition["requiredPermissions"]
): TravelToolDefinition {
  const kind = id.endsWith("_read") ? "read" : "suggest";
  return {
    id,
    name,
    description: name,
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    privacyLevel: requiredPermissions.length > 0 ? "personal" : "application",
    kind,
    enabled,
    requiresNetwork,
    requiresLocation: requiredPermissions.includes("allowCurrentLocation"),
    requiresConfirmation: false,
    requiredPermissions,
    minimumLocationPrecision: requiredPermissions.includes("allowCurrentLocation") ? "city" : "none",
    acceptedPrivacyClasses: ["public", "application", "personal"],
    returnedPrivacyClasses: ["public", "application"],
    supportedTasks
  };
}
