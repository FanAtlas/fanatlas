#!/usr/bin/env node
/* global console, fetch, process, URL */
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const PROD_REF = "wipskgheygefoywebsmx";
const VALIDATION_PREFIX = "fanatlas-validation";

const mode = process.argv[2] || "all";
const stressIterations = Number(process.argv[3] || 5);
const now = new Date();
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const state = {
  createdAuthUserId: undefined,
  syntheticUserIds: new Set(),
  providerIds: new Set(),
  cacheKeys: new Set(),
  lockKeys: new Set(),
  stressSummary: undefined
};

async function main() {
  loadEnvLocal();
  const config = readConfig();
  validateNonproduction(config);
  const result = {
    readiness: false,
    contracts: false,
    concurrency: false,
    rls: false,
    cleanup: false,
    toolCache: false,
    outage: false,
    idempotencyStress: false
  };

  try {
    if (mode === "idempotency-definition") {
      await checkInstalledIdempotencyDefinition(config);
      return;
    }
    await cleanupValidationNamespace(config, "startup.namespace_cleanup");
    if (mode === "check" || mode === "all") result.readiness = await readiness(config);
    if (mode === "contracts" || mode === "all") result.contracts = await contracts(config);
    if (mode === "concurrency" || mode === "all") result.concurrency = await concurrency(config);
    if (mode === "rls" || mode === "all") result.rls = await rls(config);
    if (mode === "cleanup" || mode === "all") result.cleanup = await cleanup(config);
    if (mode === "tool-cache" || mode === "all") result.toolCache = await toolCache(config);
    if (mode === "outage" || mode === "all") result.outage = await outage();
    if (mode === "idempotency-stress") result.idempotencyStress = await idempotencyStress(config, stressIterations);

    const ran = Object.entries(result).filter(([key]) => (mode === "all" && key !== "idempotencyStress") || key === mode || (mode === "check" && key === "readiness") || (mode === "idempotency-stress" && key === "idempotencyStress"));
    const failed = ran.filter(([, passed]) => !passed);
    console.log(JSON.stringify({
      status: failed.length ? "failed" : "passed",
      mode,
      checks: result,
      ...(state.stressSummary ? { stress: state.stressSummary } : {})
    }, null, 2));
    if (failed.length) process.exitCode = 1;
  } finally {
    await cleanupSyntheticAuthUser(config);
    await cleanupTrackedSyntheticRows(config).catch(() => undefined);
    await cleanupValidationNamespace(config, "cleanup.namespace_cleanup").catch(() => undefined);
  }
}

function loadEnvLocal() {
  for (const path of [".env.local", ".env"]) {
    if (!existsSync(path)) continue;
    const contents = readFileSync(path, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = parseEnvValue(rawValue);
    }
  }
}

function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function readConfig() {
  return {
    supabaseUrl: requiredAnyEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]),
    serviceRoleKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    anonKey: requiredAnyEnv(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]),
    databaseUrl: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL,
    nonproduction: process.env.FANATLAS_E2E_NONPRODUCTION === "true",
    productionRef: process.env.FANATLAS_PRODUCTION_SUPABASE_REF || PROD_REF
  };
}

function requiredAnyEnv(names) {
  const found = names.find((name) => process.env[name]);
  if (!found) throw new Error(`${names.join(" or ")} is required.`);
  return process.env[found];
}

function validateNonproduction(config) {
  const url = new URL(config.supabaseUrl);
  if (!config.nonproduction) throw new Error("FANATLAS_E2E_NONPRODUCTION must be true.");
  if (url.hostname.includes(config.productionRef) || url.hostname.includes(PROD_REF)) throw new Error("Refusing to use the known production Supabase project.");
  if (!/^https?:$/.test(url.protocol)) throw new Error("SUPABASE_URL must be HTTP or HTTPS.");
  if (config.databaseUrl) validateDatabaseUrl(config.databaseUrl, config.productionRef);
}

function validateDatabaseUrl(value, productionRef) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Configured Postgres URL is invalid.");
  }
  if (url.hostname.includes(productionRef) || url.hostname.includes(PROD_REF)) throw new Error("Refusing to inspect the known production Supabase database.");
}

async function readiness(config) {
  const userId = syntheticUuid("readiness");
  const usageDate = isoDate(now);
  const minuteBucket = minuteIso(now);
  const lockKey = validationKey("readiness-lock");
  const requestId = validationKey("readiness-request");
  const providerId = validationKey("readiness-provider");
  const cacheKey = validationKey("readiness-cache");
  trackUser(userId);
  trackLock(lockKey);
  trackProvider(providerId);
  trackCache(cacheKey);

  await runPhase("readiness.cleanup", () => rpc(config, "fanatlas_ai_cleanup_coordination", { p_now: now.toISOString() }, "readiness.cleanup"));
  const quota = await runPhase("readiness.quota", () => rpc(config, "fanatlas_ai_reserve_quota", quotaBody(userId, requestId, usageDate, minuteBucket, 20, 20), "readiness.quota"));
  assert(quota.allowed === true, "quota RPC failed readiness", "readiness.quota", "quota_readiness_failed");
  const idem = await runPhase("readiness.idempotency", () => rpc(config, "fanatlas_ai_start_idempotency", idempotencyBody(userId, validationKey("readiness-client"), validationKey("readiness-fingerprint")), "readiness.idempotency"));
  assert(idem.status === "started", "idempotency readiness failed", "readiness.idempotency", "idempotency_readiness_failed");
  const lock = await runPhase("readiness.lock_acquire", () => rpc(config, "fanatlas_ai_acquire_lock", lockBody(lockKey, userId, requestId), "readiness.lock_acquire"));
  assert(isSuccessfulReadinessLockResult(lock), `lock readiness failed: expected acquired or stale_lock_recovered, received ${safeScalar(lock?.status)}`, "readiness.lock_acquire", "lock_readiness_failed");
  await runPhase("readiness.lock_release", () => rpc(config, "fanatlas_ai_release_lock", { p_lock_key: lockKey, p_request_id: requestId }, "readiness.lock_release"));
  const probe = await runPhase("readiness.provider_health", () => rpc(config, "fanatlas_ai_before_provider_call", { p_provider_profile_id: providerId, p_now: now.toISOString(), p_cooldown_ms: 60000 }, "readiness.provider_health"));
  assert(probe.allowed === true, "provider health readiness failed", "readiness.provider_health", "provider_health_readiness_failed");
  await runPhase("readiness.provider_success", () => rpc(config, "fanatlas_ai_record_provider_success", { p_provider_profile_id: providerId, p_now: now.toISOString() }, "readiness.provider_success"));
  await runPhase("readiness.tool_cache_write", () => writeToolCache(config, cacheKey, now, 60_000, 30_000));
  const cacheRows = await runPhase("readiness.tool_cache_read", () => rest(config, "GET", `/fanatlas_ai_tool_cache?cache_key=eq.${encodeURIComponent(cacheKey)}&select=cache_key`));
  assert(Array.isArray(cacheRows) && cacheRows.length === 1, "tool cache readiness failed", "readiness.tool_cache_read", "tool_cache_readiness_failed");
  await runPhase("readiness.delete_synthetic_rows", () => deleteRows(config, cacheKey, userId, usageDate, minuteBucket, providerId));
  return true;
}

