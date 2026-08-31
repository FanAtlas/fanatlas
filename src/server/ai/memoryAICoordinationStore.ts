import type {
  AICoordinationStores,
  AIConcurrencyLockInput,
  AIConcurrencyLockResult,
  AIIdempotencyCompletionInput,
  AIIdempotencyStartInput,
  AIIdempotencyStartResult,
  AIProviderFailureKind,
  AIProviderHealthRecord,
  AIProviderProbeResult,
  AIUsageFinalizationInput,
  AIUsageReservationInput,
  AIQuotaReservation
} from "./aiCoordinationTypes";

type UsageRow = {
  userId: string;
  usageDate: string;
  requestCount: number;
  providerCallCount: number;
  toolCallCount: number;
  inputSizeUnits: number;
  outputSizeUnits: number;
  blockedCount: number;
  failedCount: number;
  updatedAt: string;
};

type MinuteRow = {
  userId: string;
  minuteBucket: string;
  requestCount: number;
  expiresAt: string;
};

type LockRow = {
  lockKey: string;
  userId: string;
  conversationId: string;
  requestId: string;
  acquiredAt: string;
  expiresAt: string;
};

type IdempotencyRow = {
  userId: string;
  clientRequestId: string;
  requestFingerprint: string;
  status: AIIdempotencyCompletionInput["status"];
  responseSnapshot?: AIIdempotencyCompletionInput["response"];
  createdAt: string;
  expiresAt: string;
};

export class MemoryAIUsageStore {
  readonly daily = new Map<string, UsageRow>();
  readonly minute = new Map<string, MinuteRow>();

  async reserveQuota(input: AIUsageReservationInput): Promise<AIQuotaReservation> {
    this.cleanup(input.now);
    const minuteKey = `${input.userId}:${input.minuteBucket}`;
    const minute = this.minute.get(minuteKey) || {
      userId: input.userId,
      minuteBucket: input.minuteBucket,
      requestCount: 0,
      expiresAt: new Date(input.now.getTime() + 90_000).toISOString()
    };
    if (minute.requestCount >= input.maxRequestsPerMinute) {
      return { allowed: false, limitCategory: "minute", retryAfterSeconds: secondsUntil(minute.expiresAt, input.now) };
    }

    const dailyKey = `${input.userId}:${input.usageDate}`;
    const daily = this.daily.get(dailyKey) || emptyUsage(input.userId, input.usageDate, input.now);
    if (daily.requestCount >= input.maxRequestsPerDay) {
      return {
        allowed: false,
        limitCategory: "daily",
        resetAt: nextUtcDate(input.now).toISOString()
      };
    }

    minute.requestCount += 1;
    daily.requestCount += 1;
    daily.updatedAt = input.now.toISOString();
    this.minute.set(minuteKey, minute);
    this.daily.set(dailyKey, daily);
    return { allowed: true };
  }

  async finalizeUsage(input: AIUsageFinalizationInput) {
    const key = `${input.userId}:${input.usageDate}`;
    const row = this.daily.get(key) || emptyUsage(input.userId, input.usageDate, new Date());
    row.providerCallCount += input.providerCallCount || 0;
    row.toolCallCount += input.toolCallCount || 0;
    row.inputSizeUnits += input.inputSizeUnits || 0;
    row.outputSizeUnits += input.outputSizeUnits || 0;
    row.blockedCount += input.blockedCount || 0;
    row.failedCount += input.failedCount || 0;
    row.updatedAt = new Date().toISOString();
    this.daily.set(key, row);
  }

  async cleanup(now: Date) {
    for (const [key, row] of this.minute) {
      if (new Date(row.expiresAt).getTime() <= now.getTime()) this.minute.delete(key);
    }
  }
}

export class MemoryAIConcurrencyStore {
  readonly locks = new Map<string, LockRow>();

  async acquire(input: AIConcurrencyLockInput): Promise<AIConcurrencyLockResult> {
    const existing = this.locks.get(input.lockKey);
    const expiresAt = new Date(input.now.getTime() + input.ttlMs).toISOString();
    if (existing && new Date(existing.expiresAt).getTime() > input.now.getTime()) {
      return { status: "already_locked", lockKey: input.lockKey, expiresAt: existing.expiresAt };
    }
    this.locks.set(input.lockKey, {
      lockKey: input.lockKey,
      userId: input.userId,
      conversationId: input.conversationId,
      requestId: input.requestId,
      acquiredAt: input.now.toISOString(),
      expiresAt
    });
    return { status: existing ? "stale_lock_recovered" : "acquired", lockKey: input.lockKey, expiresAt };
  }

  async release(lockKey: string, requestId: string) {
    const existing = this.locks.get(lockKey);
    if (existing?.requestId === requestId) this.locks.delete(lockKey);
  }

  async cleanup(now: Date) {
    for (const [key, lock] of this.locks) {
      if (new Date(lock.expiresAt).getTime() <= now.getTime()) this.locks.delete(key);
    }
  }
}

export class MemoryAIIdempotencyStore {
  readonly records = new Map<string, IdempotencyRow>();

