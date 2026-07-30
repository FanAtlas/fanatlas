import type { TripDraft, TripDraftPlaceReference, TripDraftsState, TripItineraryDay } from "../../lib/tripDrafts";
import type { TripJournalEntry } from "../../lib/tripJournalTypes";

export const FIXED_NOW = "2026-01-15T12:00:00.000Z";

export function createItineraryDayFixture(overrides: Partial<TripItineraryDay> = {}): TripItineraryDay {
  return {
    id: "day-1",
    title: "Day 1",
    order: 0,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
  };
}

export function createPlaceReferenceFixture(overrides: Partial<TripDraftPlaceReference> = {}): TripDraftPlaceReference {
  return {
    logicalPlaceId: "place-1",
    persistedReferences: [{ storageSource: "unknown", persistedId: "place-1", itemType: "museum" }],
    addedAt: FIXED_NOW,
    dayId: "day-1",
    visitStatus: "visited",
    photoIds: ["photo-1"],
    order: 0,
    ...overrides
  };
}

export function createJournalEntryFixture(overrides: Partial<TripJournalEntry> = {}): TripJournalEntry {
  return {
    id: "journal-1",
    title: "Arrival notes",
    body: "A quiet first day with a memorable walk.",
    entryDate: "2026-01-10",
    itineraryDayId: "day-1",
    placeReferenceId: "place-1",
    photoIds: ["photo-1"],
    favorite: false,
    status: "draft",
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
  };
}

export function createTripDraftFixture(overrides: Partial<TripDraft> = {}): TripDraft {
  const itineraryDays = overrides.itineraryDays || [createItineraryDayFixture()];
  const placeReferences = overrides.placeReferences || [createPlaceReferenceFixture()];
  return {
    id: "trip-1",
    name: "Casablanca Journey",
    status: "planned",
    completionStatus: "completed",
    completedAt: "2026-01-20T12:00:00.000Z",
    destination: {
      label: "Casablanca, Morocco",
      countryCode: "MA",
      country: "Morocco",
      city: "Casablanca"
    },
    travelDates: {
      startDate: "2026-01-10",
      endDate: "2026-01-12"
    },
    planningActions: [{ id: "action-1", text: "Reserve train", completed: false, createdAt: FIXED_NOW }],
    itineraryDays,
    placeReferences,
    journalEntries: overrides.journalEntries || [],
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
  };
}

export function createTripDraftsStateFixture(drafts: TripDraft[] = [createTripDraftFixture()]): TripDraftsState {
  return { version: 1, drafts };
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
