import { describe, expect, it } from "vitest";
import { deriveDestinationIntelligence } from "./destinationIntelligence";
import {
  deriveDestinationHubView,
  destinationPath,
  fieldDisplayState,
  parseDestinationIdFromPath,
  resolveDestinationId,
  searchDestinations
} from "./destinationHub";
import { deriveTravelPassport } from "./travelPassport";
import { deriveTravelExplorer } from "./travelExplorer";
import { deriveTravelInsights } from "./travelInsights";
import type { TripDraft } from "./tripDrafts";

const trip: TripDraft = {
  id: "trip-1",
  name: "FanAtlas Lisbon Trip SECRET_NOT_VISIBLE",
  status: "planned",
  completionStatus: "completed",
  completedAt: "2026-06-05",
  destination: { label: "Lisbon, Portugal", city: "Lisbon", country: "Portugal", countryCode: "PT" },
  travelDates: { startDate: "2026-06-01", endDate: "2026-06-05" },
  itineraryDays: [],
  placeReferences: [{
    logicalPlaceId: "place-1",
    persistedReferences: [],
    addedAt: "2026-06-01T00:00:00.000Z",
    dayId: "unscheduled",
    visitStatus: "visited",
    order: 0,
    photoIds: ["photo-secret-id"]
  }],
  journalEntries: [{
    id: "journal-1",
    title: "Lisbon note",
    body: "PRIVATE JOURNAL BODY MUST NOT SURFACE",
    status: "complete",
    favorite: false,
    placeReferenceId: "place-1",
    photoIds: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z"
  }],
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z"
};

describe("Destination Hub view model", () => {
  it("parses and builds private destination paths without exposing raw ids in labels", () => {
    expect(destinationPath("city:PT:lisbon")).toBe("/destination/city%3APT%3Alisbon");
    expect(parseDestinationIdFromPath("/destination/city%3APT%3Alisbon")).toBe("city:PT:lisbon");
    expect(parseDestinationIdFromPath("/passport")).toBeNull();
  });

  it("resolves countries and cities through canonical destination identity", () => {
    expect(resolveDestinationId({ country: "Portugal" })).toBe("country:PT");
    expect(resolveDestinationId({ city: "Lisboa", countryCode: "PT" })).toBe("city:PT:lisbon");
    expect(resolveDestinationId({ label: "Unknown Free Text" })).toBeNull();
  });

  it("derives country and city hub views with personal counts but no private body content", () => {
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [trip] });
    const passport = deriveTravelPassport([trip], { currentDate: "2026-08-19" });
    const insights = deriveTravelInsights([trip], { currentDate: "2026-08-19" });
    const explorer = deriveTravelExplorer({ trips: [trip], passport, insights, currentDate: "2026-08-19" });

    const country = deriveDestinationHubView({ destinationId: "country:PT", intelligence, passport, explorer, drafts: [trip] });
    expect(country.type).toBe("country");
    expect(country.title).toBe("Portugal");
    expect(country.personal.status).toBe("visited");
    expect(country.personal.visitedPlaces).toBeGreaterThan(0);

    const city = deriveDestinationHubView({ destinationId: "city:PT:lisbon", intelligence, passport, explorer, drafts: [trip] });
    expect(city.type).toBe("city");
    expect(city.title).toBe("Lisbon");
    expect(city.subtitle).toBe("Portugal");
    expect(city.personal.journalEntryCount).toBeGreaterThan(0);
    expect(JSON.stringify(city)).not.toContain("PRIVATE JOURNAL BODY");
    expect(JSON.stringify(city)).not.toContain("photo-secret-id");
  });

  it("supports local destination search without network data", () => {
    const intelligence = deriveDestinationIntelligence();
    const results = searchDestinations(intelligence, "lisbon");
    expect(results.some((result) => result.id === "city:PT:lisbon")).toBe(true);
    expect(searchDestinations(intelligence, "PT").some((result) => result.id === "country:PT")).toBe(true);
    expect(searchDestinations(intelligence, "not-a-real-local-destination")).toEqual([]);
  });

  it("keeps sparse and high-stakes fields visibly conservative", () => {
    const intelligence = deriveDestinationIntelligence();
    const view = deriveDestinationHubView({ destinationId: "country:AF", intelligence });
    expect(view.country?.entry.informationClass).toBe("HIGH_STAKES_CURRENT_INFORMATION");
    expect(fieldDisplayState(view.country!.entry)).toBe("current_required");
    expect(fieldDisplayState(view.country!.capital)).toBe("not_available");
  });
});
