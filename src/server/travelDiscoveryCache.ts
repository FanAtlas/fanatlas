export type TravelDiscoveryCacheEntry<T> = { value: T; expiresAt: number };

export class TravelDiscoveryMemoryCache<T> {
  private readonly entries = new Map<string, TravelDiscoveryCacheEntry<T>>();
  constructor(private readonly maxEntries = 50) {}

  get(key: string, now = Date.now()): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number, now = Date.now()): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: now + ttlMs });
    while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value as string);
  }

  clear(): void { this.entries.clear(); }
  get size(): number { return this.entries.size; }
}

export function stableDiscoveryCacheKey(input: Record<string, unknown>): string {
  return JSON.stringify(Object.keys(input).sort().reduce<Record<string, unknown>>((out, key) => { out[key] = input[key]; return out; }, {}));
}
