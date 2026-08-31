import { describe, expect, it } from "vitest";
import { buildOfflineTripSnapshot, classifyOfflineCapability } from "./offline";

describe("offline", () => {
  it("classifies offline-safe trip essentials and online-required live features", () => {
    expect(classifyOfflineCapability({ category: "trip_essentials", hasLocalData: true })).toMatchObject({
      status: "available",
      offlineSafe: true,
      freshness: "local"
    });

    expect(classifyOfflineCapability({ category: "weather", hasCurrentData: true })).toMatchObject({
      status: "available",
      offlineSafe: false,
      freshness: "current"
    });

    expect(classifyOfflineCapability({ category: "weather" })).toMatchObject({
      status: "online_required",
      offlineSafe: false,
      freshness: "unknown"
    });

    expect(classifyOfflineCapability({ category: "official_updates", hasCachedData: true })).toMatchObject({
      status: "stale",
      freshness: "cached"
    });

    expect(classifyOfflineCapability({ category: "translator", hasLocalData: true })).toMatchObject({
      status: "partially_available",
      offlineSafe: false
    });
  });

  it("builds an immutable offline trip snapshot without mutating the source", () => {
    const capabilities = [
      classifyOfflineCapability({ category: "trip_essentials", hasLocalData: true }),
      classifyOfflineCapability({ category: "weather" }),
      classifyOfflineCapability({ category: "verified_emergency_info", hasLocalData: true })
    ];
    const snapshot = buildOfflineTripSnapshot({
      tripId: "trip-1",
      tripName: "Lisbon",
      destinationLabel: "Lisbon, Portugal",
      startDate: "2026-09-10",
      endDate: "2026-09-14",
      selectedDayId: "day-1",
      selectedDayLabel: "Today",
      nextPlaceLabel: "Rossio Square",
      progress: {
        total: 3,
        visited: 1,
        skipped: 0,
        remaining: 2,
        completionPercent: 33
      },
      preparation: {
        readiness: "in_progress",
        completionPercent: 50
      },
      capabilities
    });

    expect(snapshot).toMatchObject({
      tripId: "trip-1",
      tripName: "Lisbon",
      destinationLabel: "Lisbon, Portugal",
      nextPlaceLabel: "Rossio Square",
      progress: { completionPercent: 33 },
      preparation: { readiness: "in_progress" }
    });
    expect(snapshot.capabilities).toEqual(capabilities);
    expect(snapshot.capabilities).not.toBe(capabilities);
    expect(snapshot.progress).not.toBe(snapshot.capabilities[0]);
  });
});
