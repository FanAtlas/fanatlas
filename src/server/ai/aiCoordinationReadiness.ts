import type { AICoordinationConfig, AIConcurrencyLockResult } from "./aiCoordinationTypes";
import { createSupabaseAICoordinationStores } from "./supabaseAICoordinationStore";

export type AICoordinationReadiness = {
  ready: boolean;
  backend: "memory" | "supabase";
  schemaVersion?: string;
  checks: {
    connectivity: boolean;
    quotaRpc: boolean;
    idempotency: boolean;
    locks: boolean;
    providerHealth: boolean;
    toolCache: boolean;
  };
  checkedAt: string;
  errorCode?: "coordination_not_shared" | "missing_supabase_config" | "coordination_readiness_failed";
};

type CachedReadiness = {
  expiresAt: number;
  value: AICoordinationReadiness;
};

const READINESS_CACHE_MS = 60_000;
const READINESS_PREFIX = "fanatlas-validation-readiness";
let cachedReadiness: CachedReadiness | undefined;

export async function checkAICoordinationReadiness(config: AICoordinationConfig, now = new Date()): Promise<AICoordinationReadiness> {
  if (cachedReadiness && cachedReadiness.expiresAt > now.getTime()) return cachedReadiness.value;

  const checkedAt = now.toISOString();
  const base: AICoordinationReadiness = {
    ready: false,
    backend: config.backend,
    schemaVersion: "step54-ai-coordination-v1",
    checkedAt,
    checks: {
      connectivity: false,
      quotaRpc: false,
      idempotency: false,
      locks: false,
      providerHealth: false,
      toolCache: false
    }
  };

  if (config.backend !== "supabase") {
    return cache({ ...base, errorCode: "coordination_not_shared" }, now);
  }
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    return cache({ ...base, errorCode: "missing_supabase_config" }, now);
  }

  try {
    const stores = createSupabaseAICoordinationStores({
      supabaseUrl: config.supabaseUrl,
      serviceRoleKey: config.supabaseServiceRoleKey
    });
    const suffix = `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
    const readinessUserId = syntheticReadinessUuid(suffix);
    const usageDate = now.toISOString().slice(0, 10);
    const minuteBucket = new Date(Math.floor(now.getTime() / 60_000) * 60_000).toISOString();
    const lockKey = `${READINESS_PREFIX}-lock-${suffix}`;
    const clientRequestId = `${READINESS_PREFIX}-client-${suffix}`;
    const requestFingerprint = `${READINESS_PREFIX}-fingerprint-${suffix}`;
    const providerProfileId = `${READINESS_PREFIX}-provider-${suffix}`;

    try {
      await stores.usage.cleanup(now);
      base.checks.connectivity = true;

      const quota = await stores.usage.reserveQuota({
        userId: readinessUserId,
        requestId: `${READINESS_PREFIX}-request-${suffix}`,
        usageDate,
        minuteBucket,
        maxRequestsPerMinute: 1000,
        maxRequestsPerDay: 1000,
        now
      });
      base.checks.quotaRpc = quota.allowed;

      const idempotency = await stores.idempotency.start({
        userId: readinessUserId,
        clientRequestId,
        requestFingerprint,
        now,
        ttlMs: 1_000
      });
      base.checks.idempotency = idempotency.status === "started";

      const lockRequestId = `${READINESS_PREFIX}-request-${suffix}`;
      const lock = await stores.concurrency.acquire({
        lockKey,
        userId: readinessUserId,
        conversationId: `${READINESS_PREFIX}-conversation-${suffix}`,
        requestId: lockRequestId,
        now,
        ttlMs: 1_000
      });
      base.checks.locks = isSuccessfulReadinessLockResult(lock);
      if (base.checks.locks) await stores.concurrency.release(lockKey, lockRequestId);

      const providerProbe = await stores.providerHealth.beforeProviderCall(providerProfileId, now, config.providerCooldownMs);
      await stores.providerHealth.recordSuccess(providerProfileId, now);
      base.checks.providerHealth = providerProbe.allowed;

      base.checks.toolCache = await verifyToolCache(config.supabaseUrl, config.supabaseServiceRoleKey, suffix, now);

      const ready = Object.values(base.checks).every(Boolean);
      return cache({ ...base, ready, errorCode: ready ? undefined : "coordination_readiness_failed" }, now);
    } finally {
      await deleteReadinessRows(config.supabaseUrl, config.supabaseServiceRoleKey, readinessUserId, usageDate, minuteBucket, providerProfileId);
      await stores.idempotency.cleanup(new Date(now.getTime() + 2_000));
      await stores.concurrency.cleanup(new Date(now.getTime() + 2_000));
    }
  } catch {
    return cache({ ...base, errorCode: "coordination_readiness_failed" }, now);
  }
}

export function resetAICoordinationReadinessCacheForTests() {
  cachedReadiness = undefined;
}

export function isSuccessfulReadinessLockResult(value: unknown): value is AIConcurrencyLockResult {
  if (!value || typeof value !== "object") return false;
  const status = (value as { status?: unknown }).status;
  const lockKey = (value as { lockKey?: unknown }).lockKey;
  return typeof lockKey === "string" && (status === "acquired" || status === "stale_lock_recovered");
}

function cache(value: AICoordinationReadiness, now: Date) {
  cachedReadiness = { value, expiresAt: now.getTime() + READINESS_CACHE_MS };
  return value;
}

async function verifyToolCache(supabaseUrl: string, serviceRoleKey: string, suffix: string, now: Date) {
  const cacheKey = `${READINESS_PREFIX}-cache-${suffix}`;
  const response = await fetch(`${supabaseUrl}/rest/v1/fanatlas_ai_tool_cache`, {
    method: "POST",
    headers: serviceHeaders(serviceRoleKey, { Prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify({
      cache_key: cacheKey,
      tool_id: "weather_lookup",
      result: {
        version: "1",
        toolId: "weather_lookup",
        status: "completed",
        data: { readiness: true },
        citations: [],
        retrievedAt: now.toISOString(),
        freshness: { class: "recent", retrievedAt: now.toISOString() },
        warnings: [],
        sourceQuality: "recognized_weather"
      },
      source_quality: "recognized_weather",
      freshness_class: "recent",
      retrieved_at: now.toISOString(),
      stale_at: new Date(now.getTime() + 1_000).toISOString(),
      expires_at: new Date(now.getTime() + 2_000).toISOString()
    })
  });
  if (!response.ok) return false;
  const read = await fetch(`${supabaseUrl}/rest/v1/fanatlas_ai_tool_cache?cache_key=eq.${encodeURIComponent(cacheKey)}&select=cache_key`, {
    headers: serviceHeaders(serviceRoleKey)
  });
  const rows = read.ok ? await read.json() as unknown[] : [];
  await fetch(`${supabaseUrl}/rest/v1/fanatlas_ai_tool_cache?cache_key=eq.${encodeURIComponent(cacheKey)}`, {
    method: "DELETE",
    headers: serviceHeaders(serviceRoleKey)
  });
  return Array.isArray(rows) && rows.length === 1;
}

function syntheticReadinessUuid(suffix: string) {
  const hex = deterministicHex(`${READINESS_PREFIX}-${suffix}`, 32).split("");
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

function deterministicHex(input: string, length: number) {
  let hash = 2166136261;
  let output = "";
  for (let index = 0; output.length < length; index += 1) {
    const charCode = input.charCodeAt(index % input.length) ^ index;
    hash ^= charCode;
    hash = Math.imul(hash, 16777619);
    if (index % 4 === 3) output += (hash >>> 0).toString(16).padStart(8, "0");
  }
  return output.slice(0, length);
}

async function deleteReadinessRows(supabaseUrl: string, serviceRoleKey: string, userId: string, usageDate: string, minuteBucket: string, providerProfileId: string) {
  await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/fanatlas_ai_usage_daily?user_id=eq.${userId}&usage_date=eq.${usageDate}`, { method: "DELETE", headers: serviceHeaders(serviceRoleKey) }),
    fetch(`${supabaseUrl}/rest/v1/fanatlas_ai_usage_minute?user_id=eq.${userId}&minute_bucket=eq.${encodeURIComponent(minuteBucket)}`, { method: "DELETE", headers: serviceHeaders(serviceRoleKey) }),
    fetch(`${supabaseUrl}/rest/v1/fanatlas_ai_provider_health?provider_profile_id=eq.${encodeURIComponent(providerProfileId)}`, { method: "DELETE", headers: serviceHeaders(serviceRoleKey) })
  ]);
}

function serviceHeaders(serviceRoleKey: string, extra?: Record<string, string>) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extra
  };
}