async function contracts(config) {
  const usageDate = isoDate(now);
  const minuteBucket = minuteIso(now);
  const userId = syntheticUuid("contracts");
  const clientId = validationKey("contracts-client");
  const fp = validationKey("contracts-fingerprint");
  trackUser(userId);

  const first = await rpc(config, "fanatlas_ai_reserve_quota", quotaBody(userId, validationKey("contracts-quota-1"), usageDate, minuteBucket, 1, 2), "contracts.quota_first");
  const second = await rpc(config, "fanatlas_ai_reserve_quota", quotaBody(userId, validationKey("contracts-quota-2"), usageDate, minuteBucket, 1, 2), "contracts.quota_second");
  assert(first.allowed === true && second.allowed === false && second.limitCategory === "minute", "minute quota contract mismatch");

  const dayBucket = new Date(now.getTime() + 120000).toISOString();
  const dailyUser = syntheticUuid("contracts-daily");
  trackUser(dailyUser);
  const dailyFirst = await rpc(config, "fanatlas_ai_reserve_quota", quotaBody(dailyUser, validationKey("contracts-daily-1"), usageDate, dayBucket, 10, 1), "contracts.daily_first");
  const dailySecond = await rpc(config, "fanatlas_ai_reserve_quota", quotaBody(dailyUser, validationKey("contracts-daily-2"), usageDate, new Date(now.getTime() + 180000).toISOString(), 10, 1), "contracts.daily_second");
  assert(dailyFirst.allowed === true && dailySecond.allowed === false && dailySecond.limitCategory === "daily", "daily quota contract mismatch");

  const start = await rpc(config, "fanatlas_ai_start_idempotency", idempotencyBody(userId, clientId, fp));
  const processing = await rpc(config, "fanatlas_ai_start_idempotency", idempotencyBody(userId, clientId, fp));
  const conflict = await rpc(config, "fanatlas_ai_start_idempotency", idempotencyBody(userId, clientId, `${fp}-different`));
  assert(start.status === "started" && processing.status === "processing" && conflict.status === "conflict", "idempotency contract mismatch");
  await rpc(config, "fanatlas_ai_complete_idempotency", completeBody(userId, clientId, fp));
  const replay = await rpc(config, "fanatlas_ai_start_idempotency", idempotencyBody(userId, clientId, fp));
  assert(replay.status === "replay" && replay.response?.status === "completed", "idempotency replay mismatch");

  const lockKey = validationKey("contracts-lock");
  trackLock(lockKey);
  const lock1 = await rpc(config, "fanatlas_ai_acquire_lock", lockBody(lockKey, userId, validationKey("contracts-lock-1")));
  const lock2 = await rpc(config, "fanatlas_ai_acquire_lock", lockBody(lockKey, userId, validationKey("contracts-lock-2")));
  await rpc(config, "fanatlas_ai_release_lock", { p_lock_key: lockKey, p_request_id: validationKey("wrong-owner") }, "contracts.lock_foreign_release");
  const lock3 = await rpc(config, "fanatlas_ai_acquire_lock", lockBody(lockKey, userId, validationKey("contracts-lock-3")));
  await rpc(config, "fanatlas_ai_release_lock", { p_lock_key: lockKey, p_request_id: validationKey("contracts-lock-1") });
  const lock4 = await rpc(config, "fanatlas_ai_acquire_lock", lockBody(lockKey, userId, validationKey("contracts-lock-4")));
  assert(lock1.status === "acquired" && lock2.status === "already_locked" && lock3.status === "already_locked" && lock4.status === "acquired", lockOwnershipMessage({
    fresh: lock1,
    duplicate: lock2,
    afterForeignRelease: lock3,
    afterOwnerRelease: lock4
  }), "contracts.lock_ownership", "lock_ownership_contract_mismatch");

  const staleKey = validationKey("contracts-stale-lock");
  trackLock(staleKey);
  const staleInitial = await rpc(config, "fanatlas_ai_acquire_lock", lockBody(staleKey, userId, validationKey("contracts-stale-old"), now, 1000));
  const recovered = await rpc(config, "fanatlas_ai_acquire_lock", lockBody(staleKey, userId, validationKey("contracts-stale-new"), new Date(now.getTime() + 2000), 60000));
  await rpc(config, "fanatlas_ai_release_lock", { p_lock_key: staleKey, p_request_id: validationKey("contracts-stale-old") });
  const afterOldRelease = await rpc(config, "fanatlas_ai_acquire_lock", lockBody(staleKey, userId, validationKey("contracts-stale-after-old-release"), new Date(now.getTime() + 2000), 60000));
  await rpc(config, "fanatlas_ai_release_lock", { p_lock_key: staleKey, p_request_id: validationKey("contracts-stale-new") });
  const afterNewRelease = await rpc(config, "fanatlas_ai_acquire_lock", lockBody(staleKey, userId, validationKey("contracts-stale-after-new-release"), new Date(now.getTime() + 2000), 60000));
  assert(staleInitial.status === "acquired" && recovered.status === "stale_lock_recovered" && afterOldRelease.status === "already_locked" && afterNewRelease.status === "acquired", lockOwnershipMessage({
    staleInitial,
    recovered,
    afterOldRelease,
    afterNewRelease
  }), "contracts.lock_stale_ownership", "lock_stale_ownership_contract_mismatch");

  const provider = validationKey("contracts-provider");
  trackProvider(provider);
  await rpc(config, "fanatlas_ai_record_provider_failure", failureBody(provider, now));
  await rpc(config, "fanatlas_ai_record_provider_failure", failureBody(provider, new Date(now.getTime() + 1000)));
  const open = await rpc(config, "fanatlas_ai_before_provider_call", { p_provider_profile_id: provider, p_now: new Date(now.getTime() + 2000).toISOString(), p_cooldown_ms: 60000 });
  assert(open.allowed === false && open.state === "open", "circuit open contract mismatch");

  await deleteRows(config, undefined, userId, usageDate, minuteBucket, provider);
  await deleteRows(config, undefined, dailyUser, usageDate, dayBucket);
  return true;
}

