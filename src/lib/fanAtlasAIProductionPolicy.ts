import type { FanAtlasAIReleaseMode, FanAtlasAISourceCategory } from "./fanAtlasAIContracts";
import type { TravelTask } from "./travelIntelligenceTypes";

export type FanAtlasAIEntitlementSubject = {
  id: string;
  email?: string;
  roles?: readonly string[];
};

export type FanAtlasAIReleasePolicy = {
  mode: FanAtlasAIReleaseMode;
  internalAllowlist: readonly string[];
  betaAllowlist: readonly string[];
  taskAllowlist: readonly TravelTask[];
  toolAllowlist: readonly string[];
  killSwitch: boolean;
};

export type FanAtlasAICostGuardrails = {
  maxModelCallsPerRequest: number;
  maxToolCallsPerRequest: number;
  maxCostClass: "none" | "low" | "medium" | "high";
  maxContextSizeClass: "tiny" | "small" | "medium" | "large";
  maxOutputCharacters: number;
};

export type FanAtlasAILatencyBudgets = {
  totalRequestMs: number;
  providerMs: number;
  toolMs: number;
  currentInformationMs: number;
};

export type FanAtlasAIProviderHealthState = "healthy" | "degraded" | "unavailable";

export type FanAtlasAIProviderHealth = {
  state: FanAtlasAIProviderHealthState;
  recentSuccessCount: number;
  recentFailureCount: number;
  timeoutCount: number;
  lastFailureAt?: number;
  cooldownUntil?: number;
};

export type FanAtlasAIUsageCounter = {
  userId: string;
  dateBucket: string;
  requestCount: number;
  providerCallCount: number;
  toolCallCount: number;
  inputSizeClass: "tiny" | "small" | "medium" | "large";
  outputSizeClass: "short" | "medium" | "long";
  status: "started" | "completed" | "blocked" | "failed";
  costClass: "none" | "low" | "medium" | "high";
};

export type FanAtlasAIObservableEventName =
  | "fanatlas_ai_request_started"
  | "fanatlas_ai_request_completed"
  | "fanatlas_ai_request_blocked"
  | "fanatlas_ai_request_failed"
  | "fanatlas_ai_request_cancelled"
  | "fanatlas_ai_clarification_required"
  | "fanatlas_ai_tool_planned"
  | "fanatlas_ai_tool_blocked"
  | "fanatlas_ai_output_rejected";

export const FANATLAS_AI_INITIAL_TASK_ALLOWLIST: readonly TravelTask[] = [
  "general_travel_question",
  "trip_planning",
  "itinerary_generation",
  "itinerary_revision",
  "destination_comparison",
  "budget_guidance",
  "packing_guidance",
  "travel_summary",
  "travel_insight_explanation",
  "saved_place_organization",
  "language_assistance",
  "translation"
];

export const FANATLAS_AI_INITIAL_TOOL_ALLOWLIST = [
  "itinerary_read",
  "trip_summary_read",
  "saved_places_read",
  "passport_summary_read",
  "travel_insights_read",
  "explorer_destination_summary_read"
] as const;

export function parseFanAtlasAIReleaseMode(value: unknown, legacyEnabled = false, mockMode = false): FanAtlasAIReleaseMode {
  if (value === "disabled" || value === "internal" || value === "beta" || value === "production") return value;
  if (mockMode) return "internal";
  if (legacyEnabled) return "production";
  return "disabled";
}

