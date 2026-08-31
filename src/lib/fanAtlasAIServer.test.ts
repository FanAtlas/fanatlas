import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler, { runFanAtlasAI } from "../../api/fanatlas-ai";
import { FANATLAS_AI_API_VERSION, createDefaultFanAtlasAIConsent, type FanAtlasAIRequest } from "./fanAtlasAIContracts";
import { FANATLAS_AI_INITIAL_TASK_ALLOWLIST, FANATLAS_AI_INITIAL_TOOL_ALLOWLIST } from "./fanAtlasAIProductionPolicy";
import { resetMemoryAICoordinationStoresForTests } from "../server/ai/aiCoordinationStore";

const baseConfig = {
  enabled: true,
  releasePolicy: {
    mode: "internal" as const,
    internalAllowlist: ["user-1", "test-user"],
    betaAllowlist: [],
    taskAllowlist: FANATLAS_AI_INITIAL_TASK_ALLOWLIST,
    toolAllowlist: FANATLAS_AI_INITIAL_TOOL_ALLOWLIST,
    killSwitch: false
  },
  mockMode: true,
  model: "test-model",
  maxRequestsPerMinute: 100,
  maxRequestsPerDay: 500,
  maxConcurrentRequestsPerUser: 1,
  timeoutMs: 25_000,
  costGuardrails: {
    maxModelCallsPerRequest: 1,
    maxToolCallsPerRequest: 3,
    maxCostClass: "medium" as const,
    maxContextSizeClass: "medium" as const,
    maxOutputCharacters: 3000
  },
  latencyBudgets: {
    totalRequestMs: 25_000,
    providerMs: 25_000,
    toolMs: 8_000,
    currentInformationMs: 10_000
  },
  coordination: {
    backend: "memory" as const,
    lockTtlMs: 60_000,
    idempotencyTtlMs: 6 * 60 * 60_000,
    providerCooldownMs: 60_000,
    allowMemoryInProduction: false
  },
  tools: {
    weatherEnabled: false,
    weatherProvider: "disabled" as const,
    currencyEnabled: false,
    currencyProvider: "disabled" as const,
    emergencyInfoEnabled: false,
    currentResearchEnabled: false,
    currentResearchProvider: "disabled" as const,
    liveDatabaseValidated: false,
    toolTimeoutMs: 8_000
  }
};

function request(overrides: Partial<FanAtlasAIRequest> = {}): FanAtlasAIRequest {
  return {
    version: FANATLAS_AI_API_VERSION,
    conversationId: "conversation-test",
    messages: [],
    message: "Help me improve this trip.",
    consent: createDefaultFanAtlasAIConsent(),
    locale: "en",
    clientRequestId: "request-test",
    contextSnapshot: {
      activeTrip: {
        id: "trip-1",
        title: "Casablanca Planning",
        status: "planned",
        startDate: "2026-10-01",
        endDate: "2026-10-05",
        destinationLabel: "Casablanca, Morocco",
        itineraryDayCount: 2,
        plannedPlaceCount: 3,
        visitedPlaceCount: 0,
        journalEntryCount: 1,
        photoCount: 2
      },
      passport: {
        visitedCountryCount: 4,
        visitedCityCount: 8
      },
      insights: {
        completedTrips: 5,
        averageTripLength: 4,
        topCountries: ["Morocco"]
      }
    },
    ...overrides
  };
}

