import { describe, expect, it, vi } from "vitest";
import { FANATLAS_AI_INITIAL_TASK_ALLOWLIST } from "../../lib/fanAtlasAIProductionPolicy";
import { FANATLAS_AI_API_VERSION, createDefaultFanAtlasAIConsent, type FanAtlasAIResponse } from "../../lib/fanAtlasAIContracts";
import { validateAICoordinationConfig } from "./aiCoordinationStore";
import { checkAICoordinationReadiness, isSuccessfulReadinessLockResult, resetAICoordinationReadinessCacheForTests } from "./aiCoordinationReadiness";
import { createAIRequestFingerprint } from "./aiRequestFingerprint";
import { createMemoryAICoordinationStores } from "./memoryAICoordinationStore";
import { createSupabaseAICoordinationStores, normalizeAIProviderProbeResult } from "./supabaseAICoordinationStore";

const fixedNow = new Date("2026-08-06T12:34:20.000Z");

function safeResponse(requestId = "request-1"): FanAtlasAIResponse {
  return {
    version: FANATLAS_AI_API_VERSION,
    requestId,
    conversationId: "conversation-1",
    status: "completed",
    citations: [],
    toolActivity: [],
    warnings: [],
    usage: {
      contextSizeClass: "tiny",
      toolCallCount: 0,
      modelCallCount: 1,
      responseLengthClass: "short"
    },
    message: {
      id: `assistant-${requestId}`,
      role: "assistant",
      content: "Safe visible answer.",
      createdAt: fixedNow.toISOString(),
      status: "complete"
    }
  };
}

