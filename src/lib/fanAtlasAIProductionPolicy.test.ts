import { describe, expect, it } from "vitest";
import {
  FANATLAS_AI_INITIAL_TASK_ALLOWLIST,
  createInitialProviderHealth,
  isWithinCostGuardrails,
  isFanAtlasAIEntitled,
  isProviderAvailable,
  isTaskAllowedForRelease,
  parseAllowlist,
  parseFanAtlasAIReleaseMode,
  recordProviderFailure,
  recordProviderSuccess,
  safeSupportReference,
  validateReleasePolicy
} from "./fanAtlasAIProductionPolicy";

describe("FanAtlas AI production policy", () => {
  it("parses release modes with fail-closed defaults", () => {
    expect(parseFanAtlasAIReleaseMode("production")).toBe("production");
    expect(parseFanAtlasAIReleaseMode("unexpected")).toBe("disabled");
    expect(parseFanAtlasAIReleaseMode(undefined, true, false)).toBe("production");
    expect(parseFanAtlasAIReleaseMode(undefined, false, true)).toBe("internal");
  });

  it("enforces server-side entitlement by release mode", () => {
    const policy = {
      mode: "beta" as const,
      internalAllowlist: [],
      betaAllowlist: ["user-1", "beta@example.com"],
      taskAllowlist: FANATLAS_AI_INITIAL_TASK_ALLOWLIST,
      toolAllowlist: [],
      killSwitch: false
    };

    expect(isFanAtlasAIEntitled({ id: "user-1" }, policy)).toBe(true);
    expect(isFanAtlasAIEntitled({ id: "user-2", email: "beta@example.com" }, policy)).toBe(true);
    expect(isFanAtlasAIEntitled({ id: "user-3" }, policy)).toBe(false);
    expect(isFanAtlasAIEntitled({ id: "user-1" }, { ...policy, killSwitch: true })).toBe(false);
  });

  it("uses explicit allowlists for initial production tasks", () => {
    const policy = {
      mode: "production" as const,
      internalAllowlist: [],
      betaAllowlist: [],
      taskAllowlist: FANATLAS_AI_INITIAL_TASK_ALLOWLIST,
      toolAllowlist: [],
      killSwitch: false
    };

    expect(isTaskAllowedForRelease("itinerary_generation", policy)).toBe(true);
    expect(isTaskAllowedForRelease("visa_rule_research", policy)).toBe(false);
  });

  it("fails closed for internal and beta modes without explicit allowlists", () => {
    const policy = {
      mode: "internal" as const,
      internalAllowlist: [],
      betaAllowlist: [],
      taskAllowlist: FANATLAS_AI_INITIAL_TASK_ALLOWLIST,
      toolAllowlist: [],
      killSwitch: false
    };

    expect(validateReleasePolicy(policy)).toEqual({ ok: false, reason: "missing_internal_allowlist" });
    expect(validateReleasePolicy({ ...policy, internalAllowlist: ["internal@example.test"] })).toEqual({ ok: true });
    expect(validateReleasePolicy({ ...policy, mode: "beta", betaAllowlist: [] })).toEqual({ ok: false, reason: "missing_beta_allowlist" });
  });

  it("enforces provider-neutral cost guardrails", () => {
    const guardrails = {
      maxModelCallsPerRequest: 1,
      maxToolCallsPerRequest: 1,
      maxCostClass: "medium" as const,
      maxContextSizeClass: "small" as const,
      maxOutputCharacters: 1200
    };

    expect(isWithinCostGuardrails({
      contextSizeClass: "small",
      estimatedCostClass: "low",
      expectedModelCalls: 1,
      expectedToolCalls: 1
    }, guardrails)).toBe(true);
    expect(isWithinCostGuardrails({
      contextSizeClass: "large",
      estimatedCostClass: "low",
      expectedModelCalls: 1,
      expectedToolCalls: 1
    }, guardrails)).toBe(false);
    expect(isWithinCostGuardrails({
      contextSizeClass: "small",
      estimatedCostClass: "high",
      expectedModelCalls: 1,
      expectedToolCalls: 1
    }, guardrails)).toBe(false);
  });

  it("tracks provider health without private prompt data", () => {
    const healthy = createInitialProviderHealth();
    const degraded = recordProviderFailure(healthy, "error", 1000);
    const unavailable = recordProviderFailure(recordProviderFailure(degraded, "timeout", 1100), "timeout", 1200);

    expect(degraded.state).toBe("degraded");
    expect(unavailable.state).toBe("unavailable");
    expect(isProviderAvailable(unavailable, 1201)).toBe(false);
    expect(recordProviderSuccess(unavailable).state).toBe("healthy");
  });

  it("parses allowlists and emits safe support references", () => {
    expect(parseAllowlist(" User-1, test@example.com ,, ")).toEqual(["user-1", "test@example.com"]);
    expect(safeSupportReference("request-user-123456")).toBe("FA-123456");
  });
});
