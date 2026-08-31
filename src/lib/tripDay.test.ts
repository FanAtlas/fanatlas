import { describe, expect, it } from "vitest";
import { createItineraryDayFixture, createPlaceReferenceFixture, createTripDraftFixture, cloneJson } from "../test/fixtures/tripDraftFixtures";
import type { SavedPlace } from "./savedPlaces";
import type { TripDraft, TripTimeBlock } from "./tripDrafts";
import { deriveTripDayExperience, deriveTripDayExecutionState, resolveTripForDay } from "./tripDay";

const CURRENT_DATE = new Date("2026-08-21T12:00:00.000Z");

function day(id: string, order: number) {
  return createItineraryDayFixture({ id, order, title: `Day ${order + 1}` });
}

function place(logicalPlaceId: string, order: number, dayId: string, timeBlock?: TripTimeBlock, visitStatus: "planned" | "visited" | "skipped" = "planned") {
  return createPlaceReferenceFixture({
    logicalPlaceId,
    dayId,
    timeBlock,
    visitStatus,
    order,
    planningNote: logicalPlaceId === "morning-2" ? "Book timed entry." : undefined,
    photoIds: logicalPlaceId === "visited-1" ? ["photo-private-id"] : []
  });
}

function trip(overrides: Partial<TripDraft> = {}) {
  return createTripDraftFixture({
    id: "active-trip",
    name: "Lisbon Today",
    status: "planned",
    completionStatus: "active",
    travelDates: { startDate: "2026-08-20", endDate: "2026-08-24" },
    itineraryDays: [day("day-1", 0), day("day-2", 1), day("day-3", 2), day("day-4", 3), day("day-5", 4)],
    placeReferences: [
      place("visited-1", 0, "day-2", "morning", "visited"),
      place("morning-2", 1, "day-2", "morning", "planned"),
      place("afternoon-1", 2, "day-2", "afternoon", "planned"),
      place("evening-1", 3, "day-2", "evening", "skipped"),
      place("unassigned-today", 4, "day-2", undefined, "planned"),
      place("global-unscheduled", 5, "unscheduled", undefined, "planned")
    ],
    ...overrides
  });
}

function saved(logicalPlaceId: string, lat = 38.707, lng = -9.136): SavedPlace {
  return {
    id: logicalPlaceId,
    persistedId: logicalPlaceId,
    storageSource: "unknown",
    storageReferences: [{ source: "unknown", persistedId: logicalPlaceId, trust: "unknown" }],
    name: `Place ${logicalPlaceId}`,
    type: "attraction",
    trust: "unknown",
    lat,
    lng,
    hasCoordinates: true,
    isRoutable: false,
    original: {}
  };
}