async function concurrency(config) {
  const usageDate = isoDate(now);
  const finalUser = syntheticUuid("parallel-quota");
  trackUser(finalUser);
  const quotaCalls = await Promise.all([
    rpc(config, "fanatlas_ai_reserve_quota", quotaBody(finalUser, validationKey("parallel-quota-a"), usageDate, minuteIso(now), 10, 1), "concurrency.quota_a"),
    rpc(config, "fanatlas_ai_reserve_quota", quotaBody(finalUser, validationKey("parallel-quota-b"), usageDate, minuteIso(new Date(now.getTime() + 1000)), 10, 1), "concurrency.quota_b")
  ]);
  assert(quotaCalls.filter((item) => item.allowed).length === 1, "parallel final quota slot was not atomic");

  const lockUser = syntheticUuid("parallel-lock");
  trackUser(lockUser);
  const lockKey = validationKey("parallel-lock");
  trackLock(lockKey);
  const locks = await Promise.all(Array.from({ length: 10 }, (_, index) => rpc(config, "fanatlas_ai_acquire_lock", lockBody(lockKey, lockUser, validationKey(`parallel-lock-${index}`)), "concurrency.lock_acquire")));
  const lockCounts = lockStatusCounts(locks);
  assert(lockCounts.acquiredCount === 1 && lockCounts.alreadyLockedCount === 9 && lockCounts.staleRecoveredCount === 0, `parallel lock acquisition was not atomic: ${formatLockCounts(lockCounts)}`);

  const staleLockUser = syntheticUuid("parallel-stale-lock");
  trackUser(staleLockUser);
  const staleLockKey = validationKey("parallel-stale-lock");
  trackLock(staleLockKey);
  await rpc(config, "fanatlas_ai_acquire_lock", lockBody(staleLockKey, staleLockUser, validationKey("parallel-stale-old"), now, 1000), "concurrency.stale_lock_seed");
  const staleLocks = await Promise.all(Array.from({ length: 10 }, (_, index) => rpc(config, "fanatlas_ai_acquire_lock", lockBody(
    staleLockKey,
    staleLockUser,
    validationKey(`parallel-stale-new-${index}`),
    new Date(now.getTime() + 2000),
    60000
  ), "concurrency.stale_lock_acquire")));
  const staleLockCounts = lockStatusCounts(staleLocks);
  assert(staleLockCounts.acquiredCount === 0 && staleLockCounts.staleRecoveredCount === 1 && staleLockCounts.alreadyLockedCount === 9, `parallel stale lock recovery was not atomic: ${formatLockCounts(staleLockCounts)}`);

  const independentLocks = await Promise.all(Array.from({ length: 5 }, (_, index) => rpc(config, "fanatlas_ai_acquire_lock", lockBody(
    trackLock(validationKey(`parallel-independent-lock-${index}`)),
    trackUser(syntheticUuid(`parallel-independent-${index}`)),
    validationKey(`parallel-independent-${index}`)
  ), "concurrency.independent_lock")));
  const independentCounts = lockStatusCounts(independentLocks);
  assert(independentCounts.acquiredCount === 5 && independentCounts.alreadyLockedCount === 0 && independentCounts.staleRecoveredCount === 0, `independent lock keys blocked unexpectedly: ${formatLockCounts(independentCounts)}`);

  const clientId = validationKey("parallel-client");
  const idempotencyUser = syntheticUuid("parallel-idempotency");
  trackUser(idempotencyUser);
  const idempotency = await Promise.all(Array.from({ length: 4 }, () => rpc(config, "fanatlas_ai_start_idempotency", idempotencyBody(idempotencyUser, clientId, validationKey("parallel-fingerprint")), "concurrency.idempotency_start")));
  assert(idempotency.filter((item) => item.status === "started").length === 1, "parallel idempotency creation was not atomic");

  const provider = validationKey("parallel-provider");
  trackProvider(provider);
  await rpc(config, "fanatlas_ai_record_provider_failure", failureBody(provider, now));
  await rpc(config, "fanatlas_ai_record_provider_failure", failureBody(provider, new Date(now.getTime() + 1000)));
  const probes = await Promise.all(Array.from({ length: 10 }, () => rpc(config, "fanatlas_ai_before_provider_call", {
    p_provider_profile_id: provider,
    p_now: new Date(now.getTime() + 61000).toISOString(),
    p_cooldown_ms: 60000
  })));
  const probeCounts = providerProbeCounts(probes);
  assert(
    probeCounts.probeGrantedCount === 1 && probeCounts.blockedCount === 9 && probeCounts.unknownCount === 0,
    `parallel half-open lease was not atomic: ${formatProviderProbeCounts(probeCounts)}`
  );

  const activeProbe = await rpc(config, "fanatlas_ai_before_provider_call", {
    p_provider_profile_id: provider,
    p_now: new Date(now.getTime() + 62000).toISOString(),
    p_cooldown_ms: 60000
  });
  const activeCounts = providerProbeCounts([activeProbe]);
  assert(
    activeCounts.probeGrantedCount === 0 && activeCounts.blockedCount === 1 && activeCounts.unknownCount === 0,
    `active half-open lease did not block another probe: ${formatProviderProbeCounts(activeCounts)}`
  );

  const staleProbes = await Promise.all(Array.from({ length: 10 }, () => rpc(config, "fanatlas_ai_before_provider_call", {
    p_provider_profile_id: provider,
    p_now: new Date(now.getTime() + 92000).toISOString(),
    p_cooldown_ms: 60000
  })));
  const staleProbeCounts = providerProbeCounts(staleProbes, { recoveredLeases: true });
  assert(
    staleProbeCounts.recoveredLeaseCount === 1 && staleProbeCounts.blockedCount === 9 && staleProbeCounts.unknownCount === 0,
    `stale half-open lease recovery was not atomic: ${formatProviderProbeCounts(staleProbeCounts)}`
  );

  await rpc(config, "fanatlas_ai_record_provider_success", { p_provider_profile_id: provider, p_now: new Date(now.getTime() + 93000).toISOString() });
  const closedProbe = await rpc(config, "fanatlas_ai_before_provider_call", {
    p_provider_profile_id: provider,
    p_now: new Date(now.getTime() + 94000).toISOString(),
    p_cooldown_ms: 60000
  });
  assert(closedProbe.allowed === true && closedProbe.state === "closed", "successful half-open probe did not close circuit");

  const failedProvider = validationKey("parallel-provider-failed");
  trackProvider(failedProvider);
  await rpc(config, "fanatlas_ai_record_provider_failure", failureBody(failedProvider, now));
  await rpc(config, "fanatlas_ai_record_provider_failure", failureBody(failedProvider, new Date(now.getTime() + 1000)));
  await rpc(config, "fanatlas_ai_before_provider_call", {
    p_provider_profile_id: failedProvider,
    p_now: new Date(now.getTime() + 61000).toISOString(),
    p_cooldown_ms: 60000
  });
  await rpc(config, "fanatlas_ai_record_provider_failure", failureBody(failedProvider, new Date(now.getTime() + 62000)));
  const reopenedProbe = await rpc(config, "fanatlas_ai_before_provider_call", {
    p_provider_profile_id: failedProvider,
    p_now: new Date(now.getTime() + 63000).toISOString(),
    p_cooldown_ms: 60000
  });
  assert(reopenedProbe.allowed === false && reopenedProbe.state === "open", "failed half-open probe did not reopen circuit");

  const independentProviderA = validationKey("parallel-provider-independent-a");
  const independentProviderB = validationKey("parallel-provider-independent-b");
  trackProvider(independentProviderA);
  trackProvider(independentProviderB);
  await Promise.all([independentProviderA, independentProviderB].flatMap((providerId) => [
    rpc(config, "fanatlas_ai_record_provider_failure", failureBody(providerId, now)),
    rpc(config, "fanatlas_ai_record_provider_failure", failureBody(providerId, new Date(now.getTime() + 1000)))
  ]));
  const independentProbes = await Promise.all([independentProviderA, independentProviderB].map((providerId) => rpc(config, "fanatlas_ai_before_provider_call", {
    p_provider_profile_id: providerId,
    p_now: new Date(now.getTime() + 61000).toISOString(),
    p_cooldown_ms: 60000
  })));
  const independentProbeCounts = providerProbeCounts(independentProbes);
  assert(
    independentProbeCounts.probeGrantedCount === 2 && independentProbeCounts.blockedCount === 0 && independentProbeCounts.unknownCount === 0,
    `unrelated provider IDs blocked each other: ${formatProviderProbeCounts(independentProbeCounts)}`
  );

  await deleteRows(config, undefined, finalUser, usageDate, minuteIso(now), provider);
  await deleteRows(config, undefined, undefined, undefined, undefined, failedProvider);
  await deleteRows(config, undefined, undefined, undefined, undefined, independentProviderA);
  await deleteRows(config, undefined, undefined, undefined, undefined, independentProviderB);
  await Promise.all(Array.from({ length: 10 }, (_, index) => rpc(config, "fanatlas_ai_release_lock", {
    p_lock_key: lockKey,
    p_request_id: validationKey(`parallel-lock-${index}`)
  }).catch(() => undefined)));
  await Promise.all(Array.from({ length: 10 }, (_, index) => rpc(config, "fanatlas_ai_release_lock", {
    p_lock_key: staleLockKey,
    p_request_id: validationKey(`parallel-stale-new-${index}`)
  }).catch(() => undefined)));
  await Promise.all(Array.from({ length: 5 }, (_, index) => rpc(config, "fanatlas_ai_release_lock", {
    p_lock_key: validationKey(`parallel-independent-lock-${index}`),
    p_request_id: validationKey(`parallel-independent-${index}`)
  }).catch(() => undefined)));
  return true;
}

