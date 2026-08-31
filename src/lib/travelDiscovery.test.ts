import { describe, expect, it } from "vitest";
import { deriveDestinationIntelligence } from "./destinationIntelligence";
import { deriveTravelDiscovery } from "./travelDiscovery";
import { createTripDraftFixture } from "../test/fixtures/tripDraftFixtures";

function buildIntelligence() {
  const trips = [
    createTripDraftFixture({
      id: "lisbon-trip",
      destination: { label: "Lisbon, Portugal", countryCode: "PT", country: "Portugal", city: "Lisbon" },
      travelDates: { startDate: "2026-09-01", endDate: "2026-09-04" }
    }),
    createTripDraftFixture({
      id: "toronto-trip",
      destination: { label: "Toronto, Canada", countryCode: "CA", country: "Canada", city: "Toronto" },
      travelDates: { startDate: "2026-06-11", endDate: "2026-06-14" }
    })
  ];
  return deriveDestinationIntelligence({ tripDrafts: trips, generatedAt: "test" });
}

describe("deriveTravelDiscovery", () => {
  it("keeps fallback travel location from resolving a destination", () => {
    const discovery = deriveTravelDiscovery({
      travelLocation: {
        destinationCity: "Lisbon",
        destinationCountry: "Portugal",
        locationSource: "fallback"
      },
      intelligence: buildIntelligence(),
      currentDate: new Date("2026-08-30T12:00:00.000Z")
    });

    expect(discovery.destination).toBeNull();
    expect(discovery.hasResolvedDestination).toBe(false);
    expect(discovery.sections.map((section) => section.id)).not.toContain("world_cup");
  });

  it("resolves explicit destination context and exposes stable categories", () => {
    const discovery = deriveTravelDiscovery({
      destinationReference: { city: "Lisbon", country: "Portugal" },
      intelligence: buildIntelligence(),
      currentDate: new Date("2026-08-30T12:00:00.000Z"),
      connectivity: "offline"
    });

    expect(discovery.destination?.destinationLabel).toContain("Lisbon");
    expect(discovery.hasResolvedDestination).toBe(true);
    expect(discovery.sections.map((section) => section.id)).toEqual([
      "places",
      "food",
      "stays",
      "transport",
      "events",
      "travel_tools"
    ]);
    expect(discovery.sections.find((section) => section.id === "events")?.availability).toBe("online_required");
    expect(discovery.sections.find((section) => section.id === "places")?.availability).toBe("available");
  });

  it("enables the World Cup section only for eligible destination and date context", () => {
    const eligible = deriveTravelDiscovery({
      destinationId: "city:CA:toronto",
      intelligence: buildIntelligence(),
      currentDate: new Date("2026-06-13T12:00:00.000Z")
    });
    const ineligible = deriveTravelDiscovery({
      destinationId: "city:PT:lisbon",
      intelligence: buildIntelligence(),
      currentDate: new Date("2026-06-13T12:00:00.000Z")
    });

    expect(eligible.worldCup.eligible).toBe(true);
    expect(eligible.sections.map((section) => section.id)).toContain("world_cup");
    expect(eligible.worldCup.matchCount).toBeGreaterThan(0);
    expect(ineligible.worldCup.eligible).toBe(false);
    expect(ineligible.sections.map((section) => section.id)).not.toContain("world_cup");
  });

  it("is deterministic and does not mutate inputs", () => {
    const intelligence = buildIntelligence();
    const snapshot = structuredClone(intelligence);

    const first = deriveTravelDiscovery({
      destinationId: "city:CA:toronto",
      intelligence,
      currentDate: new Date("2026-06-13T12:00:00.000Z"),
      favoriteTeam: "Canada"
    });
    const second = deriveTravelDiscovery({
      destinationId: "city:CA:toronto",
      intelligence,
      currentDate: new Date("2026-06-13T12:00:00.000Z"),
      favoriteTeam: "Canada"
    });

    expect(first).toEqual(second);
    expect(intelligence).toEqual(snapshot);
    expect(JSON.stringify(first)).not.toContain("trip-1");
  });
});
