import type { Page } from "@playwright/test";

const TRIP_DRAFTS_STORAGE_KEY = "fanatlas_trip_drafts_v1";
export const E2E_TRIP_NAME = "FanAtlas E2E Lisbon Trip";
export const E2E_JOURNAL_TITLE = "FanAtlas E2E Lisbon Arrival";
export const E2E_JOURNAL_BODY = "FanAtlas E2E private journal body for Lisbon validation only.";
export const E2E_VISITED_PLACE = "FanAtlas E2E Praca do Comercio";
export const E2E_PLANNED_PLACE = "FanAtlas E2E Belem Tower";
export const E2E_TODAY_NEXT_PLACE = "FanAtlas E2E Jeronimos Monastery";
export const E2E_TODAY_AFTERNOON_PLACE = "FanAtlas E2E LX Factory";

export async function seedSyntheticTripDraft(page: Page) {
  await page.addInitScript(({ key, state }) => {
    if (!window.localStorage.getItem(key)) {
      window.localStorage.setItem(key, JSON.stringify(state));
    }
  }, {
    key: TRIP_DRAFTS_STORAGE_KEY,
    state: syntheticTripDraftState()
  });
}

export async function writeSyntheticTripDraft(page: Page, name = E2E_TRIP_NAME) {
  await page.evaluate(({ key, state }) => {
    window.localStorage.setItem(key, JSON.stringify(state));
  }, {
    key: TRIP_DRAFTS_STORAGE_KEY,
    state: syntheticTripDraftState(name)
  });
}

export async function seedSyntheticTodayTripDraft(page: Page) {
  await page.addInitScript(({ key, state }) => {
    window.sessionStorage.setItem("fanatlas.tripDay.currentDate", "2026-08-21");
    if (!window.localStorage.getItem(key)) {
      window.localStorage.setItem(key, JSON.stringify(state));
    }
  }, {
    key: TRIP_DRAFTS_STORAGE_KEY,
    state: syntheticTodayTripDraftState()
  });
}

export function syntheticTripDraftState(name = E2E_TRIP_NAME) {
  const now = "2026-08-19T12:00:00.000Z";
  return {
    version: 1,
    drafts: [{
      id: "fanatlas-e2e-trip-lisbon",
      name,
      status: "planned",
      completionStatus: "completed",
      completedAt: "2026-06-10T12:00:00.000Z",
      destination: {
        label: "Lisbon, Portugal",
        countryCode: "PT",
        country: "Portugal",
        city: "Lisbon"
      },
      travelDates: {
        startDate: "2026-06-01",
        endDate: "2026-06-05"
      },
      planningActions: [{
        id: "fanatlas-e2e-action-1",
        text: "Review synthetic Lisbon itinerary",
        completed: true,
        createdAt: now
      }],
      itineraryDays: [{
        id: "fanatlas-e2e-day-1",
        title: "Lisbon arrival",
        order: 0,
        createdAt: now,
        updatedAt: now
      }],
      placeReferences: [
        {
          logicalPlaceId: E2E_VISITED_PLACE,
          persistedReferences: [{ storageSource: "unknown", persistedId: E2E_VISITED_PLACE, itemType: "landmark" }],
          addedAt: now,
          dayId: "fanatlas-e2e-day-1",
          timeBlock: "afternoon",
          planningNote: "Synthetic visited place note.",
          visitStatus: "visited",
          photoIds: ["fanatlas-e2e-photo-1"],
          order: 0
        },
        {
          logicalPlaceId: E2E_PLANNED_PLACE,
          persistedReferences: [{ storageSource: "unknown", persistedId: E2E_PLANNED_PLACE, itemType: "landmark" }],
          addedAt: now,
          dayId: "fanatlas-e2e-day-1",
          timeBlock: "evening",
          planningNote: "Synthetic planned place note.",
          visitStatus: "planned",
          photoIds: [],
          order: 1
        }
      ],
      journalEntries: [{
        id: "fanatlas-e2e-journal-1",
        title: E2E_JOURNAL_TITLE,
        body: E2E_JOURNAL_BODY,
        entryDate: "2026-06-01",
        itineraryDayId: "fanatlas-e2e-day-1",
        placeReferenceId: E2E_VISITED_PLACE,
        photoIds: ["fanatlas-e2e-photo-1"],
        mood: "joyful",
        favorite: true,
        status: "complete",
        createdAt: now,
        updatedAt: now
      }],
      createdAt: now,
      updatedAt: now
    }]
  };
}

