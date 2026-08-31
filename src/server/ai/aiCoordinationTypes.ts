import type { FanAtlasAIResponse } from "../../lib/fanAtlasAIContracts";

export type AICoordinationBackend = "memory" | "supabase";
export type AIRequestState =
  | "received"
  | "authenticated"
  | "validated"
  | "deduplicated"
  | "quota_reserved"
  | "lock_acquired"
  | "context_ready"
  | "provider_started"
  | "provider_completed"
  | "output_validated"
  | "completed"
  | "cancelled"
  | "failed";

export type AIUsageLimitCategory = "minute" | "daily" | "coordination";
export type AIQuotaReservation = {
  allowed: boolean;
  limitCategory?: AIUsageLimitCategory;
  retryAfterSeconds?: number;
  resetAt?: string;
};

export type AIUsageReservationInput = {
  userId: string;
  requestId: string;
  usageDate: string;
  minuteBucket: string;
  maxRequestsPerMinute: number;
  maxRequestsPerDay: number;
  now: Date;
};

export type AIUsageFinalizationInput = {
  userId: string;
  usageDate: string;
  requestCount?: number;
  providerCallCount?: number;
  toolCallCount?: number;
  inputSizeUnits?: number;
  outputSizeUnits?: number;
  blockedCount?: number;
  failedCount?: number;
};

export type AIConcurrencyLockStatus = "acquired" | "already_locked" | "stale_lock_recovered" | "storage_failure";
export type AIConcurrencyLockResult = {
  status: AIConcurrencyLockStatus;
  lockKey: string;
  expiresAt?: string;
};

export type AIConcurrencyLockInput = {
  lockKey: string;
  userId: string;
  conversationId: string;
  requestId: string;
  now: Date;
  ttlMs: number;
};

export type AIIdempotencyStatus = "processing" | "completed" | "failed_retryable" | "failed_final" | "cancelled";
export type AIIdempotencyStartResult =
  | { status: "started" }
  | { status: "replay"; response: FanAtlasAIResponse }
  | { status: "processing" }
  | { status: "conflict" };

export type AIIdempotencyStartInput = {
  userId: string;
  clientRequestId: string;
  requestFingerprint: string;
  now: Date;
  ttlMs: number;
};

export type AIIdempotencyCompletionInput = {
  userId: string;
  clientRequestId: string;
  requestFingerprint: string;
  status: AIIdempotencyStatus;
  response?: FanAtlasAIResponse;
  now: Date;
  ttlMs: number;
};

export type AICircuitState = "closed" | "open" | "half_open";
export type AIProviderHealthRecord = {
  providerProfileId: string;
  state: AICircuitState;
  recentSuccesses: number;
  recentFailures: number;
  timeoutCount: number;
  openedAt?: string;
  cooldownUntil?: string;
  halfOpenLeaseUntil?: string;
  updatedAt: string;
};

export type AIProviderProbeResult = {
  allowed: boolean;
  state: AICircuitState;
};

export type AIProviderFailureKind = "timeout" | "provider_5xx" | "malformed_response" | "connection_failure";

export type AIProviderHealthStore = {
  beforeProviderCall(providerProfileId: string, now: Date, cooldownMs: number): Promise<AIProviderProbeResult>;
  recordSuccess(providerProfileId: string, now: Date): Promise<void>;
  recordFailure(providerProfileId: string, failure: AIProviderFailureKind, now: Date, cooldownMs: number): Promise<void>;
  cleanup(now: Date): Promise<void>;
};

export type AIUsageStore = {
  reserveQuota(input: AIUsageReservationInput): Promise<AIQuotaReservation>;
  finalizeUsage(input: AIUsageFinalizationInput): Promise<void>;
  cleanup(now: Date): Promise<void>;
};

export type AIIdempotencyStore = {
  start(input: AIIdempotencyStartInput): Promise<AIIdempotencyStartResult>;
  complete(input: AIIdempotencyCompletionInput): Promise<void>;
  cleanup(now: Date): Promise<void>;
};

export type AIConcurrencyStore = {
  acquire(input: AIConcurrencyLockInput): Promise<AIConcurrencyLockResult>;
  release(lockKey: string, requestId: string): Promise<void>;
  cleanup(now: Date): Promise<void>;
};

export type AICoordinationStores = {
  usage: AIUsageStore;
  idempotency: AIIdempotencyStore;
  concurrency: AIConcurrencyStore;
  providerHealth: AIProviderHealthStore;
};

export type AICoordinationConfig = {
  backend: AICoordinationBackend;
  lockTtlMs: number;
  idempotencyTtlMs: number;
  providerCooldownMs: number;
  allowMemoryInProduction: boolean;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
};

export type AICoordinationFailureCode = "coordination_unavailable" | "idempotency_conflict" | "request_already_processing";
