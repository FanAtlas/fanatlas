import { describe, expect, it } from "vitest";
import { resolveCityIdentity } from "./destinationIntelligence";
import {
  deduplicateTravelDiscoveryPlaces,
  discoverTravelPlaces,
  normalizeTravelDiscoveryPlace,
  travelDiscoveryPlaceToPlanningCandidate,
  validateTravelDiscoveryRequest
} from "./travelDiscoveryPlaces";
import { createSyntheticTravelDiscoveryProvider } from "./travelDiscoveryFixtureProvider";
import type { TravelDiscoveryPlace } from "./travelDiscoveryTypes";
import type { TravelDiscoveryRequest } from "./travelDiscoveryTypes";

const destination = resolveCityIdentity({ countryCode: "PT", city: "Lisbon" })!;

describe("Travel discovery contracts and normalization", () => {
  it("resolves a valid canonical destination request and bounds its limit", () => {
    const validation = validateTravelDiscoveryRequest({ destination: { countryCode: "PT", city: "Lisbon" }, limit: 10 });
    expect(validation.ok).toBe(true);
    expect(validation.ok && validation.destination.id).toBe("city:PT:lisbon");
    expect(validateTravelDiscoveryRequest({ destination: { countryCode: "PT", city: "Lisbon" }, limit: 51 }).ok).toBe(false);
  });

  it("rejects unresolved destinations and requires explicit coordinates for nearby mode", () => {
    expect(validateTravelDiscoveryRequest({ destination: { country: "Atlantis", city: "Unknown" } })).toMatchObject({ ok: false, error: { code: "INVALID_DESTINATION" } });
    expect(validateTravelDiscoveryRequest({ destination, mode: "nearby" })).toMatchObject({ ok: false, error: { code: "INVALID_REQUEST" } });
    expect(validateTravelDiscoveryRequest({ destination, mode: "nearby", coordinates: { latitude: 0, longitude: 0 } }).ok).toBe(true);
  });

  it("normalizes fixture places with canonical category, provenance, freshness, and valid 0,0 coordinates", async () => {
    const result = await discoverTravelPlaces({ destination, limit: 10 }, createSyntheticTravelDiscoveryProvider({ retrievedAt: "2026-09-09T12:00:00.000Z" }));
    expect(result.errors).toEqual([]);
    expect(result.places.map((place) => place.name)).toContain("Synthetic History Museum");
    const cafe = result.places.find((place) => place.name === "Synthetic Local Cafe");
    expect(cafe?.location?.coordinates).toEqual({ latitude: 0, longitude: 0 });
    expect(cafe?.source).toMatchObject({ provider: "synthetic-fixture", sourcePlaceId: "synthetic-local-cafe" });
    expect(cafe?.freshness).toMatchObject({ class: "curated", retrievedAt: "2026-09-09T12:00:00.000Z" });
  });

  it("keeps unknown rating, price, hours, and accessibility unknown instead of inventing values", () => {
    const place = normalizeTravelDiscoveryPlace({ id: "unknowns", name: "Unknown Place", category: "attraction" }, { provider: "fixture", destination, freshness: { class: "unknown" } });
    expect(place).toBeTruthy();
    expect(place?.rating).toBeUndefined();
    expect(place?.budgetStyle).toBeUndefined();
    expect(place?.openingHours).toBeUndefined();
    expect(place?.accessibility).toBeUndefined();
  });

  it("maps provider categories deterministically and rejects malformed places", () => {
    expect(normalizeTravelDiscoveryPlace({ id: "r", name: "Restaurant", category: "dining" }, { provider: "fixture", destination, freshness: { class: "curated" } })?.category).toBe("restaurant");
    expect(normalizeTravelDiscoveryPlace({ id: "bad", category: "museum" }, { provider: "fixture", destination, freshness: { class: "curated" } })).toBeNull();
    expect(normalizeTravelDiscoveryPlace({ id: "bad-coords", name: "Bad", category: "park", latitude: 200, longitude: 2 }, { provider: "fixture", destination, freshness: { class: "curated" } })?.location).toBeUndefined();
  });

  it("bounds text and validates safe website URLs", () => {
    const place = normalizeTravelDiscoveryPlace({ id: "url", name: "  Safe   Place ", category: "attraction", description: "x".repeat(700), websiteUrl: "javascript:alert(1)" }, { provider: "fixture", destination, freshness: { class: "curated" } });
    expect(place?.name).toBe("Safe Place");
    expect(place?.description?.length).toBe(500);
    expect(place?.websiteUrl).toBeUndefined();
    expect(normalizeTravelDiscoveryPlace({ id: "safe", name: "Safe", category: "attraction", websiteUrl: "https://example.test/place" }, { provider: "fixture", destination, freshness: { class: "curated" } })?.websiteUrl).toBe("https://example.test/place");
  });

  it("preserves rating scale/count and sanitizes opening-hour intervals", () => {
    const place = normalizeTravelDiscoveryPlace({ id: "hours", name: "Hours", category: "museum", rating: 4.6, ratingScale: 5, ratingCount: 2431, openingHours: { status: "known", intervals: [{ day: 1, start: "09:00", end: "18:00" }, { day: 9, start: "bad", end: "25:00" }] } }, { provider: "fixture", destination, freshness: { class: "live", retrievedAt: "2026-09-09T12:00:00.000Z" } });
    expect(place?.rating).toEqual({ value: 4.6, scale: 5, count: 2431 });
    expect(place?.openingHours?.intervals).toEqual([{ day: 1, start: "09:00", end: "18:00" }]);
  });

  it("deduplicates provider IDs without merging distinct providers or same-name businesses", () => {
    const make = (provider: string, id: string, name: string, latitude: number): TravelDiscoveryPlace => ({ schemaVersion: 1, logicalId: `${provider}:${id}`, name, category: "cafe", destination, source: { provider, sourcePlaceId: id, dataClasses: ["name"] }, freshness: { class: "curated" }, location: { coordinates: { latitude, longitude: 0 } } });
    const places = deduplicateTravelDiscoveryPlaces([
      make("one", "same", "Cafe One", 1), make("one", "same", "Cafe One", 1), make("two", "same", "Cafe One", 1), make("one", "different", "Cafe One", 5)
    ]);
    expect(places).toHaveLength(3);
    expect(places.filter((place) => place.source.provider === "one")).toHaveLength(2);
  });

  it("sorts and deduplicates deterministically", () => {
    const make = (id: string, name: string): TravelDiscoveryPlace => ({ schemaVersion: 1, logicalId: id, name, category: "park", destination, source: { provider: "fixture", sourcePlaceId: id, dataClasses: ["name"] }, freshness: { class: "curated" } });
    const input = [make("b", "Beta"), make("a", "Alpha")];
    expect(deduplicateTravelDiscoveryPlaces(input)).toEqual(deduplicateTravelDiscoveryPlaces([...input].reverse()));
  });

  it("converts discovered places to planner candidates without inventing duration or priority", () => {
    const place = normalizeTravelDiscoveryPlace({ id: "museum", name: "Museum", category: "museum", latitude: 0, longitude: 0, address: "Safe label" }, { provider: "fixture", destination, freshness: { class: "curated" } })!;
    const draft = travelDiscoveryPlaceToPlanningCandidate(place);
    expect(draft).toMatchObject({ title: "Museum", category: "museum", source: "destination_data", destinationId: destination.id, priority: 0, interestTags: ["museums", "culture"] });
    expect(draft.estimatedDurationMinutes).toBeUndefined();
    expect(draft.location).toEqual({ latitude: 0, longitude: 0, label: "Safe label" });
    expect(JSON.stringify(draft)).not.toContain("rating");
    expect(JSON.stringify(draft)).not.toContain("travel");
    expect(travelDiscoveryPlaceToPlanningCandidate(place, { durationMinutes: 90, priority: 7 }).estimatedDurationMinutes).toBe(90);
  });

  it("does not mutate requests, provider responses, or normalized place data", async () => {
    const request: TravelDiscoveryRequest = { destination, interests: ["food"], limit: 3 };
    const before = JSON.stringify(request);
    const raw = { id: "raw", name: "Raw", category: "cafe", latitude: 0, longitude: 0 };
    const rawBefore = JSON.stringify(raw);
    const normalized = normalizeTravelDiscoveryPlace(raw, { provider: "fixture", destination, freshness: { class: "curated" } });
    await discoverTravelPlaces(request, createSyntheticTravelDiscoveryProvider());
    expect(JSON.stringify(request)).toBe(before);
    expect(JSON.stringify(raw)).toBe(rawBefore);
    expect(normalized?.destination).not.toBe(destination);
  });

  it("fails closed for stale current information and retains truthful freshness classes", async () => {
    const stale = await discoverTravelPlaces({ destination, requiresCurrentInformation: true }, createSyntheticTravelDiscoveryProvider({ freshnessClass: "stale_cache" }));
    expect(stale.places).toEqual([]);
    expect(stale.errors[0]).toMatchObject({ code: "STALE_DATA" });
    const cached = await discoverTravelPlaces({ destination }, createSyntheticTravelDiscoveryProvider({ freshnessClass: "recent_cache" }));
    expect(cached.freshness.class).toBe("recent_cache");
  });

  it("normalizes provider failures into structured errors without raw provider details", async () => {
    for (const code of ["PROVIDER_UNAVAILABLE", "RATE_LIMITED", "AUTH_REQUIRED", "NETWORK_ERROR"] as const) {
      const result = await discoverTravelPlaces({ destination }, createSyntheticTravelDiscoveryProvider({ failureCode: code }));
      expect(result.places).toEqual([]);
      expect(result.errors[0]).toMatchObject({ code, provider: "synthetic-fixture" });
      expect(result.errors[0].message).not.toContain("synthetic provider failure");
    }
  });

  it("handles no results and unsupported capability without raw payload leakage", async () => {
    const emptyProvider = createSyntheticTravelDiscoveryProvider();
    emptyProvider.searchPlaces = async () => ({ places: [], freshness: { class: "unknown" } });
    const empty = await discoverTravelPlaces({ destination }, emptyProvider);
    expect(empty.errors[0].code).toBe("NO_RESULTS");
    const unsupported = { ...createSyntheticTravelDiscoveryProvider(), capabilities: { ...createSyntheticTravelDiscoveryProvider().capabilities, textSearch: false } };
    const result = await discoverTravelPlaces({ destination }, unsupported);
    expect(result.errors[0].code).toBe("UNSUPPORTED_CAPABILITY");
    expect(JSON.stringify(result)).not.toContain("SYNTHETIC_PLACES");
  });

  it("keeps destination discovery independent from precise current location and private context", async () => {
    const request = { destination, category: "restaurant" as const };
    const result = await discoverTravelPlaces(request, createSyntheticTravelDiscoveryProvider());
    expect(result.request).not.toHaveProperty("coordinates");
    expect(JSON.stringify(result)).not.toMatch(/email|journal|reservation|auth|session|private/i);
    expect(validateTravelDiscoveryRequest({ ...request, mode: "nearby", coordinates: { latitude: 0, longitude: 0 } }).ok).toBe(true);
  });
});