  async start(input: AIIdempotencyStartInput): Promise<AIIdempotencyStartResult> {
    this.cleanup(input.now);
    const key = idempotencyKey(input.userId, input.clientRequestId);
    const existing = this.records.get(key);
    if (existing) {
      if (existing.requestFingerprint !== input.requestFingerprint) return { status: "conflict" };
      if (existing.status === "completed" && existing.responseSnapshot) return { status: "replay", response: clone(existing.responseSnapshot) };
      if (existing.status === "processing") return { status: "processing" };
      this.records.set(key, {
        ...existing,
        status: "processing",
        expiresAt: new Date(input.now.getTime() + input.ttlMs).toISOString()
      });
      return { status: "started" };
    }
    this.records.set(key, {
      userId: input.userId,
      clientRequestId: input.clientRequestId,
      requestFingerprint: input.requestFingerprint,
      status: "processing",
      createdAt: input.now.toISOString(),
      expiresAt: new Date(input.now.getTime() + input.ttlMs).toISOString()
    });
    return { status: "started" };
  }

  async complete(input: AIIdempotencyCompletionInput) {
    const key = idempotencyKey(input.userId, input.clientRequestId);
    const existing = this.records.get(key);
    if (!existing || existing.requestFingerprint !== input.requestFingerprint) return;
    this.records.set(key, {
      ...existing,
      status: input.status,
      responseSnapshot: input.status === "completed" ? clone(input.response) : undefined,
      expiresAt: new Date(input.now.getTime() + input.ttlMs).toISOString()
    });
  }

  async cleanup(now: Date) {
    for (const [key, record] of this.records) {
      if (new Date(record.expiresAt).getTime() <= now.getTime()) this.records.delete(key);
    }
  }
}

export class MemoryAIProviderHealthStore {
  readonly records = new Map<string, AIProviderHealthRecord>();

  async beforeProviderCall(providerProfileId: string, now: Date, cooldownMs: number): Promise<AIProviderProbeResult> {
    const record = this.get(providerProfileId, now);
    if (record.state === "half_open" && record.halfOpenLeaseUntil && new Date(record.halfOpenLeaseUntil).getTime() > now.getTime()) {
      return { allowed: false, state: "half_open" };
    }
    if (record.state === "half_open") {
      this.records.set(providerProfileId, {
        ...record,
        halfOpenLeaseUntil: new Date(now.getTime() + Math.min(cooldownMs, 30_000)).toISOString(),
        updatedAt: now.toISOString()
      });
      return { allowed: true, state: "half_open" };
    }
    if (record.state === "open") {
      if (record.cooldownUntil && new Date(record.cooldownUntil).getTime() > now.getTime()) return { allowed: false, state: "open" };
      if (record.halfOpenLeaseUntil && new Date(record.halfOpenLeaseUntil).getTime() > now.getTime()) return { allowed: false, state: "half_open" };
      this.records.set(providerProfileId, {
        ...record,
        state: "half_open",
        halfOpenLeaseUntil: new Date(now.getTime() + Math.min(cooldownMs, 30_000)).toISOString(),
        updatedAt: now.toISOString()
      });
      return { allowed: true, state: "half_open" };
    }
    return { allowed: true, state: record.state };
  }

  async recordSuccess(providerProfileId: string, now: Date) {
    const record = this.get(providerProfileId, now);
    this.records.set(providerProfileId, {
      ...record,
      state: "closed",
      recentSuccesses: record.recentSuccesses + 1,
      recentFailures: Math.max(0, record.recentFailures - 1),
      timeoutCount: 0,
      openedAt: undefined,
      cooldownUntil: undefined,
      halfOpenLeaseUntil: undefined,
      updatedAt: now.toISOString()
    });
  }

  async recordFailure(providerProfileId: string, failure: AIProviderFailureKind, now: Date, cooldownMs: number) {
    const record = this.get(providerProfileId, now);
    const recentFailures = record.recentFailures + 1;
    const timeoutCount = failure === "timeout" ? record.timeoutCount + 1 : record.timeoutCount;
    const shouldOpen = recentFailures >= 3 || timeoutCount >= 2 || record.state === "half_open";
    this.records.set(providerProfileId, {
      ...record,
      state: shouldOpen ? "open" : "closed",
      recentFailures,
      timeoutCount,
      openedAt: shouldOpen ? now.toISOString() : record.openedAt,
      cooldownUntil: shouldOpen ? new Date(now.getTime() + cooldownMs).toISOString() : record.cooldownUntil,
      halfOpenLeaseUntil: undefined,
      updatedAt: now.toISOString()
    });
  }

  async cleanup(_now: Date) {
    return;
  }

  private get(providerProfileId: string, now: Date): AIProviderHealthRecord {
    return this.records.get(providerProfileId) || {
      providerProfileId,
      state: "closed",
      recentSuccesses: 0,
      recentFailures: 0,
      timeoutCount: 0,
      updatedAt: now.toISOString()
    };
  }
}

export function createMemoryAICoordinationStores(): AICoordinationStores {
  return {
    usage: new MemoryAIUsageStore(),
    idempotency: new MemoryAIIdempotencyStore(),
    concurrency: new MemoryAIConcurrencyStore(),
    providerHealth: new MemoryAIProviderHealthStore()
  };
}

function emptyUsage(userId: string, usageDate: string, now: Date): UsageRow {
  return {
    userId,
    usageDate,
    requestCount: 0,
    providerCallCount: 0,
    toolCallCount: 0,
    inputSizeUnits: 0,
    outputSizeUnits: 0,
    blockedCount: 0,
    failedCount: 0,
    updatedAt: now.toISOString()
  };
}

function idempotencyKey(userId: string, clientRequestId: string) {
  return `${userId}:${clientRequestId}`;
}

function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function secondsUntil(iso: string, now: Date) {
  return Math.max(1, Math.ceil((new Date(iso).getTime() - now.getTime()) / 1000));
}

function nextUtcDate(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}