export function parseAllowlist(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

export function isFanAtlasAIEntitled(subject: FanAtlasAIEntitlementSubject, policy: FanAtlasAIReleasePolicy) {
  if (policy.killSwitch || policy.mode === "disabled") return false;
  if (policy.mode === "production") return true;
  const identifiers = new Set([
    subject.id.toLowerCase(),
    subject.email?.toLowerCase(),
    ...(subject.roles || []).map((role) => role.toLowerCase())
  ].filter(Boolean) as string[]);
  const allowed = policy.mode === "internal" ? policy.internalAllowlist : policy.betaAllowlist;
  return allowed.some((entry) => identifiers.has(entry.toLowerCase()));
}

export function isTaskAllowedForRelease(task: TravelTask, policy: FanAtlasAIReleasePolicy) {
  if (policy.killSwitch || policy.mode === "disabled") return false;
  return policy.taskAllowlist.includes(task);
}

export function isToolAllowedForRelease(toolId: string, policy: FanAtlasAIReleasePolicy) {
  if (policy.killSwitch || policy.mode === "disabled") return false;
  return policy.toolAllowlist.includes(toolId);
}

export function validateReleasePolicy(policy: FanAtlasAIReleasePolicy) {
  if (policy.killSwitch || policy.mode === "disabled") return { ok: false as const, reason: "disabled" };
  if (policy.mode === "internal" && policy.internalAllowlist.length === 0) return { ok: false as const, reason: "missing_internal_allowlist" };
  if (policy.mode === "beta" && policy.betaAllowlist.length === 0) return { ok: false as const, reason: "missing_beta_allowlist" };
  if (policy.taskAllowlist.length === 0) return { ok: false as const, reason: "missing_task_allowlist" };
  return { ok: true as const };
}

export function classValue(value: "none" | "tiny" | "low" | "small" | "medium" | "large" | "high" | "short" | "long") {
  return {
    none: 0,
    tiny: 1,
    low: 1,
    short: 1,
    small: 2,
    medium: 3,
    large: 4,
    high: 4,
    long: 4
  }[value];
}

export function isWithinCostGuardrails(input: {
  contextSizeClass: "tiny" | "small" | "medium" | "large";
  estimatedCostClass: "none" | "low" | "medium" | "high";
  expectedModelCalls: number;
  expectedToolCalls: number;
}, guardrails: FanAtlasAICostGuardrails) {
  return input.expectedModelCalls <= guardrails.maxModelCallsPerRequest
    && input.expectedToolCalls <= guardrails.maxToolCallsPerRequest
    && classValue(input.estimatedCostClass) <= classValue(guardrails.maxCostClass)
    && classValue(input.contextSizeClass) <= classValue(guardrails.maxContextSizeClass);
}

export function createInitialProviderHealth(): FanAtlasAIProviderHealth {
  return {
    state: "healthy",
    recentSuccessCount: 0,
    recentFailureCount: 0,
    timeoutCount: 0
  };
}

export function isProviderAvailable(health: FanAtlasAIProviderHealth, now = Date.now()) {
  return health.state !== "unavailable" || !health.cooldownUntil || health.cooldownUntil <= now;
}

export function recordProviderSuccess(health: FanAtlasAIProviderHealth): FanAtlasAIProviderHealth {
  return {
    ...health,
    state: "healthy",
    recentSuccessCount: health.recentSuccessCount + 1,
    recentFailureCount: Math.max(0, health.recentFailureCount - 1),
    cooldownUntil: undefined
  };
}

export function recordProviderFailure(health: FanAtlasAIProviderHealth, failure: "error" | "timeout", now = Date.now()): FanAtlasAIProviderHealth {
  const recentFailureCount = health.recentFailureCount + 1;
  const timeoutCount = failure === "timeout" ? health.timeoutCount + 1 : health.timeoutCount;
  const unavailable = recentFailureCount >= 3 || timeoutCount >= 2;
  return {
    ...health,
    state: unavailable ? "unavailable" : "degraded",
    recentFailureCount,
    timeoutCount,
    lastFailureAt: now,
    cooldownUntil: unavailable ? now + 60_000 : undefined
  };
}

export function dateBucket(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function safeSupportReference(requestId: string) {
  const compact = requestId.replace(/[^A-Za-z0-9]/g, "").slice(-6).toUpperCase().padStart(6, "0");
  return `FA-${compact}`;
}

export function isHighStakesSourceCategory(category: FanAtlasAISourceCategory | string) {
  return category === "official_government"
    || category === "official_embassy"
    || category === "official_transport"
    || category === "official_tourism"
    || category === "official_airport"
    || category === "official_emergency"
    || category === "recognized_weather"
    || category === "authoritative_health";
}
