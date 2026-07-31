import { describe, expect, it } from "vitest";
import { deriveBounds, deriveTravelExplorer, validateExplorerCoordinate } from "./travelExplorer";
import { deriveTravelInsights } from "./travelInsights";
import { deriveTravelPassport } from "./travelPassport";
import {
  cloneJson,
  createItineraryDayFixture,
  createJournalEntryFixture,
  createPlaceReferenceFixture,
  createTripDraftFixture
} from "../test/fixtures/tripDraftFixtures";

function buildExplorer(trips = [createTripDraftFixture()]) {
  const passport = deriveTravelPassport(trips, { currentDate: "2026-07-30", generatedAt: "test" });
  const insights = deriveTravelInsights(trips, { currentDate: "2026-07-30", generatedAt: "test" });
  return deriveTravelExplorer({ trips, passport, insights, currentDate: "2026-07-30" });
}

describe("deriveTravelExplorer", () => {
  it("returns an empty derived Explorer without persistence data", () => {
    const explorer = buildExplorer([]);

    expect(explorer.summary.totalCountries).toBe(0);
    expect(explorer.countries).toEqual([]);
    expect(explorer.layers.visitedCountryIds).toEqual([]);
  });

  it("uses Passport visited eligibility and preserves planned destinations separately", () => {
    const completed = createTripDraftFixture({ id: "completed-trip" });
    const planned = createTripDraftFixture({
      id: "planned-trip",
      completionStatus: "draft",
      travelDates: { startDate: "2027-04-01", endDate: "2027-04-05" },
      placeReferences: [createPlaceReferenceFixture({ logicalPlaceId: "planned-place", visitStatus: "planned" })]
    });

    const passport = deriveTravelPassport([completed, planned], { currentDate: "2026-07-30", generatedAt: "test" });
    const explorer = buildExplorer([completed, planned]);

    expect(passport.summary.totalCountriesVisited).toBe(1);
    expect(explorer.summary.visitedCountries).toBe(1);
    expect(explorer.countries[0]).toMatchObject({
      countryCode: "MA",
      status: "visited",
      hasCompletedTrips: true,
      hasPlannedTrips: true
    });
  });

  it("keeps city identity scoped by country", () => {
    const morocco = createTripDraftFixture({
      id: "ma",
      destination: { label: "Casablanca, Morocco", countryCode: "MA", country: "Morocco", city: "Casablanca" }
    });
    const france = createTripDraftFixture({
      id: "fr",
      name: "Paris Journey",
      destination: { label: "Paris, France", countryCode: "FR", country: "France", city: "Paris" },
      placeReferences: [createPlaceReferenceFixture({ logicalPlaceId: "paris-place" })]
    });

    const explorer = buildExplorer([morocco, france]);

    expect(explorer.cities.map((city) => city.id).sort()).toEqual(["city:FR:paris", "city:MA:casablanca"]);
  });

  it("validates coordinates and reports unmapped trips", () => {
    const invalid = createTripDraftFixture({
      id: "unknown",
      destination: { label: "Unknown", country: "Atlantis", city: "Nowhere" },
      placeReferences: []
    });

    expect(validateExplorerCoordinate(91, 10)).toBeNull();
    expect(validateExplorerCoordinate(10, 181)).toBeNull();
    expect(validateExplorerCoordinate(0, 0)).toEqual({ latitude: 0, longitude: 0 });
    expect(validateExplorerCoordinate(Number.NaN, 10)).toBeNull();
    expect(validateExplorerCoordinate(Number.POSITIVE_INFINITY, 10)).toBeNull();
    expect(validateExplorerCoordinate("", "10")).toBeNull();
    expect(validateExplorerCoordinate("33.5731", "-7.5898")).toEqual({ latitude: 33.5731, longitude: -7.5898 });

    const explorer = buildExplorer([invalid]);
    expect(explorer.dataQuality.tripsWithoutMapPoints).toBe(1);
  });

  it("normalizes verified country aliases without duplicating country records", () => {
    const usCanonical = createTripDraftFixture({
      id: "us-canonical",
      destination: { label: "New York, United States", country: "United States", city: "New York" }
    });
    const usAlias = createTripDraftFixture({
      id: "us-alias",
      destination: { label: "New York, United States of America", country: "United States of America", city: "New York" }
    });
    const koreaAlias = createTripDraftFixture({
      id: "korea-alias",
      destination: { label: "Seoul, Republic of Korea", country: "Republic of Korea", city: "Seoul" },
      placeReferences: []
    });
    const czechAlias = createTripDraftFixture({
      id: "czech-alias",
      destination: { label: "Prague, Czech Republic", country: "Czech Republic", city: "Prague" },
      placeReferences: []
    });
    const ukAlias = createTripDraftFixture({
      id: "uk-alias",
      destination: { label: "London, UK", country: "UK", city: "London" },
      placeReferences: []
    });

    const explorer = buildExplorer([usCanonical, usAlias, koreaAlias, czechAlias, ukAlias]);

    expect(explorer.countries.filter((country) => country.countryCode === "US")).toHaveLength(1);
    expect(explorer.countries.map((country) => country.countryCode).sort()).toEqual(["CZ", "GB", "KR", "US"]);
  });

  it("keeps same-name city identities distinct when country context exists", () => {
    const france = createTripDraftFixture({
      id: "paris-fr",
      destination: { label: "Paris, France", countryCode: "FR", country: "France", city: "Paris" },
      placeReferences: []
    });
    const canada = createTripDraftFixture({
      id: "paris-ca",
      destination: { label: "Paris, Canada", countryCode: "CA", country: "Canada", city: "Paris" },
      placeReferences: []
    });

    const explorer = buildExplorer([france, canada]);

    expect(explorer.cities.map((city) => city.id).sort()).toEqual(["city:CA:paris", "city:FR:paris"]);
  });

  it("keeps antimeridian bounds meaningful for cross-Pacific coordinates", () => {
    const bounds = deriveBounds([
      { latitude: 35.6762, longitude: 139.6503 },
      { latitude: 21.3069, longitude: -157.8583 },
      { latitude: 34.0522, longitude: -118.2437 }
    ]);

    expect(bounds).toMatchObject({ north: 35.6762, south: 21.3069 });
    expect(bounds ? longitudeSpan(bounds) : 360).toBeLessThan(180);
  });

  it("derives deterministic route points and dedupes consecutive identical mapped points", () => {
    const trip = createTripDraftFixture({
      itineraryDays: [
        createItineraryDayFixture({ id: "day-1", order: 0 }),
        createItineraryDayFixture({ id: "day-2", order: 1 }),
        createItineraryDayFixture({ id: "day-3", order: 2 })
      ],
      placeReferences: [
        createPlaceReferenceFixture({ logicalPlaceId: "casablanca-1", dayId: "day-1", order: 0 }),
        createPlaceReferenceFixture({ logicalPlaceId: "casablanca-2", dayId: "day-1", order: 1 }),
        createPlaceReferenceFixture({ logicalPlaceId: "marrakech", dayId: "day-2", order: 0 }),
        createPlaceReferenceFixture({ logicalPlaceId: "casablanca-3", dayId: "day-3", order: 0 })
      ]
    });

    const explorer = buildExplorer([trip]);
    const route = explorer.routes[0];

    expect(route.points.map((point) => point.label)).toEqual(["Casablanca, Morocco"]);
    expect(route.segmentCount).toBe(0);
    expect(route.isComplete).toBe(false);
    expect(route.bounds).not.toBeNull();
    expect(explorer.years[0]).toMatchObject({ year: 2026, visitedCountryCount: 1 });
  });

  it("is deterministic and does not mutate source trips", () => {
    const trip = createTripDraftFixture({ journalEntries: [createJournalEntryFixture({ favorite: true })] });
    const before = cloneJson(trip);
    const first = buildExplorer([trip]);
    const second = buildExplorer([trip]);

    expect(first).toEqual(second);
    expect(trip).toEqual(before);
  });
});

function longitudeSpan(bounds: { east: number; west: number }) {
  return bounds.east >= bounds.west ? bounds.east - bounds.west : bounds.east + 360 - bounds.west;
}