async function idempotencyStress(config, iterations) {
  const safeIterations = Number.isFinite(iterations) && iterations > 0 ? Math.min(Math.floor(iterations), 25) : 5;
  const outcomes = [];
  for (let iteration = 0; iteration < safeIterations; iteration += 1) {
    const userId = syntheticUuid(`idempotency-stress-${iteration}`);
    const clientId = validationKey(`idempotency-stress-client-${iteration}`);
    const fingerprint = validationKey(`idempotency-stress-fingerprint-${iteration}`);
    trackUser(userId);
    const calls = await Promise.all(Array.from({ length: 10 }, () => rpc(
      config,
      "fanatlas_ai_start_idempotency",
      idempotencyBody(userId, clientId, fingerprint),
      "idempotency_stress.start"
    )));
    const startedCount = calls.filter((item) => item.status === "started").length;
    const processingCount = calls.filter((item) => item.status === "processing").length;
    const unknownCount = calls.filter((item) => !["started", "processing"].includes(item.status)).length;
    outcomes.push({ startedCount, processingCount, unknownCount });
    assert(
      startedCount === 1 && processingCount === 9 && unknownCount === 0,
      `parallel idempotency stress was not atomic: startedCount=${startedCount}, processingCount=${processingCount}, unknownCount=${unknownCount}`,
      "idempotency_stress",
      "idempotency_stress_failed"
    );
  }
  state.stressSummary = {
    iterations: safeIterations,
    startedCountPerRun: outcomes.map((item) => item.startedCount),
    processingCountPerRun: outcomes.map((item) => item.processingCount),
    unknownCountPerRun: outcomes.map((item) => item.unknownCount)
  };
  return true;
}

