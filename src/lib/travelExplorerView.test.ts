import { describe, expect, it } from "vitest";
import { deriveTravelExplorer } from "./travelExplorer";
import { deriveTravelInsights } from "./travelInsights";
import { deriveTravelPassport } from "./travelPassport";
import {
  buildTravelReplaySteps,
  filterTravelExplorer,
  getCountryTravelDays,
  getFrequencyLevel,
  getTripTravelDays,
  projectExplorerCoordinate,
  sortExplorerCountries,
  sortExplorerTrips
} from "./travelExplorerView";
import { cloneJson, createTripDraftFixture } from "../test/fixtures/tripDraftFixtures";

function buildExplorer() {
  const trips = [
    createTripDraftFixture({
      id: "morocco-2025",
      name: "Morocco Return",
      travelDates: { startDate: "2025-05-01", endDate: "2025-05-04" }
    }),
    createTripDraftFixture({
      id: "morocco-2026",
      name: "Casablanca Journey",
      travelDates: { startDate: "2026-01-10", endDate: "2026-01-12" }
    }),
    createTripDraftFixture({
      id: "france-2027",
      name: "Paris Plan",
      completionStatus: "draft",
      completedAt: undefined,
      destination: { label: "Paris, France", countryCode: "FR", country: "France", city: "Paris" },
      travelDates: { startDate: "2027-06-01", endDate: "2027-06-03" }
    })
  ];
  const passport = deriveTravelPassport(trips, { currentDate: "2026-07-30", generatedAt: "test" });
  const insights = deriveTravelInsights(trips, { currentDate: "2026-07-30", generatedAt: "test" });
  return { trips, explorer: deriveTravelExplorer({ trips, passport, insights, currentDate: "2026-07-30" }) };
}

describe("travelExplorerView", () => {
  it("filters countries, cities, trips and routes consistently by status, year and search", () => {
    const { explorer } = buildExplorer();

    const morocco2026 = filterTravelExplorer(explorer, { search: "casa", status: "visited", year: 2026 });
    expect(morocco2026.countries.map((country) => country.countryCode)).toEqual(["MA"]);
    expect(morocco2026.cities.map((city) => city.cityName)).toEqual(["Casablanca"]);
    expect(morocco2026.trips.map((trip) => trip.id)).toEqual(["morocco-2026"]);

    const planned = filterTravelExplorer(explorer, { search: "paris", status: "planned", year: null });
    expect(planned.countries.map((country) => country.countryCode)).toEqual(["FR"]);
    expect(planned.trips.map((trip) => trip.id)).toEqual(["france-2027"]);
  });

  it("sorts without mutating source arrays and uses deterministic tie-breaks", () => {
    const { explorer } = buildExplorer();
    const before = cloneJson(explorer.countries);

    const sorted = sortExplorerCountries(explorer.countries, "mostVisited");

    expect(sorted[0].countryCode).toBe("MA");
    expect(explorer.countries).toEqual(before);
  });

  it("keeps shortest-trip sorting date-safe and puts undated trips after eligible durations", () => {
    const { explorer } = buildExplorer();
    const undated = {
      ...explorer.trips[0],
      id: "undated",
      title: "Undated",
      startDate: null,
      endDate: null
    };

    const sorted = sortExplorerTrips([...explorer.trips, undated], "shortest");

    expect(sorted[0] ? getTripTravelDays(sorted[0]) : 0).toBeGreaterThan(0);
    expect(sorted.slice(0, -1).every((trip) => trip.startDate && trip.endDate)).toBe(true);
    expect(sorted[sorted.length - 1].id).toBe("undated");
  });

  it("derives replay steps chronologically and keeps travel-day math inclusive", () => {
    const { explorer } = buildExplorer();

    const steps = buildTravelReplaySteps(explorer, null);
    const longest = sortExplorerTrips(explorer.trips, "longest")[0];
    const morocco = explorer.countries.find((country) => country.countryCode === "MA");

    expect(steps.map((step) => step.tripId)).toEqual(["morocco-2025", "morocco-2026", "france-2027"]);
    expect(longest.id).toBe("morocco-2025");
    expect(morocco ? getCountryTravelDays(morocco, explorer.trips) : 0).toBe(7);
  });

  it("projects known map coordinates into the SVG viewport without RTL-dependent state", () => {
    expect(projectExplorerCoordinate({ latitude: 90, longitude: -180 })).toEqual({ x: 0, y: 0 });
    expect(projectExplorerCoordinate({ latitude: 0, longitude: 0 })).toEqual({ x: 360, y: 180 });
    expect(projectExplorerCoordinate({ latitude: -90, longitude: 180 })).toEqual({ x: 720, y: 360 });
  });

  it("uses explicit frequency buckets without hidden scoring", () => {
    expect(getFrequencyLevel(0)).toBe("none");
    expect(getFrequencyLevel(1)).toBe("one");
    expect(getFrequencyLevel(3)).toBe("some");
    expect(getFrequencyLevel(6)).toBe("many");
    expect(getFrequencyLevel(7)).toBe("frequent");
  });

  it("does not search journal body text through Explorer view filters", () => {
    const trips = [
      createTripDraftFixture({
        id: "private-journal-trip",
        journalEntries: [{
          id: "journal-private",
          title: "Safe title",
          body: "EXPLORER_PRIVATE_BODY_TOKEN",
          entryDate: "2026-01-11",
          itineraryDayId: "day-1",
          placeReferenceId: "place-1",
          photoIds: ["PRIVATE_PHOTO_ID_TOKEN"],
          favorite: true,
          status: "complete",
          createdAt: "2026-01-15T12:00:00.000Z",
          updatedAt: "2026-01-15T12:00:00.000Z"
        }]
      })
    ];
    const passport = deriveTravelPassport(trips, { currentDate: "2026-07-30", generatedAt: "test" });
    const insights = deriveTravelInsights(trips, { currentDate: "2026-07-30", generatedAt: "test" });
    const explorer = deriveTravelExplorer({ trips, passport, insights, currentDate: "2026-07-30" });

    const privateBodyResults = filterTravelExplorer(explorer, { search: "EXPLORER_PRIVATE_BODY_TOKEN", status: "all", year: null });
    const privatePhotoResults = filterTravelExplorer(explorer, { search: "PRIVATE_PHOTO_ID_TOKEN", status: "all", year: null });

    expect(privateBodyResults.trips).toEqual([]);
    expect(privatePhotoResults.trips).toEqual([]);
  });
});
