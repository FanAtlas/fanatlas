import type {
  AICoordinationStores,
  AIConcurrencyLockInput,
  AIConcurrencyLockResult,
  AIIdempotencyCompletionInput,
  AIIdempotencyStartInput,
  AIIdempotencyStartResult,
  AIProviderFailureKind,
  AIProviderProbeResult,
  AIQuotaReservation,
  AIUsageFinalizationInput,
  AIUsageReservationInput
} from "./aiCoordinationTypes";

type SupabaseCoordinationConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
};

class SupabaseRpcClient {
  constructor(private readonly config: SupabaseCoordinationConfig) {}

  async rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.config.supabaseUrl}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: this.config.serviceRoleKey,
        Authorization: `Bearer ${this.config.serviceRoleKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw Object.assign(new Error("AI coordination backend unavailable"), { code: "coordination_unavailable" });
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}

export class SupabaseAIUsageStore {
  constructor(private readonly client: SupabaseRpcClient) {}

  reserveQuota(input: AIUsageReservationInput): Promise<AIQuotaReservation> {
    return this.client.rpc("fanatlas_ai_reserve_quota", {
      p_user_id: input.userId,
      p_request_id: input.requestId,
      p_usage_date: input.usageDate,
      p_minute_bucket: input.minuteBucket,
      p_max_requests_per_minute: input.maxRequestsPerMinute,
      p_max_requests_per_day: input.maxRequestsPerDay,
      p_now: input.now.toISOString()
    });
  }

  async finalizeUsage(input: AIUsageFinalizationInput) {
    await this.client.rpc("fanatlas_ai_finalize_usage", {
      p_user_id: input.userId,
      p_usage_date: input.usageDate,
      p_provider_call_count: input.providerCallCount || 0,
      p_tool_call_count: input.toolCallCount || 0,
      p_input_size_units: input.inputSizeUnits || 0,
      p_output_size_units: input.outputSizeUnits || 0,
      p_blocked_count: input.blockedCount || 0,
      p_failed_count: input.failedCount || 0
    });
  }

  async cleanup(now: Date) {
    await this.client.rpc("fanatlas_ai_cleanup_coordination", { p_now: now.toISOString() });
  }
}

export class SupabaseAIConcurrencyStore {
  constructor(private readonly client: SupabaseRpcClient) {}

  acquire(input: AIConcurrencyLockInput): Promise<AIConcurrencyLockResult> {
    return this.client.rpc("fanatlas_ai_acquire_lock", {
      p_lock_key: input.lockKey,
      p_user_id: input.userId,
      p_conversation_id: input.conversationId,
      p_request_id: input.requestId,
      p_now: input.now.toISOString(),
      p_ttl_ms: input.ttlMs
    });
  }

  async release(lockKey: string, requestId: string) {
    await this.client.rpc("fanatlas_ai_release_lock", {
      p_lock_key: lockKey,
      p_request_id: requestId
    });
  }

  async cleanup(now: Date) {
    await this.client.rpc("fanatlas_ai_cleanup_coordination", { p_now: now.toISOString() });
  }
}

export class SupabaseAIIdempotencyStore {
  constructor(private readonly client: SupabaseRpcClient) {}

  start(input: AIIdempotencyStartInput): Promise<AIIdempotencyStartResult> {
    return this.client.rpc("fanatlas_ai_start_idempotency", {
      p_user_id: input.userId,
      p_client_request_id: input.clientRequestId,
      p_request_fingerprint: input.requestFingerprint,
      p_now: input.now.toISOString(),
      p_ttl_ms: input.ttlMs
    });
  }

  async complete(input: AIIdempotencyCompletionInput) {
    await this.client.rpc("fanatlas_ai_complete_idempotency", {
      p_user_id: input.userId,
      p_client_request_id: input.clientRequestId,
      p_request_fingerprint: input.requestFingerprint,
      p_status: input.status,
      p_response_snapshot: input.response || null,
      p_now: input.now.toISOString(),
      p_ttl_ms: input.ttlMs
    });
  }

  async cleanup(now: Date) {
    await this.client.rpc("fanatlas_ai_cleanup_coordination", { p_now: now.toISOString() });
  }
}

export class SupabaseAIProviderHealthStore {
  constructor(private readonly client: SupabaseRpcClient) {}

  async beforeProviderCall(providerProfileId: string, now: Date, cooldownMs: number): Promise<AIProviderProbeResult> {
    const result = await this.client.rpc<unknown>("fanatlas_ai_before_provider_call", {
      p_provider_profile_id: providerProfileId,
      p_now: now.toISOString(),
      p_cooldown_ms: cooldownMs
    });
    return normalizeAIProviderProbeResult(result);
  }

  async recordSuccess(providerProfileId: string, now: Date) {
    await this.client.rpc("fanatlas_ai_record_provider_success", {
      p_provider_profile_id: providerProfileId,
      p_now: now.toISOString()
    });
  }

  async recordFailure(providerProfileId: string, failure: AIProviderFailureKind, now: Date, cooldownMs: number) {
    await this.client.rpc("fanatlas_ai_record_provider_failure", {
      p_provider_profile_id: providerProfileId,
      p_failure: failure,
      p_now: now.toISOString(),
      p_cooldown_ms: cooldownMs
    });
  }

  async cleanup(now: Date) {
    await this.client.rpc("fanatlas_ai_cleanup_coordination", { p_now: now.toISOString() });
  }
}

export function createSupabaseAICoordinationStores(config: SupabaseCoordinationConfig): AICoordinationStores {
  const client = new SupabaseRpcClient(config);
  return {
    usage: new SupabaseAIUsageStore(client),
    idempotency: new SupabaseAIIdempotencyStore(client),
    concurrency: new SupabaseAIConcurrencyStore(client),
    providerHealth: new SupabaseAIProviderHealthStore(client)
  };
}

export function normalizeAIProviderProbeResult(value: unknown): AIProviderProbeResult {
  if (!value || typeof value !== "object") return { allowed: false, state: "open" };
  const allowed = (value as { allowed?: unknown }).allowed;
  const state = (value as { state?: unknown }).state;
  if (typeof allowed !== "boolean") return { allowed: false, state: "open" };
  if (state !== "closed" && state !== "open" && state !== "half_open") return { allowed: false, state: "open" };
  return { allowed, state };
}
