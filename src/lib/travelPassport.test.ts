import { describe, expect, it } from "vitest";
import { deriveTravelPassport } from "./travelPassport";
import { duplicateTripDraft, normalizeTripDraft } from "./tripDrafts";
import {
  cloneJson,
  createItineraryDayFixture,
  createJournalEntryFixture,
  createPlaceReferenceFixture,
  createTripDraftFixture,
  createTripDraftsStateFixture
} from "../test/fixtures/tripDraftFixtures";

describe("deriveTravelPassport", () => {
  it("returns an empty passport for no trips", () => {
    const passport = deriveTravelPassport([], { currentDate: "2026-07-30", generatedAt: "test" });

    expect(passport.summary.totalTripsCompleted).toBe(0);
    expect(passport.summary.totalCountriesVisited).toBe(0);
    expect(passport.countries).toEqual([]);
    expect(passport.timeline).toEqual([]);
  });

  it("includes completed trips and visited places only", () => {
    const completed = createTripDraftFixture({
      placeReferences: [
        createPlaceReferenceFixture({ logicalPlaceId: "visited", visitStatus: "visited", photoIds: ["photo-1", "photo-1"] }),
        createPlaceReferenceFixture({ logicalPlaceId: "planned", visitStatus: "planned", photoIds: ["photo-2"] }),
        createPlaceReferenceFixture({ logicalPlaceId: "skipped", visitStatus: "skipped", photoIds: ["photo-3"] })
      ]
    });
    const plannedTrip = createTripDraftFixture({
      id: "trip-2",
      completionStatus: "draft",
      travelDates: { startDate: "2027-01-01", endDate: "2027-01-03" }
    });

    const passport = deriveTravelPassport([completed, plannedTrip], { currentDate: "2026-07-30", generatedAt: "test" });

    expect(passport.summary.totalTripsCompleted).toBe(1);
    expect(passport.summary.totalVisitedPlaces).toBe(1);
    expect(passport.summary.totalMemories).toBe(1);
    expect(passport.places).toHaveLength(1);
    expect(passport.places[0].placeReferenceId).toBe("visited");
  });

  it("aggregates repeated countries and cities deterministically", () => {
    const first = createTripDraftFixture({ id: "trip-a", name: "A", travelDates: { startDate: "2026-01-01", endDate: "2026-01-02" } });
    const second = createTripDraftFixture({ id: "trip-b", name: "B", travelDates: { startDate: "2026-02-01", endDate: "2026-02-03" } });

    const passport = deriveTravelPassport([second, first], { currentDate: "2026-07-30", generatedAt: "test" });

    expect(passport.countries).toHaveLength(1);
    expect(passport.countries[0].countryCode).toBe("MA");
    expect(passport.countries[0].tripCount).toBe(2);
    expect(passport.cities).toHaveLength(1);
    expect(passport.cities[0].tripCount).toBe(2);
    expect(passport.timeline.map((trip) => trip.tripDraftId)).toEqual(["trip-b", "trip-a"]);
  });

  it("builds yearly summaries and achievements", () => {
    const trip = createTripDraftFixture({
      travelDates: { startDate: "2026-03-08", endDate: "2026-03-08" },
      placeReferences: [
        createPlaceReferenceFixture({ logicalPlaceId: "dup", visitStatus: "visited", photoIds: ["photo-1"] }),
        createPlaceReferenceFixture({ logicalPlaceId: "dup", visitStatus: "visited", photoIds: ["photo-2"] })
      ]
    });

    const passport = deriveTravelPassport([trip], { currentDate: "2026-07-30", generatedAt: "test" });

    expect(passport.summary.totalTravelDays).toBe(1);
    expect(passport.yearlySummaries[0]).toMatchObject({ year: 2026, completedTripCount: 1, travelDayCount: 1 });
    expect(passport.achievements.find((achievement) => achievement.id === "first_journey")?.completed).toBe(true);
  });
});

describe("duplicateTripDraft", () => {
  it("resets completion, visit, photos, and journal entries while preserving planning data", () => {
    const state = createTripDraftsStateFixture([
      createTripDraftFixture({
        itineraryDays: [createItineraryDayFixture()],
        journalEntries: [createJournalEntryFixture()],
        placeReferences: [createPlaceReferenceFixture({ planningNote: "Bring notebook", photoIds: ["photo-1"], visitStatus: "visited" })]
      })
    ]);

    const result = duplicateTripDraft(state, "trip-1", { name: "Copy" });

    expect(result.ok).toBe(true);
    const copy = result.value?.draft;
    expect(copy?.completionStatus).toBe("draft");
    expect(copy?.completedAt).toBeUndefined();
    expect(copy?.journalEntries).toEqual([]);
    expect(copy?.placeReferences[0].visitStatus).toBeUndefined();
    expect(copy?.placeReferences[0].photoIds).toEqual([]);
    expect(copy?.placeReferences[0].planningNote).toBe("Bring notebook");
    expect(copy?.planningActions?.[0].text).toBe("Reserve train");
  });

  it("does not mutate the source state", () => {
    const state = createTripDraftsStateFixture();
    const before = cloneJson(state);

    duplicateTripDraft(state, "trip-1", { name: "Copy" });

    expect(state).toEqual(before);
  });
});

describe("normalizeTripDraft", () => {
  it("removes duplicate place references during backward-compatible normalization", () => {
    const draft = createTripDraftFixture({
      placeReferences: [
        createPlaceReferenceFixture({ logicalPlaceId: "same-place", order: 0 }),
        createPlaceReferenceFixture({ logicalPlaceId: "same-place", order: 1 })
      ]
    });

    const normalized = normalizeTripDraft(draft);

    expect(normalized?.placeReferences).toHaveLength(1);
    expect(normalized?.placeReferences[0].logicalPlaceId).toBe("same-place");
  });
});
