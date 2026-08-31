import { describe, expect, it } from "vitest";
import { deriveTravelExplorer } from "./travelExplorer";
import { deriveTravelInsights } from "./travelInsights";
import { deriveTravelPassport } from "./travelPassport";
import { buildSafeAIContextSnapshot } from "./fanAtlasAISerialization";
import { cloneJson, createJournalEntryFixture, createPlaceReferenceFixture, createTripDraftFixture } from "../test/fixtures/tripDraftFixtures";

describe("FanAtlas AI context serialization", () => {
  it("builds a minimized safe snapshot without Journal body or photo IDs", () => {
    const trip = createTripDraftFixture({
      id: "trip-secret",
      name: "Private Trip Title",
      placeReferences: [
        createPlaceReferenceFixture({ photoIds: ["PHOTO_SECRET_ID"] }),
        createPlaceReferenceFixture({ logicalPlaceId: "place-2", photoIds: ["PHOTO_SECRET_ID", "photo-2"], visitStatus: "planned" })
      ],
      journalEntries: [
        createJournalEntryFixture({ body: "JOURNAL_BODY_SECRET", photoIds: ["PHOTO_SECRET_ID"], favorite: true })
      ]
    });
    const before = cloneJson(trip);
    const passport = deriveTravelPassport([trip], { currentDate: "2026-07-30", generatedAt: "test" });
    const insights = deriveTravelInsights([trip], { currentDate: "2026-07-30", generatedAt: "test" });
    const explorer = deriveTravelExplorer({ trips: [trip], passport, insights, currentDate: "2026-07-30" });

    const snapshot = buildSafeAIContextSnapshot({ trip, passport, insights, explorer });
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.activeTrip).toMatchObject({
      id: "trip-secret",
      title: "Private Trip Title",
      destinationLabel: "Casablanca, Morocco",
      itineraryDayCount: 1,
      journalEntryCount: 1,
      photoCount: 2
    });
    expect(serialized).not.toContain("JOURNAL_BODY_SECRET");
    expect(serialized).not.toContain("PHOTO_SECRET_ID");
    expect(trip).toEqual(before);
  });
});
