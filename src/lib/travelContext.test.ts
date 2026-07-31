import { describe, expect, it } from "vitest";
import { deriveTravelExplorer } from "./travelExplorer";
import { deriveTravelInsights } from "./travelInsights";
import { deriveTravelPassport } from "./travelPassport";
import { buildTravelContext, createTravelIntelligenceRequest, summarizeTravelContext, trimTravelContext } from "./travelContext";
import { createJournalEntryFixture, createTripDraftFixture, cloneJson } from "../test/fixtures/tripDraftFixtures";

const SECRET_BODY = "SECRET_JOURNAL_BODY_53";
const SECRET_PHOTO_ID = "SECRET_PHOTO_ID_53";

function buildSources() {
  const trips = [
    createTripDraftFixture({
      id: "trip-context",
      name: "Private Kyoto Plan",
      destination: { label: "Kyoto, Japan", countryCode: "JP", country: "Japan", city: "Kyoto" },
      travelDates: { startDate: "2026-03-08", endDate: "2026-03-10" },
      placeReferences: [
        {
          logicalPlaceId: "kyoto-shrine",
          persistedReferences: [{ storageSource: "unknown", persistedId: "kyoto-shrine", itemType: "landmark" }],
          addedAt: "2026-01-01T00:00:00.000Z",
          dayId: "day-1",
          visitStatus: "visited",
          photoIds: [SECRET_PHOTO_ID],
          order: 0
        }
      ],
      journalEntries: [
        createJournalEntryFixture({
          id: "journal-secret",
          title: "Quiet arrival",
          body: SECRET_BODY,
          favorite: true,
          status: "complete",
          photoIds: [SECRET_PHOTO_ID]
        })
      ]
    }),
    createTripDraftFixture({
      id: "unrelated-trip",
      name: "Unrelated Lisbon Trip",
      destination: { label: "Lisbon, Portugal", countryCode: "PT", country: "Portugal", city: "Lisbon" }
    })
  ];
  const passport = deriveTravelPassport(trips, { currentDate: "2026-07-30", generatedAt: "test" });
  const insights = deriveTravelInsights(trips, { currentDate: "2026-07-30" });
  const explorer = deriveTravelExplorer({ trips, passport, insights, currentDate: "2026-07-30" });
  return { trips, passport, insights, explorer };
}