async function rls(config) {
  const authToken = await createSyntheticAuthSession(config);
  const tablePath = "/fanatlas_ai_usage_daily?select=user_id&limit=1";
  await expectDenied(fetch(`${config.supabaseUrl}/rest/v1${tablePath}`, { headers: keyHeaders(config.anonKey) }), "anon table read allowed");
  await expectDenied(fetch(`${config.supabaseUrl}/rest/v1${tablePath}`, { headers: keyHeaders(config.anonKey, authToken) }), "authenticated table read allowed");
  await expectDenied(fetch(`${config.supabaseUrl}/rest/v1/fanatlas_ai_tool_cache?select=cache_key&limit=1`, { headers: keyHeaders(config.anonKey, authToken) }), "authenticated tool-cache read allowed");
  await expectDenied(fetch(`${config.supabaseUrl}/rest/v1/rpc/fanatlas_ai_cleanup_coordination`, {
    method: "POST",
    headers: keyHeaders(config.anonKey, authToken),
    body: JSON.stringify({ p_now: now.toISOString() })
  }), "authenticated privileged RPC allowed");
  await rpc(config, "fanatlas_ai_cleanup_coordination", { p_now: now.toISOString() });
  return true;
}

async function cleanup(config) {
  const expired = new Date(now.getTime() - 120000);
  const userId = syntheticUuid("cleanup");
  trackUser(userId);
  const expiredLockKey = trackLock(validationKey("expired-lock"));
  const expiredCacheKey = trackCache(validationKey("expired-cache"));
  const activeCacheKey = trackCache(validationKey("active-cache"));
  await rest(config, "POST", "/fanatlas_ai_usage_minute", {
    user_id: userId,
    minute_bucket: expired.toISOString(),
    request_count: 1,
    expires_at: expired.toISOString()
  });
  await rest(config, "POST", "/fanatlas_ai_concurrency_locks", {
    lock_key: expiredLockKey,
    user_id: userId,
    conversation_id: validationKey("cleanup-conversation"),
    request_id: validationKey("cleanup-request"),
    acquired_at: expired.toISOString(),
    expires_at: expired.toISOString()
  });
  await writeToolCache(config, expiredCacheKey, expired, -1000, -2000);
  await writeToolCache(config, activeCacheKey, now, 120000, 60000);
  await rpc(config, "fanatlas_ai_cleanup_coordination", { p_now: now.toISOString() });
  const expiredCache = await rest(config, "GET", `/fanatlas_ai_tool_cache?cache_key=eq.${encodeURIComponent(expiredCacheKey)}&select=cache_key`);
  const activeCache = await rest(config, "GET", `/fanatlas_ai_tool_cache?cache_key=eq.${encodeURIComponent(activeCacheKey)}&select=cache_key`);
  assert(expiredCache.length === 0 && activeCache.length === 1, "cleanup did not preserve active and remove expired cache rows");
  await deleteRows(config, activeCacheKey, userId, isoDate(now), expired.toISOString());
  return true;
}

async function toolCache(config) {
  const key = trackCache(validationKey("tool-cache"));
  const miss = await rest(config, "GET", `/fanatlas_ai_tool_cache?cache_key=eq.${encodeURIComponent(key)}&select=cache_key`);
  assert(miss.length === 0, "tool cache miss failed");
  await Promise.all([writeToolCache(config, key, now, 60000, 30000), writeToolCache(config, key, now, 60000, 30000)]);
  const rows = await rest(config, "GET", `/fanatlas_ai_tool_cache?cache_key=eq.${encodeURIComponent(key)}&select=cache_key,result,freshness_class,source_quality,retrieved_at,stale_at,expires_at`);
  assert(rows.length === 1, "tool cache concurrent identical write failed");
  const serialized = JSON.stringify(rows[0]);
  assert(!/journal|trip title|raw prompt|access_token|service_role/i.test(serialized), "tool cache contains private marker");
  await deleteRows(config, key);
  return true;
}

