import { capabilitiesForTravelTask, modelSupportsCapabilities, TRAVEL_MODEL_PROFILES } from "./aiCapabilities";
import { estimateTravelUsage, costClassValue } from "./aiUsagePolicy";
import { buildTravelContext, summarizeTravelContext } from "./travelContext";
import type {
  BuildTravelContextInput,
  OrchestrationDecision,
  OrchestrationInput,
  TravelIntelligenceResult,
  TravelModelProfile
} from "./travelIntelligenceTypes";
import { planTravelTools } from "./aiToolRegistry";

export function orchestrateTravelIntelligence(input: BuildTravelContextInput): TravelIntelligenceResult {
  const context = buildTravelContext(input);
  const contextSummary = summarizeTravelContext(context);
  const toolPlan = planTravelTools(input.request, context);
  const requiredCapabilities = capabilitiesForTravelTask(input.request.task);
  const usageEstimate = estimateTravelUsage(contextSummary, toolPlan.steps.length, input.request.constraints.usagePolicy);
  const orchestration = decideTravelOrchestration({
    task: input.request.task,
    urgency: input.request.userIntent.urgency,
    contextSummary,
    requiredCapabilities,
    tools: toolPlan,
    constraints: input.request.constraints,
    availableModels: TRAVEL_MODEL_PROFILES,
    locale: input.request.locale
  });

  return {
    requestId: input.request.id,
    status: orchestration.status === "blocked" || orchestration.status === "unsupported" ? "blocked" : "ready",
    orchestration,
    contextSummary,
    toolPlan,
    usageEstimate,
    warnings: context.warnings
  };
}

export function decideTravelOrchestration(input: OrchestrationInput): OrchestrationDecision {
  if (input.tools.blockedReasons.includes("external_research_disabled")) {
    return blocked(input, ["required_tool_blocked", "external_research_disabled"]);
  }
  if (input.tools.blockedReasons.includes("tool_disabled")) {
    return blocked(input, ["required_tool_disabled"]);
  }
  if (input.tools.requiresConfirmation) {
    return blocked(input, ["user_confirmation_required"]);
  }

  const capable = input.availableModels
    .filter((model) => modelSupportsCapabilities(model, input.requiredCapabilities, input.locale))
    .filter((model) => costClassValue(model.costClass) <= costClassValue(input.constraints.usagePolicy.maxCostClass))
    .sort(compareModelPreference(input.requiredCapabilities));

  if (capable.length === 0) {
    const disabledCapable = input.availableModels.some((model) => input.requiredCapabilities.every((capability) => model.capabilities.includes(capability)));
    return {
      status: disabledCapable ? "blocked" : "unsupported",
      fallbackModelIds: [],
      requiredCapabilities: [...input.requiredCapabilities],
      reasonCodes: [disabledCapable ? "capable_model_disabled_or_cost_blocked" : "no_capable_model"],
      estimatedCostClass: "none",
      requiresExternalTools: input.tools.steps.length > 0,
      requiresUserConfirmation: input.tools.requiresConfirmation
    };
  }

  const primary = capable[0];
  const fallbacks = input.constraints.usagePolicy.allowFallback ? capable.slice(1).map((model) => model.id) : [];
  return {
    status: primary.id === input.availableModels[0]?.id ? "selected" : "fallback",
    primaryModelId: primary.id,
    fallbackModelIds: fallbacks,
    requiredCapabilities: [...input.requiredCapabilities],
    reasonCodes: ["capabilities_matched", `cost:${primary.costClass}`, `latency:${primary.latencyClass}`],
    estimatedCostClass: primary.costClass,
    requiresExternalTools: input.tools.steps.length > 0,
    requiresUserConfirmation: false
  };
}

function blocked(input: OrchestrationInput, reasonCodes: string[]): OrchestrationDecision {
  return {
    status: "blocked",
    fallbackModelIds: [],
    requiredCapabilities: [...input.requiredCapabilities],
    reasonCodes,
    estimatedCostClass: "none",
    requiresExternalTools: input.tools.steps.length > 0,
    requiresUserConfirmation: input.tools.requiresConfirmation
  };
}

function compareModelPreference(requiredCapabilities: readonly string[]) {
  return (a: TravelModelProfile, b: TravelModelProfile) => {
    if (requiredCapabilities.includes("low_cost")) {
      const cost = costClassValue(a.costClass) - costClassValue(b.costClass);
      if (cost !== 0) return cost;
    }
    const latency = { fast: 0, standard: 1, slow: 2 }[a.latencyClass] - { fast: 0, standard: 1, slow: 2 }[b.latencyClass];
    if (latency !== 0) return latency;
    return a.id.localeCompare(b.id);
  };
}