export function syntheticTodayTripDraftState() {
  const now = "2026-08-19T12:00:00.000Z";
  return {
    version: 1,
    drafts: [{
      id: "fanatlas-e2e-trip-lisbon-today",
      name: E2E_TRIP_NAME,
      status: "planned",
      completionStatus: "active",
      destination: {
        label: "Lisbon, Portugal",
        countryCode: "PT",
        country: "Portugal",
        city: "Lisbon"
      },
      travelDates: {
        startDate: "2026-08-20",
        endDate: "2026-08-22"
      },
      planningActions: [{
        id: "fanatlas-e2e-action-1",
        text: "Review synthetic Lisbon itinerary",
        completed: false,
        createdAt: now
      }],
      itineraryDays: [
        {
          id: "fanatlas-e2e-day-1",
          title: "Lisbon arrival",
          order: 0,
          createdAt: now,
          updatedAt: now
        },
        {
          id: "fanatlas-e2e-day-2",
          title: "Lisbon today",
          order: 1,
          createdAt: now,
          updatedAt: now
        },
        {
          id: "fanatlas-e2e-day-3",
          title: "Lisbon finale",
          order: 2,
          createdAt: now,
          updatedAt: now
        }
      ],
      placeReferences: [
        {
          logicalPlaceId: E2E_VISITED_PLACE,
          persistedReferences: [{ storageSource: "unknown", persistedId: E2E_VISITED_PLACE, itemType: "landmark" }],
          addedAt: now,
          dayId: "fanatlas-e2e-day-2",
          timeBlock: "morning",
          planningNote: "Synthetic visited place note.",
          visitStatus: "visited",
          photoIds: ["fanatlas-e2e-photo-1"],
          order: 0
        },
        {
          logicalPlaceId: E2E_TODAY_NEXT_PLACE,
          persistedReferences: [{ storageSource: "unknown", persistedId: E2E_TODAY_NEXT_PLACE, itemType: "landmark" }],
          addedAt: now,
          dayId: "fanatlas-e2e-day-2",
          timeBlock: "morning",
          planningNote: "Synthetic planned place note.",
          visitStatus: "planned",
          photoIds: [],
          order: 1
        },
        {
          logicalPlaceId: E2E_TODAY_AFTERNOON_PLACE,
          persistedReferences: [{ storageSource: "unknown", persistedId: E2E_TODAY_AFTERNOON_PLACE, itemType: "market" }],
          addedAt: now,
          dayId: "fanatlas-e2e-day-2",
          timeBlock: "afternoon",
          visitStatus: "planned",
          photoIds: [],
          order: 2
        },
        {
          logicalPlaceId: E2E_PLANNED_PLACE,
          persistedReferences: [{ storageSource: "unknown", persistedId: E2E_PLANNED_PLACE, itemType: "landmark" }],
          addedAt: now,
          dayId: "unscheduled",
          visitStatus: "planned",
          photoIds: [],
          order: 3
        }
      ],
      journalEntries: [{
        id: "fanatlas-e2e-journal-1",
        title: E2E_JOURNAL_TITLE,
        body: E2E_JOURNAL_BODY,
        entryDate: "2026-08-21",
        itineraryDayId: "fanatlas-e2e-day-2",
        placeReferenceId: E2E_VISITED_PLACE,
        photoIds: ["fanatlas-e2e-photo-1"],
        mood: "joyful",
        favorite: true,
        status: "complete",
        createdAt: now,
        updatedAt: now
      }],
      createdAt: now,
      updatedAt: now
    }]
  };
}