async function outage() {
  const failed = await fetch("http://127.0.0.1:1/rest/v1/rpc/fanatlas_ai_cleanup_coordination", {
    method: "POST",
    headers: { apikey: "invalid", Authorization: "Bearer invalid", "Content-Type": "application/json" },
    body: JSON.stringify({ p_now: now.toISOString() })
  }).then(() => false, () => true);
  assert(failed, "controlled outage did not fail closed");
  return true;
}

async function checkInstalledIdempotencyDefinition(config) {
  if (!config.databaseUrl) {
    console.log(JSON.stringify({
      status: "unknown",
      mode: "idempotency-definition",
      reason: "database_connection_missing"
    }, null, 2));
    return;
  }
  const query = `
    with matching as (
      select pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'fanatlas_ai_start_idempotency'
        and pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid, p_client_request_id text, p_request_fingerprint text, p_now timestamp with time zone, p_ttl_ms integer'
    ),
    all_named as (
      select count(*)::int as overload_count
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'fanatlas_ai_start_idempotency'
    )
    select case
      when (select count(*) from matching) <> 1 then 'unknown'
      when exists (
        select 1
        from matching
        where definition like '%pg_advisory_xact_lock(hashtextextended(''fanatlas_ai_idempotency:'' || p_user_id::text || '':'' || p_client_request_id, 0))%'
          and definition like '%where user_id = p_user_id and client_request_id = p_client_request_id%'
      ) then 'repaired'
      else 'outdated'
    end || '|' || (select overload_count from all_named) as status;
  `;
  const result = spawnSync("psql", [
    config.databaseUrl,
    "--no-psqlrc",
    "--set=ON_ERROR_STOP=1",
    "--tuples-only",
    "--no-align",
    "--quiet",
    "--command",
    query
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.error?.code === "ENOENT") {
    console.log(JSON.stringify({
      status: "unknown",
      mode: "idempotency-definition",
      reason: "psql_unavailable"
    }, null, 2));
    return;
  }
  if (result.status !== 0) {
    throw new SafeValidationError("idempotency_definition", "definition_check_failed", sanitizePsqlError(result.stderr));
  }
  const [installedStatus, overloadCount] = String(result.stdout || "").trim().split("|");
  console.log(JSON.stringify({
    status: ["repaired", "outdated", "unknown"].includes(installedStatus) ? installedStatus : "unknown",
    mode: "idempotency-definition",
    overloadCount: Number(overloadCount || 0)
  }, null, 2));
}

async function writeToolCache(config, cacheKey, baseTime, ttlMs, staleMs) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/fanatlas_ai_tool_cache`, {
    method: "POST",
    headers: serviceHeaders(config, { Prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify({
      cache_key: cacheKey,
      tool_id: "weather_lookup",
      result: {
        version: "1",
        toolId: "weather_lookup",
        status: "completed",
        data: { destination: "Synthetic City" },
        citations: [],
        retrievedAt: baseTime.toISOString(),
        freshness: { class: "recent", retrievedAt: baseTime.toISOString() },
        warnings: [],
        sourceQuality: "recognized_weather"
      },
      source_quality: "recognized_weather",
      freshness_class: "recent",
      retrieved_at: baseTime.toISOString(),
      stale_at: new Date(baseTime.getTime() + staleMs).toISOString(),
      expires_at: new Date(baseTime.getTime() + ttlMs).toISOString()
    })
  });
  if (!response.ok) throw new Error(`tool cache write failed with HTTP ${response.status}`);
}

async function createSyntheticAuthSession(config) {
  const email = `${validationKey("auth")}@example.test`;
  const password = `FanAtlas-${suffix}-test`;
  const created = await fetch(`${config.supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: serviceHeaders(config),
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { synthetic: true } })
  });
  if (!created.ok) throw new Error(`synthetic auth user creation failed with HTTP ${created.status}`);
  const createdBody = await created.json();
  state.createdAuthUserId = createdBody.id;
  const token = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: keyHeaders(config.anonKey),
    body: JSON.stringify({ email, password })
  });
  if (!token.ok) throw new Error(`synthetic auth session failed with HTTP ${token.status}`);
  const body = await token.json();
  if (!body.access_token) throw new Error("synthetic auth session missing access token");
  return body.access_token;
}

async function cleanupSyntheticAuthUser(config) {
  if (!state.createdAuthUserId) return;
  await fetch(`${config.supabaseUrl}/auth/v1/admin/users/${state.createdAuthUserId}`, {
    method: "DELETE",
    headers: serviceHeaders(config)
  }).catch(() => undefined);
}

async function rpc(config, name, body, operation = name) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: serviceHeaders(config),
    body: JSON.stringify(body)
  });
  if (!response.ok) throw await httpError(response, "rpc_failed", `${name} failed`, {
    rpcName: name,
    operation
  });
  return await parseJsonResponse(response);
}

