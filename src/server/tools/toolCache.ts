import type { TravelToolResult } from "./toolContracts";

type CacheRecord = {
  value: TravelToolResult;
  expiresAt: number;
  staleAt: number;
};

export type ToolCacheLookup = {
  status: "fresh" | "stale" | "miss";
  value?: TravelToolResult;
};

export interface ToolCache {
  get(key: string, now: Date): ToolCacheLookup;
  set(key: string, value: TravelToolResult, ttlMs: number, staleMs: number, now: Date): void;
  cleanup(now: Date): number;
}

export class MemoryToolCache implements ToolCache {
  private readonly records = new Map<string, CacheRecord>();

  get(key: string, now: Date): ToolCacheLookup {
    const record = this.records.get(key);
    if (!record) return { status: "miss" };
    const time = now.getTime();
    if (record.expiresAt <= time) {
      this.records.delete(key);
      return { status: "miss" };
    }
    return {
      status: record.staleAt <= time ? "stale" : "fresh",
      value: cloneResult(record.value)
    };
  }

  set(key: string, value: TravelToolResult, ttlMs: number, staleMs: number, now: Date): void {
    this.records.set(key, {
      value: cloneResult(value),
      staleAt: now.getTime() + staleMs,
      expiresAt: now.getTime() + ttlMs
    });
  }

  cleanup(now: Date): number {
    let removed = 0;
    const time = now.getTime();
    for (const [key, record] of this.records.entries()) {
      if (record.expiresAt <= time) {
        this.records.delete(key);
        removed += 1;
      }
    }
    return removed;
  }
}

export function createToolCacheKey(parts: Record<string, string | number | boolean | undefined>) {
  return Object.entries(parts)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value).toLowerCase().trim())}`)
    .sort()
    .join("&");
}

function cloneResult(value: TravelToolResult): TravelToolResult {
  return JSON.parse(JSON.stringify(value)) as TravelToolResult;
}
