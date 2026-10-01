import { describe, expect, it } from "vitest";
import { stableDiscoveryCacheKey, TravelDiscoveryMemoryCache } from "./travelDiscoveryCache";

describe("travel discovery cache", () => {
  it("expires entries and bounds memory", () => {
    const cache = new TravelDiscoveryMemoryCache<string>(2);
    cache.set(stableDiscoveryCacheKey({ b: 2, a: 1 }), "one", 10, 100);
    cache.set("two", "two", 1000, 100);
    cache.set("three", "three", 1000, 100);
    expect(cache.size).toBe(2);
    expect(cache.get(JSON.stringify({ a: 1, b: 2 }), 101)).toBeUndefined();
  });
});