async function rest(config, method, path, body, operation = `${method.toLowerCase()}_rest`) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1${path}`, {
    method,
    headers: serviceHeaders(config, { Prefer: method === "POST" ? "resolution=merge-duplicates,return=minimal" : "" }),
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) throw await httpError(response, "rest_failed", `${method} request failed`, {
    rpcName: undefined,
    operation
  });
  return await parseJsonResponse(response);
}

async function expectDenied(promise, message) {
  const response = await promise;
  if (![401, 403, 404, 405].includes(response.status)) throw new Error(`${message}: HTTP ${response.status}`);
}

async function deleteRows(config, cacheKey, userId, usageDate, minuteBucket, providerId) {
  const calls = [];
  if (cacheKey) calls.push(fetch(`${config.supabaseUrl}/rest/v1/fanatlas_ai_tool_cache?cache_key=eq.${encodeURIComponent(cacheKey)}`, { method: "DELETE", headers: serviceHeaders(config) }));
  if (userId && usageDate) calls.push(fetch(`${config.supabaseUrl}/rest/v1/fanatlas_ai_usage_daily?user_id=eq.${userId}&usage_date=eq.${usageDate}`, { method: "DELETE", headers: serviceHeaders(config) }));
  if (userId && minuteBucket) calls.push(fetch(`${config.supabaseUrl}/rest/v1/fanatlas_ai_usage_minute?user_id=eq.${userId}&minute_bucket=eq.${encodeURIComponent(minuteBucket)}`, { method: "DELETE", headers: serviceHeaders(config) }));
  if (providerId) calls.push(fetch(`${config.supabaseUrl}/rest/v1/fanatlas_ai_provider_health?provider_profile_id=eq.${encodeURIComponent(providerId)}`, { method: "DELETE", headers: serviceHeaders(config) }));
  await Promise.all(calls);
}

async function cleanupTrackedSyntheticRows(config) {
  const calls = [];
  for (const cacheKey of state.cacheKeys) calls.push(fetch(`${config.supabaseUrl}/rest/v1/fanatlas_ai_tool_cache?cache_key=eq.${encodeURIComponent(cacheKey)}`, { method: "DELETE", headers: serviceHeaders(config) }));
  for (const lockKey of state.lockKeys) calls.push(fetch(`${config.supabaseUrl}/rest/v1/fanatlas_ai_concurrency_locks?lock_key=eq.${encodeURIComponent(lockKey)}`, { method: "DELETE", headers: serviceHeaders(config) }));
  for (const providerId of state.providerIds) calls.push(fetch(`${config.supabaseUrl}/rest/v1/fanatlas_ai_provider_health?provider_profile_id=eq.${encodeURIComponent(providerId)}`, { method: "DELETE", headers: serviceHeaders(config) }));
  for (const userId of state.syntheticUserIds) {
    calls.push(fetch(`${config.supabaseUrl}/rest/v1/fanatlas_ai_usage_daily?user_id=eq.${userId}`, { method: "DELETE", headers: serviceHeaders(config) }));
    calls.push(fetch(`${config.supabaseUrl}/rest/v1/fanatlas_ai_usage_minute?user_id=eq.${userId}`, { method: "DELETE", headers: serviceHeaders(config) }));
    calls.push(fetch(`${config.supabaseUrl}/rest/v1/fanatlas_ai_idempotency?user_id=eq.${userId}`, { method: "DELETE", headers: serviceHeaders(config) }));
  }
  await Promise.all(calls);
}

async function cleanupValidationNamespace(config, operation) {
  const escapedPrefix = encodeURIComponent(`${VALIDATION_PREFIX}-*`);
  try {
    const responses = await Promise.all([
      fetch(`${config.supabaseUrl}/rest/v1/fanatlas_ai_tool_cache?cache_key=like.${escapedPrefix}`, { method: "DELETE", headers: serviceHeaders(config) }),
      fetch(`${config.supabaseUrl}/rest/v1/fanatlas_ai_concurrency_locks?lock_key=like.${escapedPrefix}`, { method: "DELETE", headers: serviceHeaders(config) }),
      fetch(`${config.supabaseUrl}/rest/v1/fanatlas_ai_provider_health?provider_profile_id=like.${escapedPrefix}`, { method: "DELETE", headers: serviceHeaders(config) })
    ]);
    if (responses.some((response) => !response.ok)) throw new Error("validation namespace cleanup failed");
  } catch (error) {
    throw new SafeValidationError(operation, "namespace_cleanup_failed", safeError(error));
  }
}

function quotaBody(userId, requestId, usageDate, minuteBucket, minuteLimit, dailyLimit) {
  return {
    p_user_id: userId,
    p_request_id: requestId,
    p_usage_date: usageDate,
    p_minute_bucket: minuteBucket,
    p_max_requests_per_minute: minuteLimit,
    p_max_requests_per_day: dailyLimit,
    p_now: now.toISOString()
  };
}

function idempotencyBody(userId, clientRequestId, fingerprint) {
  return {
    p_user_id: userId,
    p_client_request_id: clientRequestId,
    p_request_fingerprint: fingerprint,
    p_now: now.toISOString(),
    p_ttl_ms: 60000
  };
}

function completeBody(userId, clientRequestId, fingerprint) {
  return {
    p_user_id: userId,
    p_client_request_id: clientRequestId,
    p_request_fingerprint: fingerprint,
    p_status: "completed",
    p_response_snapshot: {
      version: "1",
      requestId: validationKey("safe-response"),
      conversationId: validationKey("conversation"),
      status: "completed",
      citations: [],
      toolActivity: [],
      warnings: [],
      usage: { contextSizeClass: "tiny", toolCallCount: 0, modelCallCount: 0, responseLengthClass: "short" }
    },
    p_now: now.toISOString(),
    p_ttl_ms: 60000
  };
}

function lockBody(lockKey, userId, requestId, at = now, ttlMs = 60000) {
  return {
    p_lock_key: lockKey,
    p_user_id: userId,
    p_conversation_id: validationKey("conversation"),
    p_request_id: requestId,
    p_now: at.toISOString(),
    p_ttl_ms: ttlMs
  };
}

function failureBody(provider, time) {
  return {
    p_provider_profile_id: provider,
    p_failure: "timeout",
    p_now: time.toISOString(),
    p_cooldown_ms: 60000
  };
}

function serviceHeaders(config, extra = {}) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
    ...Object.fromEntries(Object.entries(extra).filter(([, value]) => value))
  };
}

function keyHeaders(key, token) {
  return {
    apikey: key,
    Authorization: `Bearer ${token || key}`,
    "Content-Type": "application/json"
  };
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new SafeValidationError("startup", "missing_environment", `${name} is required.`);
  return value;
}

function syntheticUuid(label) {
  const hex = createHash("sha256").update(`${VALIDATION_PREFIX}-live-${label}-${suffix}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

