import { describe, expect, it } from "vitest";
import { deriveTravelInsights } from "./travelInsights";
import {
  cloneJson,
  createJournalEntryFixture,
  createPlaceReferenceFixture,
  createTripDraftFixture
} from "../test/fixtures/tripDraftFixtures";

describe("deriveTravelInsights", () => {
  it("returns deterministic empty insights", () => {
    const insights = deriveTravelInsights([], { currentDate: "2026-07-30" });

    expect(insights.summary.totalTrips).toBe(0);
    expect(insights.summary.completedTrips).toBe(0);
    expect(insights.countryInsights).toEqual([]);
    expect(insights.monthInsights).toHaveLength(12);
  });

  it("derives completed historical metrics without planned-trip inflation", () => {
    const completed = createTripDraftFixture({
      id: "completed",
      travelDates: { startDate: "2026-07-01", endDate: "2026-07-03" },
      journalEntries: [createJournalEntryFixture({ id: "journal-a", favorite: true, status: "complete", body: "A favorite moment." })]
    });
    const planned = createTripDraftFixture({
      id: "planned",
      completionStatus: "draft",
      travelDates: { startDate: "2027-07-01", endDate: "2027-07-03" }
    });

    const insights = deriveTravelInsights([completed, planned], { currentDate: "2026-07-30" });

    expect(insights.summary.totalTrips).toBe(2);
    expect(insights.summary.completedTrips).toBe(1);
    expect(insights.summary.plannedTrips).toBe(1);
    expect(insights.summary.travelDays).toBe(3);
    expect(insights.summary.favoriteMoments).toBe(1);
    expect(insights.tripInsights).toHaveLength(1);
  });

  it("aggregates countries, cities, return visits, journals, and photos", () => {
    const first = createTripDraftFixture({
      id: "trip-a",
      name: "First Morocco",
      travelDates: { startDate: "2026-01-01", endDate: "2026-01-01" },
      placeReferences: [createPlaceReferenceFixture({ logicalPlaceId: "place-a", photoIds: ["photo-1"] })],
      journalEntries: [createJournalEntryFixture({ id: "journal-a", favorite: true })]
    });
    const second = createTripDraftFixture({
      id: "trip-b",
      name: "Second Morocco",
      travelDates: { startDate: "2027-02-01", endDate: "2027-02-02" },
      placeReferences: [createPlaceReferenceFixture({ logicalPlaceId: "place-b", photoIds: ["photo-2", "photo-2"] })],
      journalEntries: [createJournalEntryFixture({ id: "journal-b", body: "Second memory" })]
    });

    const insights = deriveTravelInsights([first, second], { currentDate: "2027-07-30" });

    expect(insights.countryInsights[0]).toMatchObject({ countryCode: "MA", tripCount: 2, returnVisits: 1, journalEntryCount: 2 });
    expect(insights.cityInsights[0]).toMatchObject({ tripCount: 2, journalEntryCount: 2 });
    expect(insights.photoInsights.totalPhotos).toBe(2);
    expect(insights.travelPatterns.streaks.longestConsecutiveYearStreak).toBe(2);
  });

  it("groups month, season, and years using date-only values", () => {
    const trip = createTripDraftFixture({
      travelDates: { startDate: "2026-03-08", endDate: "2026-03-08" }
    });

    const insights = deriveTravelInsights([trip], { currentDate: "2026-07-30" });

    expect(insights.monthInsights.find((month) => month.month === 3)?.tripCount).toBe(1);
    expect(insights.seasonInsights.find((season) => season.season === "spring")?.tripCount).toBe(1);
    expect(insights.yearlyActivity[0]).toMatchObject({ year: 2026, tripCount: 1, travelDayCount: 1 });
  });

  it("tracks data quality and does not mutate inputs", () => {
    const trip = createTripDraftFixture({
      destination: { label: "Unknown" },
      travelDates: { startDate: "2026-12-31", endDate: "2026-01-01" },
      placeReferences: [createPlaceReferenceFixture({ logicalPlaceId: "dup" }), createPlaceReferenceFixture({ logicalPlaceId: "dup" })]
    });
    const before = cloneJson(trip);

    const first = deriveTravelInsights([trip], { currentDate: "2026-07-30" });
    const second = deriveTravelInsights([trip], { currentDate: "2026-07-30" });

    expect(first).toEqual(second);
    expect(first.dataQuality.invalidDateRangeCount).toBe(1);
    expect(first.dataQuality.duplicateReferenceCount).toBe(0);
    expect(trip).toEqual(before);
  });
});