describe("buildTravelContext", () => {
  it("excludes journal body, photo IDs, and unrelated trips by default", () => {
    const sources = buildSources();
    const request = createTravelIntelligenceRequest({
      id: "request-1",
      task: "trip_planning",
      scope: ["selected_trip", "journal_metadata", "memory_metadata"],
      userIntent: {
        normalizedIntent: "plan my trip",
        task: "trip_planning",
        urgency: "normal",
        destinationIds: [],
        tripIds: ["trip-context"],
        requestedOutput: "plain_text",
        requiresCurrentInformation: false,
        requiresUserPrivateContext: true,
        requiresExternalTools: false
      },
      permissions: {
        allowCurrentTrip: true,
        allowJournalMetadata: true,
        allowMemoryMetadata: true
      }
    });

    const context = buildTravelContext({ request, ...sources });
    const serialized = JSON.stringify(context);

    expect(context.trip?.id).toBe("trip-context");
    expect(serialized).not.toContain(SECRET_BODY);
    expect(serialized).not.toContain(SECRET_PHOTO_ID);
    expect(serialized).not.toContain("Unrelated Lisbon Trip");
    expect(context.memories?.photoCount).toBe(1);
  });

  it("includes journal body only for compatible task with explicit permission and sensitive context", () => {
    const sources = buildSources();
    const denied = buildTravelContext({
      request: createTravelIntelligenceRequest({
        id: "request-2",
        task: "trip_reflection",
        scope: ["selected_trip", "journal_content"],
        userIntent: {
          normalizedIntent: "reflect",
          task: "trip_reflection",
          urgency: "normal",
          destinationIds: [],
          tripIds: ["trip-context"],
          requestedOutput: "plain_text",
          requiresCurrentInformation: false,
          requiresUserPrivateContext: true,
          requiresExternalTools: false
        },
        permissions: { allowCurrentTrip: true, allowJournalMetadata: true, allowJournalContent: true }
      }),
      ...sources
    });
    const allowed = buildTravelContext({
      request: createTravelIntelligenceRequest({
        id: "request-3",
        task: "trip_reflection",
        scope: ["selected_trip", "journal_content"],
        userIntent: {
          normalizedIntent: "reflect",
          task: "trip_reflection",
          urgency: "normal",
          destinationIds: [],
          tripIds: ["trip-context"],
          requestedOutput: "plain_text",
          requiresCurrentInformation: false,
          requiresUserPrivateContext: true,
          requiresExternalTools: false
        },
        permissions: { allowCurrentTrip: true, allowJournalMetadata: true, allowJournalContent: true },
        constraints: {
          usagePolicy: {
            mode: "balanced",
            maxCostClass: "medium",
            maxToolCalls: 2,
            allowFallback: true,
            allowExternalResearch: false,
            allowImageAnalysis: false,
            allowDocumentAnalysis: false
          },
          maxContextCharacters: 8000,
          allowSensitiveContext: true,
          allowHighStakesWithoutCurrentInfo: false
        }
      }),
      ...sources
    });

    expect(JSON.stringify(denied)).not.toContain(SECRET_BODY);
    expect(JSON.stringify(allowed)).toContain(SECRET_BODY);
    expect(allowed.privacy.includesSensitiveData).toBe(true);
  });

  it("reduces precise location unless emergency context explicitly allows it", () => {
    const sources = buildSources();
    const baseLocation = { precision: "precise" as const, countryCode: "US", city: "New York", latitude: 40.7128, longitude: -74.006 };
    const request = createTravelIntelligenceRequest({
      id: "request-4",
      task: "trip_planning",
      scope: ["current_location"],
      permissions: { allowCurrentLocation: true }
    });

    const context = buildTravelContext({ request, currentLocation: baseLocation, ...sources });

    expect(context.location).toEqual({ precision: "city", countryCode: "US", city: "New York" });
    expect(JSON.stringify(context)).not.toContain("-74.006");
    expect(context.warnings.map((warning) => warning.code)).toContain("location_precision_reduced");
  });

  it("trims optional memory and saved-place context before core trip context", () => {
    const sources = buildSources();
    const request = createTravelIntelligenceRequest({
      id: "request-5",
      task: "trip_planning",
      scope: ["selected_trip", "saved_places", "memory_metadata"],
      userIntent: {
        normalizedIntent: "plan",
        task: "trip_planning",
        urgency: "normal",
        destinationIds: [],
        tripIds: ["trip-context"],
        requestedOutput: "plain_text",
        requiresCurrentInformation: false,
        requiresUserPrivateContext: true,
        requiresExternalTools: false
      },
      permissions: { allowCurrentTrip: true, allowSavedPlaces: true, allowMemoryMetadata: true }
    });
    const context = buildTravelContext({ request, ...sources, savedPlaces: [] });
    const trimmed = trimTravelContext(context, 400);

    expect(trimmed.trip?.id).toBe("trip-context");
    expect(trimmed.memories).toBeUndefined();
  });

  it("is deterministic and does not mutate source data", () => {
    const sources = buildSources();
    const before = cloneJson(sources.trips);
    const request = createTravelIntelligenceRequest({
      id: "request-6",
      task: "travel_summary",
      scope: ["selected_trip", "passport_history", "travel_insights"],
      userIntent: {
        normalizedIntent: "summary",
        task: "travel_summary",
        urgency: "normal",
        destinationIds: [],
        tripIds: ["trip-context"],
        requestedOutput: "plain_text",
        requiresCurrentInformation: false,
        requiresUserPrivateContext: true,
        requiresExternalTools: false
      },
      permissions: { allowCurrentTrip: true, allowPassport: true, allowInsights: true }
    });

    const first = buildTravelContext({ request, ...sources });
    const second = buildTravelContext({ request, ...sources });

    expect(first).toEqual(second);
    expect(summarizeTravelContext(first)).toMatchObject({ hasTrip: true, hasTravelHistory: true });
    expect(sources.trips).toEqual(before);
  });
});