function validationKey(label) {
  return `${VALIDATION_PREFIX}-${label}-${suffix}`;
}

function trackUser(userId) {
  state.syntheticUserIds.add(userId);
  return userId;
}

function trackProvider(providerId) {
  if (!providerId.startsWith(`${VALIDATION_PREFIX}-`)) throw new Error("unsafe provider validation key");
  state.providerIds.add(providerId);
  return providerId;
}

function trackCache(cacheKey) {
  if (!cacheKey.startsWith(`${VALIDATION_PREFIX}-`)) throw new Error("unsafe cache validation key");
  state.cacheKeys.add(cacheKey);
  return cacheKey;
}

function trackLock(lockKey) {
  if (!lockKey.startsWith(`${VALIDATION_PREFIX}-`)) throw new Error("unsafe lock validation key");
  state.lockKeys.add(lockKey);
  return lockKey;
}

async function parseJsonResponse(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function assert(condition, message, phase = "assertion", errorCode = "assertion_failed") {
  if (!condition) throw new SafeValidationError(phase, errorCode, message);
}

function isSuccessfulReadinessLockResult(value) {
  return value
    && typeof value === "object"
    && typeof value.lockKey === "string"
    && (value.status === "acquired" || value.status === "stale_lock_recovered");
}

function lockOwnershipMessage(results) {
  return `lock ownership contract mismatch: ${Object.entries(results)
    .map(([label, value]) => `${label}=${safeScalar(value?.status)}`)
    .join(", ")}`;
}

function lockStatusCounts(results) {
  return {
    acquiredCount: results.filter((item) => item.status === "acquired").length,
    staleRecoveredCount: results.filter((item) => item.status === "stale_lock_recovered").length,
    alreadyLockedCount: results.filter((item) => item.status === "already_locked").length,
    unknownCount: results.filter((item) => !["acquired", "stale_lock_recovered", "already_locked"].includes(item.status)).length
  };
}

function formatLockCounts(counts) {
  return `acquiredCount=${counts.acquiredCount}, staleRecoveredCount=${counts.staleRecoveredCount}, alreadyLockedCount=${counts.alreadyLockedCount}, unknownCount=${counts.unknownCount}`;
}

function providerProbeCounts(results, options = {}) {
  const isGranted = (item) => item?.allowed === true && item?.state === "half_open";
  return {
    probeGrantedCount: results.filter(isGranted).length,
    blockedCount: results.filter((item) => item?.allowed === false && ["open", "half_open"].includes(item?.state)).length,
    recoveredLeaseCount: options.recoveredLeases ? results.filter(isGranted).length : 0,
    unknownCount: results.filter((item) => typeof item?.allowed !== "boolean" || !["closed", "open", "half_open"].includes(item?.state)).length
  };
}

function formatProviderProbeCounts(counts) {
  return `probeGrantedCount=${counts.probeGrantedCount}, blockedCount=${counts.blockedCount}, recoveredLeaseCount=${counts.recoveredLeaseCount}, unknownCount=${counts.unknownCount}`;
}

async function runPhase(phase, operation) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof SafeValidationError && !error.phase) error.phase = phase;
    if (error instanceof SafeValidationError) throw error;
    throw new SafeValidationError(phase, "phase_failed", safeError(error));
  }
}

async function httpError(response, errorCode, fallbackMessage, context = {}) {
  let postgrestCode;
  let message = fallbackMessage;
  try {
    const body = await response.json();
    postgrestCode = typeof body?.code === "string" ? body.code : undefined;
    message = typeof body?.message === "string" ? body.message : fallbackMessage;
  } catch {
    message = fallbackMessage;
  }
  return new SafeValidationError(undefined, errorCode, message, response.status, postgrestCode, context.rpcName, context.operation);
}

class SafeValidationError extends Error {
  constructor(phase, errorCode, message, httpStatus, postgrestCode, rpcName, operation) {
    super(message);
    this.phase = phase;
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;
    this.postgrestCode = postgrestCode;
    this.rpcName = rpcName;
    this.operation = operation;
  }
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function minuteIso(date) {
  return new Date(Math.floor(date.getTime() / 60_000) * 60_000).toISOString();
}

function safeScalar(value) {
  return String(value || "missing").replace(/[^a-z_:-]/gi, "").slice(0, 40);
}

function sanitizePsqlError(stderr) {
  const firstLine = String(stderr || "").split(/\r?\n/).find(Boolean);
  if (!firstLine) return "Database definition check failed.";
  return firstLine
    .replace(/https?:\/\/[^\s"']+/g, "[redacted-url]")
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-database-url]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/[A-Za-z0-9_.-]{24,}/g, "[redacted]")
    .slice(0, 180);
}

function safeError(error) {
  return error instanceof Error
    ? error.message
      .replace(/https?:\/\/[^\s"']+/g, "[redacted-url]")
      .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-database-url]")
      .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
      .replace(/[A-Za-z0-9_.-]{24,}/g, "[redacted]")
    : "unknown";
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "failed",
    phase: error.phase || "startup",
    rpcName: error.rpcName,
    operation: error.operation,
    errorCode: error.errorCode || "live_validation_failed",
    httpStatus: error.httpStatus,
    postgrestCode: error.postgrestCode,
    message: safeError(error)
  }, null, 2));
  process.exit(1);
});
