import { describe, expect, it } from "vitest";
import { deriveDestinationIntelligence } from "./destinationIntelligence";
import { createItineraryDayFixture, createPlaceReferenceFixture, createTripDraftFixture, cloneJson } from "../test/fixtures/tripDraftFixtures";
import { deriveTravelHome } from "./travelHome";

const CURRENT_DATE = new Date("2026-08-30T12:00:00.000Z");

function trip(overrides: Parameters<typeof createTripDraftFixture>[0] = {}) {
  return createTripDraftFixture({
    destination: { label: "Lisbon, Portugal", countryCode: "PT", country: "Portugal", city: "Lisbon" },
    itineraryDays: [
      createItineraryDayFixture({ id: "day-1", order: 0, title: "Day 1" }),
      createItineraryDayFixture({ id: "day-2", order: 1, title: "Day 2" }),
      createItineraryDayFixture({ id: "day-3", order: 2, title: "Day 3" }),
      createItineraryDayFixture({ id: "day-4", order: 3, title: "Day 4" }),
      createItineraryDayFixture({ id: "day-5", order: 4, title: "Day 5" })
    ],
    placeReferences: [
      createPlaceReferenceFixture({ logicalPlaceId: "Rossio Square", dayId: "day-2", timeBlock: "morning", order: 0, visitStatus: "visited" }),
      createPlaceReferenceFixture({ logicalPlaceId: "Lisbon Cathedral", dayId: "day-2", timeBlock: "morning", order: 1, visitStatus: "planned" }),
      createPlaceReferenceFixture({ logicalPlaceId: "Belém Tower", dayId: "day-2", timeBlock: "afternoon", order: 2, visitStatus: "planned" }),
      createPlaceReferenceFixture({ logicalPlaceId: "Alfama Walk", dayId: "day-2", timeBlock: "evening", order: 3, visitStatus: "planned" })
    ],
    ...overrides
  });
}

describe("deriveTravelHome", () => {
  it("derives the no-trip state and plan-trip actions", () => {
    const home = deriveTravelHome({
      trips: [],
      intelligence: deriveDestinationIntelligence({ tripDrafts: [] }),
      currentDate: CURRENT_DATE,
      connectivity: "online"
    });

    expect(home.state).toBe("no_trip");
    expect(home.primaryAction.labelKey).toBe("planTripSeconds");
    expect(home.secondaryActions.map((action) => action.labelKey)).toEqual([
      "travelPassport.title",
      "travelJournal.title",
      "travelExplorer.title",
      "travelTools"
    ]);
  });

  it("derives upcoming, approaching, and departure-day trip states deterministically", () => {
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [trip()] });
    expect(deriveTravelHome({
      trips: [trip({ travelDates: { startDate: "2026-09-12", endDate: "2026-09-15" } })],
      intelligence,
      currentDate: CURRENT_DATE
    }).state).toBe("planned_trip");
    expect(deriveTravelHome({
      trips: [trip({ travelDates: { startDate: "2026-09-03", endDate: "2026-09-06" } })],
      intelligence,
      currentDate: CURRENT_DATE
    }).state).toBe("approaching_trip");
    expect(deriveTravelHome({
      trips: [trip({ travelDates: { startDate: "2026-08-30", endDate: "2026-09-02" } })],
      intelligence,
      currentDate: CURRENT_DATE
    }).state).toBe("departure_day");
  });

  it("derives active, day-complete, ended, multiple, and undated trip states", () => {
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [trip()] });
    const active = deriveTravelHome({
      trips: [trip({ travelDates: { startDate: "2026-08-29", endDate: "2026-09-02" } })],
      intelligence,
      currentDate: CURRENT_DATE
    });
    expect(active.state).toBe("active_trip");
    expect(active.todaySummary?.nextPlaceLabel).toBe("Lisbon Cathedral");

    const dayComplete = deriveTravelHome({
      trips: [trip({
        travelDates: { startDate: "2026-08-29", endDate: "2026-09-02" },
        placeReferences: [
          createPlaceReferenceFixture({ logicalPlaceId: "Rossio Square", dayId: "day-2", order: 0, visitStatus: "visited" }),
          createPlaceReferenceFixture({ logicalPlaceId: "Lisbon Cathedral", dayId: "day-2", order: 1, visitStatus: "visited" })
        ]
      })],
      intelligence,
      currentDate: CURRENT_DATE
    });
    expect(dayComplete.state).toBe("day_complete");
    expect(dayComplete.primaryAction.labelKey).toBe("travelJournal.title");

    expect(deriveTravelHome({
      trips: [trip({ travelDates: { startDate: "2026-08-01", endDate: "2026-08-05" } })],
      intelligence,
      currentDate: CURRENT_DATE
    }).state).toBe("ended_trip");

    expect(deriveTravelHome({
      trips: [trip({ id: "a", travelDates: { startDate: "2026-09-10", endDate: "2026-09-12" } }), trip({ id: "b", travelDates: { startDate: "2026-09-20", endDate: "2026-09-22" } })],
      intelligence,
      currentDate: CURRENT_DATE
    }).state).toBe("multiple_trips");

    expect(deriveTravelHome({
      trips: [trip({ travelDates: undefined })],
      intelligence,
      currentDate: CURRENT_DATE
    }).state).toBe("undated_trip");
  });

  it("includes destination and offline summaries without mutating input", () => {
    const source = trip({ travelDates: { startDate: "2026-09-12", endDate: "2026-09-15" } });
    const before = cloneJson(source);
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [source] });
    const home = deriveTravelHome({
      trips: [source],
      intelligence,
      currentDate: CURRENT_DATE,
      connectivity: "offline"
    });

    expect(home.destinationSummary?.countryLabel).toBe("Portugal");
    expect(home.destinationSummary?.currencyCode).toBe("EUR");
    expect(home.offlineSummary.status).toBe("offline");
    expect(home.offlineSummary.messageKey).toBe("offlineTripEssentials");
    expect(source).toEqual(before);
    expect(deriveTravelHome({
      trips: [source],
      intelligence,
      currentDate: CURRENT_DATE,
      connectivity: "offline"
    })).toEqual(home);
  });
});
