import { describe, expect, it } from "vitest";
import { createItineraryDayFixture, createPlaceReferenceFixture, createTripDraftFixture, cloneJson } from "../test/fixtures/tripDraftFixtures";
import { deriveDestinationIntelligence } from "./destinationIntelligence";
import { deriveTripDayExperience } from "./tripDay";
import {
  buildTripDayCurrencyRequest,
  buildTripDayLiveContextIdentity,
  buildTripDayOfficialUpdatesRequest,
  buildTripDayWeatherRequest,
  hasTripDayRouteDestination,
  resolveTripDayLiveContextDestination,
  resolveTripDayRouteDestination
} from "./tripDayLiveContext";

function trip() {
  return createTripDraftFixture({
    id: "trip-day-live-context",
    name: "Lisbon Today",
    destination: { label: "Lisbon, Portugal", countryCode: "PT", country: "Portugal", city: "Lisbon" },
    travelDates: { startDate: "2026-08-20", endDate: "2026-08-22" },
    itineraryDays: [
      createItineraryDayFixture({ id: "day-1", order: 0, title: "Arrival" }),
      createItineraryDayFixture({ id: "day-2", order: 1, title: "Today" })
    ],
    placeReferences: [
      createPlaceReferenceFixture({ logicalPlaceId: "next-stop", dayId: "day-2", timeBlock: "morning", visitStatus: "planned", order: 0 })
    ]
  });
}

describe("tripDayLiveContext", () => {
  it("derives stable identities and deterministic requests without mutation", () => {
    const baseTrip = trip();
    const before = cloneJson(baseTrip);
    const experience = deriveTripDayExperience({
      trips: [baseTrip],
      currentDate: new Date("2026-08-21T12:00:00.000Z")
    });
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [baseTrip] });

    const identity = buildTripDayLiveContextIdentity(experience);
    expect(identity).toEqual({
      tripId: "trip-day-live-context",
      dayId: "day-2",
      selectedDate: "2026-08-21",
      nextPlaceId: "next-stop"
    });

    const destination = resolveTripDayLiveContextDestination({ experience, intelligence });
    expect(destination?.label).toBe("Lisbon, Portugal");
    expect(destination?.countryCode).toBe("PT");

    const weatherRequest = buildTripDayWeatherRequest({ experience, destination, locale: "en", units: "metric" });
    expect(weatherRequest).toMatchObject({
      action: "weather",
      currentDate: "2026-08-21",
      locale: "en",
      units: "metric"
    });

    const currencyRequest = buildTripDayCurrencyRequest({
      experience,
      baseCurrency: "usd",
      targetCurrency: "eur",
      amount: 99.995,
      locale: "en"
    });
    expect(currencyRequest).toMatchObject({
      action: "currency",
      baseCurrency: "USD",
      targetCurrency: "EUR",
      amount: 100
    });

    const officialRequest = buildTripDayOfficialUpdatesRequest({
      experience,
      destination,
      locale: "en"
    });
    expect(officialRequest?.categories).toEqual(["advisory", "transport", "tourism"]);

    expect(baseTrip).toEqual(before);
  });

  it("resolves route context from the next planned place and preserves the distinction between route and schedule", () => {
    const baseTrip = trip();
    const experience = deriveTripDayExperience({
      trips: [baseTrip],
      savedPlaces: [
        {
          id: "next-stop",
          persistedId: "next-stop",
          storageSource: "unknown",
          storageReferences: [{ source: "unknown", persistedId: "next-stop", trust: "unknown" }],
          name: "Next stop",
          type: "attraction",
          trust: "unknown",
          lat: 38.707,
          lng: -9.136,
          hasCoordinates: true,
          isRoutable: false,
          original: {}
        }
      ],
      currentDate: new Date("2026-08-21T12:00:00.000Z")
    });

    expect(hasTripDayRouteDestination({ experience })).toBe(true);

    const routeDestination = resolveTripDayRouteDestination({ experience, selectedMapDestination: null });
    expect(routeDestination?.name).toMatch(/next stop/i);
    expect(routeDestination?.lat).toBe(38.707);
    expect(routeDestination?.lng).toBe(-9.136);
  });
});
