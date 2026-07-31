import type {
  OrchestrationDecision,
  TravelContext,
  TravelContextPrivacySummary,
  TravelIntelligenceTrace,
  TravelSafeLogRecord,
  TravelTask,
  TravelToolId,
  TravelUsageEstimate
} from "./travelIntelligenceTypes";
import { taskIsHighStakes, taskRequiresCurrentInformation } from "./travelContextPolicy";

export function getTaskSafetyPolicy(task: TravelTask) {
  return {
    highStakes: taskIsHighStakes(task),
    requiresCurrentInformation: taskRequiresCurrentInformation(task),
    requiresAuthoritativeTool: task === "visa_rule_research" || task === "customs_rule_research" || task === "emergency_guidance",
    blocksGenericAnswer: task === "emergency_guidance" || task === "visa_rule_research" || task === "customs_rule_research"
  };
}

export function sanitizeTravelLog(input: {
  task: TravelTask;
  context: TravelContext;
  decision: OrchestrationDecision;
  usage: TravelUsageEstimate;
  toolIds: TravelToolId[];
}): TravelSafeLogRecord {
  return {
    requestId: input.context.requestId,
    task: input.task,
    capabilityRequirements: [...input.decision.requiredCapabilities],
    selectedModelId: input.decision.primaryModelId,
    toolIds: [...input.toolIds].sort(),
    reasonCodes: [...input.decision.reasonCodes],
    latencyClass: input.usage.estimatedLatencyClass,
    costClass: input.usage.estimatedCostClass,
    warningCodes: input.context.warnings.map((warning) => warning.code),
    context: {
      hasTrip: Boolean(input.context.trip),
      destinationCount: input.context.destinations.length,
      hasTravelHistory: Boolean(input.context.passport || input.context.insights),
      hasCurrentLocation: Boolean(input.context.location),
      includesSensitiveData: input.context.privacy.includesSensitiveData,
      sizeClass: input.usage.contextSizeClass
    }
  };
}

export function createTravelTrace(input: {
  requestId: string;
  task: TravelTask;
  privacySummary: TravelContextPrivacySummary;
  decision: OrchestrationDecision;
  toolIds: TravelToolId[];
}): TravelIntelligenceTrace {
  return {
    requestId: input.requestId,
    task: input.task,
    privacySummary: input.privacySummary,
    finalDecision: input.decision,
    steps: [
      { id: "trace-1", event: "intent_received", reasonCodes: [], safeMetadata: { task: input.task } },
      { id: "trace-2", event: "permissions_checked", reasonCodes: [], safeMetadata: { includesSensitiveData: input.privacySummary.includesSensitiveData } },
      { id: "trace-3", event: "tools_planned", reasonCodes: [], safeMetadata: { toolCount: input.toolIds.length } },
      { id: "trace-4", event: input.decision.status === "blocked" ? "request_blocked" : "model_selected", reasonCodes: input.decision.reasonCodes, safeMetadata: { status: input.decision.status } }
    ]
  };
}
