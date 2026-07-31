import { describe, expect, it } from "vitest";
import { decideTravelOrchestration, orchestrateTravelIntelligence } from "./aiOrchestrator";
import { capabilitiesForTravelTask, TRAVEL_MODEL_PROFILES } from "./aiCapabilities";
import { createTravelIntelligenceRequest } from "./travelContext";

describe("aiOrchestrator", () => {
  it("selects a provider-neutral capable model for itinerary planning", () => {
    const request = createTravelIntelligenceRequest({
      id: "orch-1",
      task: "itinerary_generation",
      scope: ["none"]
    });

    const result = orchestrateTravelIntelligence({ request });

    expect(result.orchestration.status).toBe("selected");
    expect(result.orchestration.primaryModelId).toBe("fanatlas-primary-concierge");
    expect(result.orchestration.reasonCodes).toContain("capabilities_matched");
  });

  it("blocks image tasks while image-capable profiles are disabled", () => {
    const request = createTravelIntelligenceRequest({
      id: "orch-2",
      task: "image_understanding",
      scope: ["image_content"],
      permissions: { allowImageContent: true }
    });

    const result = orchestrateTravelIntelligence({ request });

    expect(result.orchestration.status).toBe("blocked");
    expect(result.orchestration.reasonCodes).toContain("capable_model_disabled_or_cost_blocked");
  });

  it("rejects incapable fallbacks instead of choosing a weak model", () => {
    const decision = decideTravelOrchestration({
      task: "document_analysis",
      urgency: "research",
      contextSummary: {
        hasUserPreferences: false,
        hasTrip: false,
        destinationCount: 0,
        hasDates: false,
        hasItinerary: false,
        hasTravelHistory: false,
        hasCurrentLocation: false,
        includesSensitiveData: false,
        estimatedSize: 3000
      },
      requiredCapabilities: capabilitiesForTravelTask("document_analysis"),
      tools: { steps: [], canExecute: true, requiresConfirmation: false, blockedReasons: [] },
      constraints: createTravelIntelligenceRequest({ id: "orch-3", task: "document_analysis" }).constraints,
      availableModels: TRAVEL_MODEL_PROFILES.map((model) => model.id === "fanatlas-long-document" ? { ...model, enabled: false } : model),
      locale: "en"
    });

    expect(decision.status).toBe("blocked");
    expect(decision.primaryModelId).toBeUndefined();
  });

  it("prefers low-cost capable model for simple summaries", () => {
    const request = createTravelIntelligenceRequest({
      id: "orch-4",
      task: "travel_summary",
      scope: ["none"]
    });

    const result = orchestrateTravelIntelligence({ request });

    expect(result.orchestration.primaryModelId).toBe("fanatlas-local-low-risk");
  });
});
