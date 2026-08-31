import { describe, expect, it } from "vitest";
import { buildNavigationDestinationFromMapDestination, buildNavigationRequestFromMapDestination, formatNavigationCoordinate, formatNavigationDistance, formatNavigationDuration, isValidNavigationCoordinate, navigationModeCapability, navigationRequestKey, navigationRouteFreshnessLabel, navigationRouteFreshnessState, navigationRouteMatchesRequest, navigationSearchParams, normalizeNavigationRouteResponse, parseNavigationRequestQuery, supportedNavigationModes } from "./navigation";

describe("navigation", () => {
  it("validates coordinates, including 0,0, without mutating destination data", () => {
    expect(isValidNavigationCoordinate(0, 0)).toBe(true);
    expect(isValidNavigationCoordinate(91, 0)).toBe(false);
    expect(isValidNavigationCoordinate(0, 181)).toBe(false);

    const destination = {
      name: "Lisbon",
      city: "Lisbon",
      lat: 38.7223,
      lng: -9.1393,
      emoji: "📍",
      type: "place" as const,
      address: "Center"
    };
    const before = structuredClone(destination);
    const canonical = buildNavigationDestinationFromMapDestination(destination, "explore");

    expect(canonical.coordinates?.latitude).toBe(38.7223);
    expect(canonical.source).toBe("explore");
    expect(destination).toEqual(before);
  });

  it("builds canonical requests and safe query state", () => {
    const request = buildNavigationRequestFromMapDestination({
      name: "Rossio Square",
      city: "Lisbon",
      lat: 38.7148,
      lng: -9.1392,
      emoji: "📍",
      type: "place"
    }, "trip_day", {
      mode: "walking"
    });

    expect(request.source).toBe("trip_day");
    expect(request.mode).toBe("walking");
    expect(navigationRequestKey(request)).toContain("trip_day");
    expect(navigationSearchParams(request).get("source")).toBe("trip_day");
    expect(navigationSearchParams(request).get("mode")).toBe("walking");
  });

  it("accepts coordinate-only map URLs and preserves the distinction between supported and unsupported modes", () => {
    const request = parseNavigationRequestQuery("?lat=38.7223&lng=-9.1393&mode=driving&source=manual");
    expect(request?.destination.coordinates?.latitude).toBe(38.7223);
    expect(request?.destination.label).toBe("Selected destination");

    expect(supportedNavigationModes()).toEqual(["driving", "walking"]);
    expect(navigationModeCapability("cycling").supported).toBe(false);
    expect(navigationModeCapability("transit").supported).toBe(false);
  });

  it("normalizes routes and fails closed on malformed provider payloads", () => {
    const request = buildNavigationRequestFromMapDestination({
      name: "Stadium",
      city: "Lisbon",
      lat: 38.75,
      lng: -9.15,
      emoji: "🏟",
      type: "stadium"
    }, "stadium");

    const valid = normalizeNavigationRouteResponse({
      routes: [{
        distance: 2400,
        duration: 1860,
        geometry: {
          coordinates: [[-9.15, 38.75], [-9.14, 38.76]]
        }
      }]
    }, request);

    expect(valid?.distanceMeters).toBe(2400);
    expect(valid?.durationSeconds).toBe(1860);
    expect(valid?.geometry).toHaveLength(2);

    const invalid = normalizeNavigationRouteResponse({
      routes: [{
        distance: -1,
        duration: 0,
        geometry: {
          coordinates: [[-9.15, 38.75]]
        }
      }]
    }, request);

    expect(invalid).toBeNull();
  });

  it("formats route metrics and coordinates for display", () => {
    expect(formatNavigationDistance(2400, "en")).toBe("2.4 km");
    expect(formatNavigationDuration(1860, "en")).toBe("31 min");
    expect(formatNavigationCoordinate(38.7223, "en")).toBe("38.7223");
  });

  it("tracks route freshness and marks previously retrieved routes as stale when connectivity drops", () => {
    const request = buildNavigationRequestFromMapDestination({
      name: "Rossio Square",
      city: "Lisbon",
      lat: 38.7148,
      lng: -9.1392,
      emoji: "📍",
      type: "place"
    }, "trip_day");

    const route = normalizeNavigationRouteResponse({
      routes: [{
        distance: 2400,
        duration: 1860,
        geometry: {
          coordinates: [[-9.1399, 38.7167], [-9.1392, 38.7148]]
        }
      }]
    }, request);

    expect(route).not.toBeNull();
    expect(route?.freshness?.state).toBe("fresh");
    expect(navigationRouteMatchesRequest(route, request)).toBe(true);
    expect(navigationRouteFreshnessState(route, { currentRequest: request, isOnline: true })).toBe("fresh");
    expect(navigationRouteFreshnessState(route, { currentRequest: request, isOnline: false })).toBe("stale");
    expect(navigationRouteFreshnessLabel(route, { currentRequest: request, isOnline: false })).toContain("Route retrieved earlier");
  });
});
