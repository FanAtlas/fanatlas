import type { FanAtlasAIReleaseMode } from "../../lib/fanAtlasAIContracts";
import type { TravelTask } from "../../lib/travelIntelligenceTypes";

declare const process: {
  env: Record<string, string | undefined>;
};

export type AIOperationalEvent = {
  event: "request_started" | "request_completed" | "request_blocked" | "request_failed";
  requestId: string;
  userId?: string;
  releaseMode: FanAtlasAIReleaseMode;
  task?: TravelTask;
  modelProfileId?: string;
  toolsRequested?: readonly string[];
  toolsExecuted?: readonly string[];
  toolSuccessCount?: number;
  toolFailureCount?: number;
  cacheHitCount?: number;
  totalLatencyMs?: number;
  providerLatencyMs?: number;
  estimatedModelCalls?: number;
  estimatedToolCalls?: number;
  estimatedCostClass?: "none" | "low" | "medium" | "high";
  failureCategory?: string;
  circuitState?: "closed" | "open" | "half_open" | "unknown";
  quotaOutcome?: "allowed" | "minute_limited" | "daily_limited" | "unknown";
  validationOutcome?: "accepted" | "rejected" | "not_applicable";
};

export function recordAIOperationalEvent(event: AIOperationalEvent) {
  if (process.env.FANATLAS_AI_OPERATIONAL_TELEMETRY !== "console") return;
  const payload = {
    event: event.event,
    requestId: shortHash(event.requestId),
    userId: event.userId ? shortHash(event.userId) : undefined,
    releaseMode: event.releaseMode,
    task: event.task,
    modelProfileId: safeLabel(event.modelProfileId),
    toolsRequested: sanitizeLabels(event.toolsRequested),
    toolsExecuted: sanitizeLabels(event.toolsExecuted),
    toolSuccessCount: event.toolSuccessCount,
    toolFailureCount: event.toolFailureCount,
    cacheHitCount: event.cacheHitCount,
    totalLatencyMs: boundedNumber(event.totalLatencyMs),
    providerLatencyMs: boundedNumber(event.providerLatencyMs),
    estimatedModelCalls: boundedNumber(event.estimatedModelCalls),
    estimatedToolCalls: boundedNumber(event.estimatedToolCalls),
    estimatedCostClass: event.estimatedCostClass,
    failureCategory: safeLabel(event.failureCategory),
    circuitState: event.circuitState,
    quotaOutcome: event.quotaOutcome,
    validationOutcome: event.validationOutcome
  };
  console.info(JSON.stringify({ fanatlasAI: "operational", ...payload }));
}

function shortHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function sanitizeLabels(values?: readonly string[]) {
  return values?.map((value) => safeLabel(value)).filter(Boolean).slice(0, 8);
}

function safeLabel(value?: string) {
  return value ? value.replace(/[^A-Za-z0-9:._-]/g, "").slice(0, 80) : undefined;
}

function boundedNumber(value?: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value || 0)) : undefined;
}
