import { describe, expect, it, vi } from "vitest";
import { resolveCityIdentity } from "../lib/destinationIntelligence";
import { discoverTravelPlaces } from "../lib/travelDiscoveryPlaces";
import { buildGeoapifyPlacesUrl, createGeoapifyTravelDiscoveryProvider, GEOAPIFY_CATEGORY_MAPPING } from "./travelDiscoveryGeoapify";
import { TravelDiscoveryMemoryCache } from "./travelDiscoveryCache";
import type { TravelDiscoveryProviderRawResult } from "../lib/travelDiscoveryTypes";

declare const process: { env: Record<string, string | undefined> };

const destination = resolveCityIdentity({ countryCode: "PT", city: "Lisbon" })!;
const feature = (overrides: Record<string, unknown> = {}) => ({ type: "Feature", properties: { place_id: "geo-1", name: "Geo Museum", categories: ["entertainment", "entertainment.museum"], formatted: "1 Safe Street", lat: 0, lon: 0, website: "https://example.test/museum", ...overrides }, geometry: { type: "Point", coordinates: [0, 0] } });

describe("Geoapify discovery adapter", () => {
  it("constructs the documented Lisbon museum Places request without exposing its key", () => {
    const url = buildGeoapifyPlacesUrl({ destination, category: "museum", limit: 3 }, { latitude: 38.7223, longitude: -9.1393 }, " PRIVATE-GEOAPIFY-REQUEST-KEY\n");
    expect(url.origin).toBe("https://api.geoapify.com");
    expect(url.pathname).toBe("/v2/places");
    expect(url.searchParams.get("categories")).toBe("entertainment.museum");
    expect(url.searchParams.get("filter")).toBe("circle:-9.1393,38.7223,15000");
    expect(url.searchParams.get("limit")).toBe("3");
    expect(url.searchParams.get("apiKey")).toBe("PRIVATE-GEOAPIFY-REQUEST-KEY");
    const provider = createGeoapifyTravelDiscoveryProvider({ apiKey: "PRIVATE-GEOAPIFY-REQUEST-KEY", fetchImpl: vi.fn(async () => new Response(JSON.stringify({ features: [feature()] }), { status: 200 })), resolveCoordinates: () => ({ latitude: 38.7223, longitude: -9.1393 }) });
    return discoverTravelPlaces({ destination, category: "museum", limit: 3 }, provider).then((result) => expect(JSON.stringify(result)).not.toContain("PRIVATE-GEOAPIFY-REQUEST-KEY"));
  });

  it("captures only sanitized development diagnostics for failed upstream responses", async () => {
    const previous = process.env.FANATLAS_TRAVEL_DISCOVERY_DIAGNOSTICS;
    process.env.FANATLAS_TRAVEL_DISCOVERY_DIAGNOSTICS = "true";
    const onDiagnostic = vi.fn();
    const provider = createGeoapifyTravelDiscoveryProvider({ apiKey: "PRIVATE-GEOAPIFY-REQUEST-KEY", fetchImpl: vi.fn(async () => new Response(JSON.stringify({ code: "bad_request", message: "apiKey=PRIVATE-GEOAPIFY-REQUEST-KEY rejected" }), { status: 400 })), resolveCoordinates: () => ({ latitude: 38.7223, longitude: -9.1393 }), onDiagnostic });
    await discoverTravelPlaces({ destination, category: "museum", limit: 3 }, provider);
    expect(onDiagnostic).toHaveBeenCalledWith({ upstreamStatus: 400, providerCode: "bad_request", providerMessage: "apiKey=[REDACTED] rejected" });
    process.env.FANATLAS_TRAVEL_DISCOVERY_DIAGNOSTICS = previous;
  });

  it("maps a provider feature into the safe provider-neutral contract", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ features: [feature()] }), { status: 200, headers: { "content-type": "application/json" } }));
    const provider = createGeoapifyTravelDiscoveryProvider({ apiKey: "PRIVATE-GEOAPIFY-KEY-CHECKPOINT-C", fetchImpl, resolveCoordinates: () => ({ latitude: 38.72, longitude: -9.14 }), now: () => "2026-09-16T00:00:00.000Z" });
    const result = await discoverTravelPlaces({ destination, category: "museum", limit: 3 }, provider);
    expect(result.places[0]).toMatchObject({ name: "Geo Museum", category: "museum", location: { coordinates: { latitude: 0, longitude: 0 } }, source: { provider: "geoapify", sourcePlaceId: "geo-1" }, freshness: { class: "live" } });
    expect(result.places[0]?.rating).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("PRIVATE-GEOAPIFY-KEY-CHECKPOINT-C");
    expect(fetchImpl).toHaveBeenCalledWith(expect.objectContaining({ hostname: "api.geoapify.com" }), expect.any(Object));
  });

  it("uses documented Point geometry coordinates when properties omit duplicate coordinates", async () => {
    const geoJsonMuseum = feature({ place_id: "geo-geometry", lat: undefined, lon: undefined });
    geoJsonMuseum.geometry.coordinates = [-9.142, 38.716];
    const provider = createGeoapifyTravelDiscoveryProvider({ apiKey: "marker", fetchImpl: vi.fn(async () => new Response(JSON.stringify({ type: "FeatureCollection", features: [geoJsonMuseum] }), { status: 200 })), resolveCoordinates: () => ({ latitude: 38.7223, longitude: -9.1393 }) });
    const result = await discoverTravelPlaces({ destination, category: "museum", limit: 3 }, provider);
    expect(result.places).toHaveLength(1);
    expect(result.places[0]).toMatchObject({ category: "museum", destination: { id: "city:PT:lisbon" }, location: { coordinates: { latitude: 38.716, longitude: -9.142 } }, source: { provider: "geoapify", sourcePlaceId: "geo-geometry", attributionRequired: true, attributionText: "Geoapify" } });
  });

  it("uses centralized category mappings and safely omits malformed or unsafe fields", async () => {
    expect(Object.keys(GEOAPIFY_CATEGORY_MAPPING)).toEqual(expect.arrayContaining(["museum", "restaurant", "park", "wellness"]));
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ features: [feature({ name: "x".repeat(400), website: "javascript:alert(1)" }), { properties: { place_id: "bad" } }] }), { status: 200 }));
    const provider = createGeoapifyTravelDiscoveryProvider({ apiKey: "marker", fetchImpl, resolveCoordinates: () => ({ latitude: 1, longitude: 2 }) });
    const result = await discoverTravelPlaces({ destination }, provider);
    expect(result.places[0]?.name.length).toBe(160);
    expect(result.places[0]?.websiteUrl).toBeUndefined();
    expect(result.places).toHaveLength(1);
  });

  it("maps upstream failures without leaking provider details and caches identical requests", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 429 }));
    const cache = new TravelDiscoveryMemoryCache<TravelDiscoveryProviderRawResult>(2);
    const provider = createGeoapifyTravelDiscoveryProvider({ apiKey: "PRIVATE-GEOAPIFY-KEY-CHECKPOINT-C", fetchImpl, cache, resolveCoordinates: () => ({ latitude: 1, longitude: 2 }) });
    const first = await discoverTravelPlaces({ destination, category: "park" }, provider);
    expect(first.errors[0]).toMatchObject({ code: "RATE_LIMITED" });
    expect(first.errors[0]?.message).not.toContain("PRIVATE");
    fetchImpl.mockImplementation(async () => new Response(JSON.stringify({ features: [feature({ place_id: "cached", categories: ["leisure.park"] })] }), { status: 200 }));
    const second = await discoverTravelPlaces({ destination, category: "park" }, provider);
    const third = await discoverTravelPlaces({ destination, category: "park" }, provider);
    expect(second.errors).toEqual([]);
    expect(third.freshness.class).toBe("recent_cache");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