describe("FanAtlas AI server orchestration", () => {
  beforeEach(() => {
    resetMemoryAICoordinationStoresForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires authentication at the API boundary", async () => {
    vi.stubEnv("FANATLAS_AI_MOCK", "true");
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    await handler({ method: "POST", headers: {}, body: request() }, { status });

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "unauthenticated" }));
  });

  it("fails closed when the server feature flag is disabled", async () => {
    vi.stubEnv("FANATLAS_AI_ENABLED", "false");
    vi.stubEnv("FANATLAS_AI_MOCK", "false");
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    await handler({ method: "POST", headers: { authorization: "Bearer test-token" }, body: request() }, { status });

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "ai_disabled" }));
  });

  it("fails closed for invalid release mode configuration", async () => {
    vi.stubEnv("FANATLAS_AI_RELEASE_MODE", "unexpected");
    vi.stubEnv("FANATLAS_AI_MOCK", "false");
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    await handler({ method: "POST", headers: { authorization: "Bearer test-token" }, body: request() }, { status });

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "ai_disabled" }));
  });

  it("requires explicit internal entitlement outside mock mode", async () => {
    vi.stubEnv("FANATLAS_AI_RELEASE_MODE", "internal");
    vi.stubEnv("FANATLAS_AI_MOCK", "false");
    vi.stubEnv("FANATLAS_AI_INTERNAL_ALLOWLIST", "");
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    await handler({ method: "POST", headers: { authorization: "Bearer test-token" }, body: request() }, { status });

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "ai_disabled" }));
  });

  it("honors the kill switch before idempotency, quota, provider, or tools", async () => {
    vi.stubEnv("FANATLAS_AI_RELEASE_MODE", "internal");
    vi.stubEnv("FANATLAS_AI_MOCK", "true");
    vi.stubEnv("FANATLAS_AI_KILL_SWITCH", "true");
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    await handler({ method: "POST", headers: { authorization: "Bearer test-token" }, body: request({ taskHint: "packing_guidance", message: "Weather in Lisbon tomorrow?" }) }, { status });

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "ai_disabled" }));
  });

  it("rejects production memory coordination instead of running uncoordinated", async () => {
    vi.stubEnv("FANATLAS_AI_RELEASE_MODE", "production");
    vi.stubEnv("FANATLAS_AI_MOCK", "false");
    vi.stubEnv("FANATLAS_AI_COORDINATION_BACKEND", "memory");
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    await handler({ method: "POST", headers: { authorization: "Bearer test-token" }, body: request() }, { status });

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "coordination_unavailable" }));
  });

  it("enforces release task allowlists before provider generation", async () => {
    vi.stubEnv("FANATLAS_AI_MOCK", "true");
    vi.stubEnv("FANATLAS_AI_TASK_ALLOWLIST", "itinerary_generation");
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    await handler({
      method: "POST",
      headers: { authorization: "Bearer test-token" },
      body: request({ message: "What are current visa rules?", taskHint: "visa_rule_research" })
    }, { status });

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "ai_disabled" }));
  });

  it("rejects active-trip IDs that do not match the minimized snapshot", async () => {
    vi.stubEnv("FANATLAS_AI_MOCK", "true");
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    await handler({
      method: "POST",
      headers: { authorization: "Bearer test-token" },
      body: request({ activeTripId: "different-trip" })
    }, { status });

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "invalid_request" }));
  });

  it("returns a provider-neutral mocked assistant response without provider branding", async () => {
    const response = await runFanAtlasAI(request(), baseConfig, "user-1");

    expect(response.status).toBe("completed");
    expect(response.message?.role).toBe("assistant");
    expect(response.message?.content).toContain("FanAtlas AI");
    expect(response.message?.content).not.toContain("OpenAI");
    expect(response.message?.content).not.toContain("GPT");
    expect(response.usage.modelCallCount).toBe(1);
  });

  it("blocks current-information tasks when research tools are unavailable", async () => {
    const response = await runFanAtlasAI(request({
      message: "Find current entry requirements for Morocco.",
      taskHint: "visa_rule_research"
    }), baseConfig, "user-1");

    expect(response.status).toBe("clarification_required");
    expect(response.clarification?.code).toBe("current_information_unavailable");
    expect(response.usage.modelCallCount).toBe(0);
    expect(response.toolActivity.some((activity) => activity.status === "blocked")).toBe(true);
  });

  it("returns source-backed weather output when the weather tool is explicitly allowed", async () => {
    const response = await runFanAtlasAI(request({
      message: "What is the weather in Casablanca tomorrow?",
      taskHint: "packing_guidance"
    }), {
      ...baseConfig,
      releasePolicy: {
        ...baseConfig.releasePolicy,
        toolAllowlist: ["weather_lookup"]
      },
      tools: {
        ...baseConfig.tools,
        weatherEnabled: true,
        weatherProvider: "mock",
        liveDatabaseValidated: true
      }
    }, "user-1");

    expect(response.status).toBe("completed");
    expect(response.structuredOutput?.type).toBe("weather_result");
    expect(response.citations.map((citation) => citation.id)).toContain("weather-open-meteo");
    expect(response.usage.modelCallCount).toBe(0);
  });

  it("blocks requests that exceed internal cost guardrails before provider execution", async () => {
    const response = await runFanAtlasAI(request({ message: "Build an itinerary with weather.", taskHint: "packing_guidance" }), {
      ...baseConfig,
      costGuardrails: {
        ...baseConfig.costGuardrails,
        maxToolCallsPerRequest: 0
      },
      releasePolicy: {
        ...baseConfig.releasePolicy,
        toolAllowlist: ["weather_lookup"]
      },
      tools: {
        ...baseConfig.tools,
        weatherEnabled: true,
        weatherProvider: "mock",
        liveDatabaseValidated: true
      }
    }, "user-1");

    expect(response.status).toBe("blocked");
    expect(response.errorCode).toBe("usage_limit_reached");
    expect(response.usage.modelCallCount).toBe(0);
  });

  it("fails closed for live tools when database validation has not been confirmed", async () => {
    const response = await runFanAtlasAI(request({
      message: "Convert 100 USD to EUR.",
      taskHint: "budget_guidance"
    }), {
      ...baseConfig,
      mockMode: false,
      releasePolicy: {
        ...baseConfig.releasePolicy,
        toolAllowlist: ["currency_conversion"]
      },
      tools: {
        ...baseConfig.tools,
        currencyEnabled: true,
        currencyProvider: "open_er_api",
        liveDatabaseValidated: false
      }
    }, "user-1");

    expect(response.status).toBe("clarification_required");
    expect(response.errorCode).toBe("current_information_unavailable");
    expect(JSON.stringify(response)).not.toContain("100 USD to EUR");
  });

  it("excludes Journal body consent supplied by the browser from server context", async () => {
    const response = await runFanAtlasAI(request({
      consent: {
        ...createDefaultFanAtlasAIConsent(),
        allowJournalContent: true
      },
      message: "Summarize my memories safely.",
      contextSnapshot: {
        ...request().contextSnapshot,
        hiddenJournalBody: "JOURNAL_BODY_SECRET"
      } as unknown as FanAtlasAIRequest["contextSnapshot"]
    }), baseConfig, "user-1");

    expect(response.status).toBe("completed");
    expect(JSON.stringify(response)).not.toContain("JOURNAL_BODY_SECRET");
    expect(response.warnings.map((warning) => warning.code)).toContain("sensitive_context_excluded");
  });

  it("uses idempotency to avoid duplicate mocked provider calls for the same delivery", async () => {
    vi.stubEnv("FANATLAS_AI_MOCK", "true");
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    await handler({ method: "POST", headers: { authorization: "Bearer test-token" }, body: request({ clientRequestId: "same-request" }) }, { status });
    await handler({ method: "POST", headers: { authorization: "Bearer test-token" }, body: request({ clientRequestId: "same-request" }) }, { status });

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenLastCalledWith(expect.objectContaining({ requestId: "same-request" }));
  });
});