describe("deriveTripDayExperience", () => {
  it("resolves before, first, middle, final, after, and undated day states from an injected date", () => {
    const base = trip();
    expect(deriveTripDayExperience({ trips: [base], currentDate: new Date("2026-08-19T12:00:00.000Z") }).state).toBe("before_trip");
    expect(deriveTripDayExperience({ trips: [base], currentDate: new Date("2026-08-20T12:00:00.000Z") }).dayIndex).toBe(0);
    expect(deriveTripDayExperience({ trips: [base], currentDate: CURRENT_DATE }).dayIndex).toBe(1);
    expect(deriveTripDayExperience({ trips: [base], currentDate: new Date("2026-08-24T12:00:00.000Z") }).dayIndex).toBe(4);
    expect(deriveTripDayExperience({ trips: [base], selectedTripId: base.id, currentDate: new Date("2026-08-25T12:00:00.000Z") }).state).toBe("trip_ended");
    expect(deriveTripDayExperience({ trips: [trip({ travelDates: undefined })], selectedTripId: "active-trip", currentDate: CURRENT_DATE }).state).toBe("undated");
  });

  it("handles fewer and extra itinerary days with an explicit date/day mismatch notice", () => {
    const fewerDays = trip({ itineraryDays: [day("day-1", 0), day("day-2", 1)] });
    const fewerExperience = deriveTripDayExperience({ trips: [fewerDays], currentDate: new Date("2026-08-23T12:00:00.000Z") });
    expect(fewerExperience.selectedDay?.id).toBe("day-2");
    expect(fewerExperience.state).toBe("past_day");
    expect(fewerExperience.notices.map((notice) => notice.id)).toContain("date_day_mismatch");

    const extraDays = trip({ travelDates: { startDate: "2026-08-20", endDate: "2026-08-21" } });
    const extraExperience = deriveTripDayExperience({ trips: [extraDays], selectedTripId: "active-trip", selectedDayId: "day-5", currentDate: CURRENT_DATE });
    expect(extraExperience.state).toBe("future_day");
    expect(extraExperience.notices.map((notice) => notice.id)).toContain("date_day_mismatch");
  });

  it("derives today's sections, progress, next item, notes, photos, and unscheduled distinction without mutation", () => {
    const base = trip();
    const before = cloneJson(base);
    const experience = deriveTripDayExperience({
      trips: [base],
      savedPlaces: [
        saved("visited-1"),
        saved("morning-2", 38.7071, -9.1361),
        saved("afternoon-1", 38.7072, -9.1362),
        saved("evening-1"),
        saved("unassigned-today"),
        saved("global-unscheduled")
      ],
      currentDate: CURRENT_DATE
    });

    expect(experience.sections.map((section) => section.id)).toEqual(["unassigned", "morning", "afternoon", "evening"]);
    expect(experience.sections.find((section) => section.id === "morning")?.places.map((item) => item.logicalPlaceId)).toEqual(["visited-1", "morning-2"]);
    expect(experience.sections.find((section) => section.id === "unassigned")?.places.map((item) => item.logicalPlaceId)).toEqual(["unassigned-today"]);
    expect(experience.unscheduled.map((item) => item.logicalPlaceId)).toEqual(["global-unscheduled"]);
    expect(experience.progress).toEqual({ total: 5, visited: 1, skipped: 1, remaining: 3, completionPercent: 20 });
    expect(experience.nextItem?.place.logicalPlaceId).toBe("morning-2");
    expect(experience.nextItem?.sectionId).toBe("morning");
    expect(experience.nextItem?.place.planningNote).toBe("Book timed entry.");
    expect(experience.sections.find((section) => section.id === "morning")?.places[0].photoCount).toBe(1);
    expect(experience.nearbyGroups.length).toBeGreaterThan(0);
    expect(base).toEqual(before);
  });

  it("excludes visited and skipped places from what's next and respects time-block order", () => {
    const base = trip({
      placeReferences: [
        place("morning-visited", 0, "day-2", "morning", "visited"),
        place("morning-skipped", 1, "day-2", "morning", "skipped"),
        place("afternoon-next", 2, "day-2", "afternoon", "planned"),
        place("evening-later", 3, "day-2", "evening", "planned")
      ]
    });
    const experience = deriveTripDayExperience({ trips: [base], currentDate: CURRENT_DATE });
    expect(experience.nextItem?.place.logicalPlaceId).toBe("afternoon-next");
  });

  it("derives execution state for current, later, completed, skipped, unscheduled, and completion status without mutation", () => {
    const base = trip({
      placeReferences: [
        place("visited-1", 0, "day-2", "morning", "visited"),
        place("planned-1", 1, "day-2", "morning", "planned"),
        place("planned-2", 2, "day-2", "afternoon", "planned"),
        place("skipped-1", 3, "day-2", "evening", "skipped"),
        place("global-unscheduled", 4, "unscheduled")
      ]
    });
    const before = cloneJson(base);
    const experience = deriveTripDayExperience({ trips: [base], currentDate: CURRENT_DATE });
    const execution = deriveTripDayExecutionState(experience.sections, experience.unscheduled, experience.progress);

    expect(execution.currentPlace?.logicalPlaceId).toBe("planned-1");
    expect(execution.nextPlace?.logicalPlaceId).toBe("planned-1");
    expect(execution.laterPlaces.map((place) => place.logicalPlaceId)).toEqual(["planned-2"]);
    expect(execution.completedPlaces.map((place) => place.logicalPlaceId)).toEqual(["visited-1"]);
    expect(execution.skippedPlaces.map((place) => place.logicalPlaceId)).toEqual(["skipped-1"]);
    expect(execution.unscheduledPlaces.map((place) => place.logicalPlaceId)).toEqual(["global-unscheduled"]);
    expect(execution.currentBlock).toBe("morning");
    expect(execution.nextBlock).toBe("afternoon");
    expect(execution.dayComplete).toBe(false);
    expect(base).toEqual(before);

    const completeExperience = deriveTripDayExperience({
      trips: [trip({
        placeReferences: [
          place("visited-1", 0, "day-2", "morning", "visited"),
          place("skipped-1", 1, "day-2", "morning", "skipped")
        ]
      })],
      currentDate: CURRENT_DATE
    });
    expect(completeExperience.execution.dayComplete).toBe(true);
  });
});

describe("resolveTripForDay", () => {
  it("selects one active trip, then nearest upcoming trip, and does not silently choose past or undated drafts", () => {
    const active = trip({ id: "active", name: "Active" });
    const upcoming = trip({ id: "upcoming", name: "Upcoming", travelDates: { startDate: "2026-09-01", endDate: "2026-09-03" } });
    const past = trip({ id: "past", name: "Past", travelDates: { startDate: "2026-07-01", endDate: "2026-07-03" } });
    const undated = trip({ id: "undated", name: "Undated", travelDates: undefined });

    expect(resolveTripForDay([active, upcoming], "2026-08-21").trip?.id).toBe("active");
    expect(resolveTripForDay([upcoming, past], "2026-08-21").trip?.id).toBe("upcoming");
    const unresolved = resolveTripForDay([past, undated], "2026-08-21");
    expect(unresolved.selectionState).toBe("none");
    expect(unresolved.trip).toBeNull();
    expect(unresolved.candidates.map((candidate) => candidate.id)).toEqual(["past", "undated"]);
  });

  it("requires explicit selection when trips overlap", () => {
    const result = resolveTripForDay([trip({ id: "one" }), trip({ id: "two" })], "2026-08-21");
    expect(result.selectionState).toBe("multiple_active");
    expect(result.trip).toBeNull();
    expect(result.candidates.map((candidate) => candidate.id)).toEqual(["one", "two"]);
  });
});