describe("AI coordination store contracts", () => {
  it("accepts successful Supabase void RPCs with empty response bodies", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => ""
    }));
    vi.stubGlobal("fetch", fetchMock);
    const stores = createSupabaseAICoordinationStores({
      supabaseUrl: "https://fanatlas-validation.supabase.co",
      serviceRoleKey: "service-role-test-key"
    });

    await expect(stores.usage.finalizeUsage({
      userId: "user-1",
      usageDate: "2026-08-06",
      providerCallCount: 0,
      toolCallCount: 1
    })).resolves.toBeUndefined();
  });

  it("reserves the final quota slot atomically within minute and UTC day buckets", async () => {
    const stores = createMemoryAICoordinationStores();
    const first = await stores.usage.reserveQuota({
      userId: "user-1",
      requestId: "request-1",
      usageDate: "2026-08-06",
      minuteBucket: "2026-08-06T12:34:00.000Z",
      maxRequestsPerMinute: 1,
      maxRequestsPerDay: 2,
      now: fixedNow
    });
    const second = await stores.usage.reserveQuota({
      userId: "user-1",
      requestId: "request-2",
      usageDate: "2026-08-06",
      minuteBucket: "2026-08-06T12:34:00.000Z",
      maxRequestsPerMinute: 1,
      maxRequestsPerDay: 2,
      now: fixedNow
    });

    expect(first.allowed).toBe(true);
    expect(second).toMatchObject({ allowed: false, limitCategory: "minute" });
  });

  it("enforces daily limits without storing raw request content", async () => {
    const stores = createMemoryAICoordinationStores();
    const common = {
      userId: "user-1",
      usageDate: "2026-08-06",
      minuteBucket: "2026-08-06T12:34:00.000Z",
      maxRequestsPerMinute: 10,
      maxRequestsPerDay: 1,
      now: fixedNow
    };

    expect((await stores.usage.reserveQuota({ ...common, requestId: "request-1" })).allowed).toBe(true);
    expect(await stores.usage.reserveQuota({ ...common, requestId: "request-2", minuteBucket: "2026-08-06T12:35:00.000Z" })).toMatchObject({
      allowed: false,
      limitCategory: "daily"
    });
    expect(JSON.stringify(stores.usage)).not.toContain("Help me");
  });

  it("isolates idempotency by user and detects same-key conflicts", async () => {
    const stores = createMemoryAICoordinationStores();
    const started = await stores.idempotency.start({
      userId: "user-1",
      clientRequestId: "client-1",
      requestFingerprint: "fingerprint-a",
      now: fixedNow,
      ttlMs: 60_000
    });
    const conflict = await stores.idempotency.start({
      userId: "user-1",
      clientRequestId: "client-1",
      requestFingerprint: "fingerprint-b",
      now: fixedNow,
      ttlMs: 60_000
    });
    const otherUser = await stores.idempotency.start({
      userId: "user-2",
      clientRequestId: "client-1",
      requestFingerprint: "fingerprint-b",
      now: fixedNow,
      ttlMs: 60_000
    });

    expect(started.status).toBe("started");
    expect(conflict.status).toBe("conflict");
    expect(otherUser.status).toBe("started");
  });

  it("keeps same-key idempotency starts rerunnable without weakening semantics", async () => {
    const stores = createMemoryAICoordinationStores();
    const inputs = Array.from({ length: 4 }, () => stores.idempotency.start({
      userId: "user-1",
      clientRequestId: "client-1",
      requestFingerprint: "fingerprint-a",
      now: fixedNow,
      ttlMs: 60_000
    }));

    const results = await Promise.all(inputs);

    expect(results.filter((result) => result.status === "started")).toHaveLength(1);
    expect(results.filter((result) => result.status === "processing")).toHaveLength(3);
    expect(await stores.idempotency.start({
      userId: "user-1",
      clientRequestId: "client-1",
      requestFingerprint: "fingerprint-b",
      now: fixedNow,
      ttlMs: 60_000
    })).toEqual({ status: "conflict" });
  });

  it("replays only completed safe response snapshots within the idempotency window", async () => {
    const stores = createMemoryAICoordinationStores();
    await stores.idempotency.start({
      userId: "user-1",
      clientRequestId: "client-1",
      requestFingerprint: "fingerprint-a",
      now: fixedNow,
      ttlMs: 60_000
    });
    await stores.idempotency.complete({
      userId: "user-1",
      clientRequestId: "client-1",
      requestFingerprint: "fingerprint-a",
      status: "completed",
      response: safeResponse(),
      now: fixedNow,
      ttlMs: 60_000
    });

    const replay = await stores.idempotency.start({
      userId: "user-1",
      clientRequestId: "client-1",
      requestFingerprint: "fingerprint-a",
      now: new Date("2026-08-06T12:34:30.000Z"),
      ttlMs: 60_000
    });

    expect(replay.status).toBe("replay");
    expect(JSON.stringify(replay)).not.toContain("provider");
    expect(JSON.stringify(replay)).not.toContain("JOURNAL_BODY");
  });

  it("acquires, protects, releases, and recovers stale conversation locks", async () => {
    const stores = createMemoryAICoordinationStores();
    const first = await stores.concurrency.acquire({
      lockKey: "ai:user-1:conversation-1",
      userId: "user-1",
      conversationId: "conversation-1",
      requestId: "request-1",
      now: fixedNow,
      ttlMs: 1000
    });
    const blocked = await stores.concurrency.acquire({
      lockKey: "ai:user-1:conversation-1",
      userId: "user-1",
      conversationId: "conversation-1",
      requestId: "request-2",
      now: fixedNow,
      ttlMs: 1000
    });
    await stores.concurrency.release("ai:user-1:conversation-1", "wrong-request");
    const stillBlocked = await stores.concurrency.acquire({
      lockKey: "ai:user-1:conversation-1",
      userId: "user-1",
      conversationId: "conversation-1",
      requestId: "request-2",
      now: fixedNow,
      ttlMs: 1000
    });
    const recovered = await stores.concurrency.acquire({
      lockKey: "ai:user-1:conversation-1",
      userId: "user-1",
      conversationId: "conversation-1",
      requestId: "request-3",
      now: new Date("2026-08-06T12:34:22.000Z"),
      ttlMs: 1000
    });

    expect(first.status).toBe("acquired");
    expect(blocked.status).toBe("already_locked");
    expect(stillBlocked.status).toBe("already_locked");
    expect(recovered.status).toBe("stale_lock_recovered");
  });

  it("shares circuit breaker open and half-open probe control", async () => {
    const stores = createMemoryAICoordinationStores();
    await stores.providerHealth.recordFailure("primary", "timeout", fixedNow, 60_000);
    await stores.providerHealth.recordFailure("primary", "timeout", new Date("2026-08-06T12:34:21.000Z"), 60_000);
    expect(await stores.providerHealth.beforeProviderCall("primary", new Date("2026-08-06T12:34:22.000Z"), 60_000)).toMatchObject({
      allowed: false,
      state: "open"
    });
    const firstProbe = await stores.providerHealth.beforeProviderCall("primary", new Date("2026-08-06T12:35:22.000Z"), 60_000);
    const secondProbe = await stores.providerHealth.beforeProviderCall("primary", new Date("2026-08-06T12:35:23.000Z"), 60_000);

    expect(firstProbe).toMatchObject({ allowed: true, state: "half_open" });
    expect(secondProbe).toMatchObject({ allowed: false, state: "half_open" });
  });

  it("allows exactly one parallel half-open probe after provider cooldown", async () => {
    const stores = createMemoryAICoordinationStores();
    await stores.providerHealth.recordFailure("parallel-provider", "timeout", fixedNow, 60_000);
    await stores.providerHealth.recordFailure("parallel-provider", "timeout", new Date("2026-08-06T12:34:21.000Z"), 60_000);

    const results = await Promise.all(Array.from({ length: 10 }, () => stores.providerHealth.beforeProviderCall(
      "parallel-provider",
      new Date("2026-08-06T12:35:22.000Z"),
      60_000
    )));

    expect(results.filter((result) => result.allowed && result.state === "half_open")).toHaveLength(1);
    expect(results.filter((result) => !result.allowed && result.state === "half_open")).toHaveLength(9);
  });

  it("blocks another probe while a half-open lease is active", async () => {
    const stores = createMemoryAICoordinationStores();
    await stores.providerHealth.recordFailure("active-lease-provider", "timeout", fixedNow, 60_000);
    await stores.providerHealth.recordFailure("active-lease-provider", "timeout", new Date("2026-08-06T12:34:21.000Z"), 60_000);

    expect(await stores.providerHealth.beforeProviderCall("active-lease-provider", new Date("2026-08-06T12:35:22.000Z"), 60_000)).toMatchObject({
      allowed: true,
      state: "half_open"
    });
    expect(await stores.providerHealth.beforeProviderCall("active-lease-provider", new Date("2026-08-06T12:35:23.000Z"), 60_000)).toMatchObject({
      allowed: false,
      state: "half_open"
    });
  });

  it("allows exactly one stale half-open lease recovery", async () => {
    const stores = createMemoryAICoordinationStores();
    await stores.providerHealth.recordFailure("stale-half-open-provider", "timeout", fixedNow, 60_000);
    await stores.providerHealth.recordFailure("stale-half-open-provider", "timeout", new Date("2026-08-06T12:34:21.000Z"), 60_000);
    await stores.providerHealth.beforeProviderCall("stale-half-open-provider", new Date("2026-08-06T12:35:22.000Z"), 60_000);

    const results = await Promise.all(Array.from({ length: 10 }, () => stores.providerHealth.beforeProviderCall(
      "stale-half-open-provider",
      new Date("2026-08-06T12:35:53.000Z"),
      60_000
    )));

    expect(results.filter((result) => result.allowed && result.state === "half_open")).toHaveLength(1);
    expect(results.filter((result) => !result.allowed && result.state === "half_open")).toHaveLength(9);
  });

  it("closes the provider circuit after a successful half-open probe", async () => {
    const stores = createMemoryAICoordinationStores();
    await stores.providerHealth.recordFailure("success-provider", "timeout", fixedNow, 60_000);
    await stores.providerHealth.recordFailure("success-provider", "timeout", new Date("2026-08-06T12:34:21.000Z"), 60_000);
    await stores.providerHealth.beforeProviderCall("success-provider", new Date("2026-08-06T12:35:22.000Z"), 60_000);
    await stores.providerHealth.recordSuccess("success-provider", new Date("2026-08-06T12:35:23.000Z"));

    expect(await stores.providerHealth.beforeProviderCall("success-provider", new Date("2026-08-06T12:35:24.000Z"), 60_000)).toMatchObject({
      allowed: true,
      state: "closed"
    });
  });

  it("reopens the provider circuit after a failed half-open probe", async () => {
    const stores = createMemoryAICoordinationStores();
    await stores.providerHealth.recordFailure("failed-provider", "timeout", fixedNow, 60_000);
    await stores.providerHealth.recordFailure("failed-provider", "timeout", new Date("2026-08-06T12:34:21.000Z"), 60_000);
    await stores.providerHealth.beforeProviderCall("failed-provider", new Date("2026-08-06T12:35:22.000Z"), 60_000);
    await stores.providerHealth.recordFailure("failed-provider", "provider_5xx", new Date("2026-08-06T12:35:23.000Z"), 60_000);

    expect(await stores.providerHealth.beforeProviderCall("failed-provider", new Date("2026-08-06T12:35:24.000Z"), 60_000)).toMatchObject({
      allowed: false,
      state: "open"
    });
  });

  it("does not let unrelated provider IDs block each other", async () => {
    const stores = createMemoryAICoordinationStores();
    for (const provider of ["provider-a", "provider-b"]) {
      await stores.providerHealth.recordFailure(provider, "timeout", fixedNow, 60_000);
      await stores.providerHealth.recordFailure(provider, "timeout", new Date("2026-08-06T12:34:21.000Z"), 60_000);
    }

    const results = await Promise.all(["provider-a", "provider-b"].map((provider) => stores.providerHealth.beforeProviderCall(
      provider,
      new Date("2026-08-06T12:35:22.000Z"),
      60_000
    )));

    expect(results).toEqual([
      { allowed: true, state: "half_open" },
      { allowed: true, state: "half_open" }
    ]);
  });

  it("fails closed for malformed or unknown database provider probe results", () => {
    expect(normalizeAIProviderProbeResult(null)).toEqual({ allowed: false, state: "open" });
    expect(normalizeAIProviderProbeResult({ allowed: true, state: "unexpected" })).toEqual({ allowed: false, state: "open" });
    expect(normalizeAIProviderProbeResult({ state: "closed" })).toEqual({ allowed: false, state: "open" });
    expect(normalizeAIProviderProbeResult({ allowed: true, state: "closed" })).toEqual({ allowed: true, state: "closed" });
  });

  it("rejects memory coordination in production unless explicitly allowed", () => {
    expect(validateAICoordinationConfig({
      releaseMode: "production",
      coordination: {
        backend: "memory",
        lockTtlMs: 60_000,
        idempotencyTtlMs: 60_000,
        providerCooldownMs: 60_000,
        allowMemoryInProduction: false
      }
    })).toMatchObject({ ok: false, errors: ["memory_backend_not_allowed_in_production"] });
  });

  it("creates deterministic privacy-safe request fingerprints", async () => {
    const request = {
      version: FANATLAS_AI_API_VERSION,
      conversationId: "conversation-1",
      messages: [],
      message: "Private prompt that must not be stored",
      taskHint: "itinerary_generation" as const,
      activeTripId: "trip-1",
      selectedDestinationIds: [],
      requestedContextScopes: ["selected_trip" as const],
      consent: createDefaultFanAtlasAIConsent(),
      locale: "en",
      clientRequestId: "client-1"
    };
    const first = await createAIRequestFingerprint({ userId: "user-1", request, task: "itinerary_generation" });
    const second = await createAIRequestFingerprint({ userId: "user-1", request, task: "itinerary_generation" });

    expect(first).toBe(second);
    expect(first).not.toContain(request.message);
  });

  it("keeps production task allowlist explicit in coordination tests", () => {
    expect(FANATLAS_AI_INITIAL_TASK_ALLOWLIST).toContain("itinerary_generation");
    expect(FANATLAS_AI_INITIAL_TASK_ALLOWLIST).not.toContain("visa_rule_research");
  });

  it("fails the live readiness gate closed without shared Supabase coordination", async () => {
    resetAICoordinationReadinessCacheForTests();
    const memoryReadiness = await checkAICoordinationReadiness({
      backend: "memory",
      lockTtlMs: 60_000,
      idempotencyTtlMs: 60_000,
      providerCooldownMs: 60_000,
      allowMemoryInProduction: false
    }, fixedNow);

    resetAICoordinationReadinessCacheForTests();
    const missingConfigReadiness = await checkAICoordinationReadiness({
      backend: "supabase",
      lockTtlMs: 60_000,
      idempotencyTtlMs: 60_000,
      providerCooldownMs: 60_000,
      allowMemoryInProduction: false
    }, fixedNow);

    expect(memoryReadiness).toMatchObject({ ready: false, errorCode: "coordination_not_shared" });
    expect(missingConfigReadiness).toMatchObject({ ready: false, errorCode: "missing_supabase_config" });
  });

  it("treats only owned lock acquisition statuses as successful readiness", () => {
    expect(isSuccessfulReadinessLockResult({
      status: "acquired",
      lockKey: "readiness:fresh",
      expiresAt: fixedNow.toISOString()
    })).toBe(true);
    expect(isSuccessfulReadinessLockResult({
      status: "stale_lock_recovered",
      lockKey: "readiness:recovered",
      expiresAt: fixedNow.toISOString()
    })).toBe(true);
    expect(isSuccessfulReadinessLockResult({
      status: "already_locked",
      lockKey: "readiness:active",
      expiresAt: fixedNow.toISOString()
    })).toBe(false);
    expect(isSuccessfulReadinessLockResult({
      status: "storage_failure",
      lockKey: "readiness:storage"
    })).toBe(false);
    expect(isSuccessfulReadinessLockResult({
      status: "unexpected_status",
      lockKey: "readiness:unknown"
    })).toBe(false);
    expect(isSuccessfulReadinessLockResult({
      status: "acquired"
    })).toBe(false);
    expect(isSuccessfulReadinessLockResult(null)).toBe(false);
  });

  it("passes readiness lock validation for fresh and stale-recovered memory locks", async () => {
    const stores = createMemoryAICoordinationStores();
    const fresh = await stores.concurrency.acquire({
      lockKey: "readiness:fresh",
      userId: "user-1",
      conversationId: "conversation-1",
      requestId: "request-fresh",
      now: fixedNow,
      ttlMs: 1000
    });
    const expired = await stores.concurrency.acquire({
      lockKey: "readiness:expired",
      userId: "user-1",
      conversationId: "conversation-1",
      requestId: "request-expired",
      now: fixedNow,
      ttlMs: 1000
    });
    const recovered = await stores.concurrency.acquire({
      lockKey: "readiness:expired",
      userId: "user-1",
      conversationId: "conversation-1",
      requestId: "request-recovered",
      now: new Date("2026-08-06T12:34:22.000Z"),
      ttlMs: 1000
    });

    expect(fresh.status).toBe("acquired");
    expect(recovered.status).toBe("stale_lock_recovered");
    expect(isSuccessfulReadinessLockResult(fresh)).toBe(true);
    expect(isSuccessfulReadinessLockResult(recovered)).toBe(true);
    expect(expired.status).toBe("acquired");
  });

  it("fails readiness lock validation for active, unknown, and malformed lock results", async () => {
    const stores = createMemoryAICoordinationStores();
    await stores.concurrency.acquire({
      lockKey: "readiness:active",
      userId: "user-1",
      conversationId: "conversation-1",
      requestId: "request-active",
      now: fixedNow,
      ttlMs: 1000
    });
    const active = await stores.concurrency.acquire({
      lockKey: "readiness:active",
      userId: "user-1",
      conversationId: "conversation-1",
      requestId: "request-blocked",
      now: fixedNow,
      ttlMs: 1000
    });

    expect(active.status).toBe("already_locked");
    expect(isSuccessfulReadinessLockResult(active)).toBe(false);
    expect(isSuccessfulReadinessLockResult({ status: "unknown", lockKey: "readiness:unknown" })).toBe(false);
    expect(isSuccessfulReadinessLockResult({ lockKey: "readiness:missing-status" })).toBe(false);
    expect(isSuccessfulReadinessLockResult({ status: "acquired" })).toBe(false);
  });

  it("releases a recovered readiness lock only with the current request owner", async () => {
    const stores = createMemoryAICoordinationStores();
    await stores.concurrency.acquire({
      lockKey: "readiness:release-owner",
      userId: "user-1",
      conversationId: "conversation-1",
      requestId: "request-expired",
      now: fixedNow,
      ttlMs: 1000
    });
    const recovered = await stores.concurrency.acquire({
      lockKey: "readiness:release-owner",
      userId: "user-1",
      conversationId: "conversation-1",
      requestId: "request-current-owner",
      now: new Date("2026-08-06T12:34:22.000Z"),
      ttlMs: 1000
    });
    expect(isSuccessfulReadinessLockResult(recovered)).toBe(true);

    await stores.concurrency.release("readiness:release-owner", "request-expired");
    const stillBlocked = await stores.concurrency.acquire({
      lockKey: "readiness:release-owner",
      userId: "user-1",
      conversationId: "conversation-1",
      requestId: "request-after-wrong-release",
      now: new Date("2026-08-06T12:34:22.000Z"),
      ttlMs: 1000
    });
    expect(stillBlocked.status).toBe("already_locked");

    await stores.concurrency.release("readiness:release-owner", "request-current-owner");
    const afterOwnerRelease = await stores.concurrency.acquire({
      lockKey: "readiness:release-owner",
      userId: "user-1",
      conversationId: "conversation-1",
      requestId: "request-after-owner-release",
      now: new Date("2026-08-06T12:34:22.000Z"),
      ttlMs: 1000
    });
    expect(afterOwnerRelease.status).toBe("acquired");
  });

  it("allows only one parallel fresh acquisition for the same memory lock key", async () => {
    const stores = createMemoryAICoordinationStores();
    const results = await Promise.all(Array.from({ length: 10 }, (_, index) => stores.concurrency.acquire({
      lockKey: "parallel:fresh",
      userId: `user-${index}`,
      conversationId: "conversation-1",
      requestId: `request-${index}`,
      now: fixedNow,
      ttlMs: 1000
    })));

    expect(results.filter((result) => result.status === "acquired")).toHaveLength(1);
    expect(results.filter((result) => result.status === "already_locked")).toHaveLength(9);
    expect(results.filter((result) => result.status === "stale_lock_recovered")).toHaveLength(0);
  });

  it("allows only one parallel stale recovery and preserves recovered ownership", async () => {
    const stores = createMemoryAICoordinationStores();
    await stores.concurrency.acquire({
      lockKey: "parallel:stale",
      userId: "old-user",
      conversationId: "conversation-1",
      requestId: "old-owner",
      now: fixedNow,
      ttlMs: 1000
    });

    const recoveryNow = new Date("2026-08-06T12:34:22.000Z");
    const results = await Promise.all(Array.from({ length: 10 }, (_, index) => stores.concurrency.acquire({
      lockKey: "parallel:stale",
      userId: `new-user-${index}`,
      conversationId: "conversation-1",
      requestId: `new-owner-${index}`,
      now: recoveryNow,
      ttlMs: 1000
    })));
    const recoveredIndex = results.findIndex((result) => result.status === "stale_lock_recovered");

    expect(results.filter((result) => result.status === "stale_lock_recovered")).toHaveLength(1);
    expect(results.filter((result) => result.status === "already_locked")).toHaveLength(9);
    expect(results.filter((result) => result.status === "acquired")).toHaveLength(0);

    await stores.concurrency.release("parallel:stale", "old-owner");
    expect((await stores.concurrency.acquire({
      lockKey: "parallel:stale",
      userId: "after-old-release",
      conversationId: "conversation-1",
      requestId: "after-old-release",
      now: recoveryNow,
      ttlMs: 1000
    })).status).toBe("already_locked");

    await stores.concurrency.release("parallel:stale", `new-owner-${recoveredIndex}`);
    expect((await stores.concurrency.acquire({
      lockKey: "parallel:stale",
      userId: "after-new-release",
      conversationId: "conversation-1",
      requestId: "after-new-release",
      now: recoveryNow,
      ttlMs: 1000
    })).status).toBe("acquired");
  });

  it("lets independent memory lock keys acquire without blocking each other", async () => {
    const stores = createMemoryAICoordinationStores();
    const results = await Promise.all(Array.from({ length: 10 }, (_, index) => stores.concurrency.acquire({
      lockKey: `parallel:independent:${index}`,
      userId: `user-${index}`,
      conversationId: `conversation-${index}`,
      requestId: `request-${index}`,
      now: fixedNow,
      ttlMs: 1000
    })));

    expect(results.filter((result) => result.status === "acquired")).toHaveLength(10);
    expect(results.filter((result) => result.status === "already_locked")).toHaveLength(0);
  });
});
