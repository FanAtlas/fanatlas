import { describe, expect, it } from "vitest";
import {
  attachJournalPhotoId,
  createTripJournalEntry,
  deriveTripStory,
  normalizeTripJournalEntry,
  removePhotoIdFromTripDraftMetadata,
  searchTripJournalEntries,
  TRIP_JOURNAL_PHOTO_LIMIT,
  updateTripJournalEntryValue
} from "./tripJournal";
import {
  cloneJson,
  createJournalEntryFixture,
  createPlaceReferenceFixture,
  createTripDraftFixture,
  FIXED_NOW
} from "../test/fixtures/tripDraftFixtures";

describe("trip journal domain", () => {
  it("normalizes valid entries and removes invalid optional values", () => {
    const entry = normalizeTripJournalEntry({
      ...createJournalEntryFixture(),
      mood: "unknown",
      status: "published",
      entryDate: "2026-99-01",
      photoIds: ["a", "a", "", "b"]
    }, {
      validDayIds: new Set(["day-1"]),
      validPlaceReferenceIds: new Set(["place-1"])
    });

    expect(entry?.mood).toBeUndefined();
    expect(entry?.status).toBe("draft");
    expect(entry?.entryDate).toBeUndefined();
    expect(entry?.photoIds).toEqual(["a", "b"]);
  });

  it("rejects empty body entries", () => {
    const entry = normalizeTripJournalEntry({ ...createJournalEntryFixture(), body: "   " });

    expect(entry).toBeNull();
  });

  it("creates and updates entries with deterministic timestamps", () => {
    const draft = createTripDraftFixture();
    const created = createTripJournalEntry({ body: "A saved memory", favorite: true, status: "complete" }, { id: "journal-new", now: FIXED_NOW, draft });

    expect(created).toMatchObject({ id: "journal-new", body: "A saved memory", favorite: true, status: "complete", createdAt: FIXED_NOW, updatedAt: FIXED_NOW });

    const updated = updateTripJournalEntryValue(created!, { title: " Updated title " }, { now: "2026-01-16T12:00:00.000Z", draft });
    expect(updated?.title).toBe("Updated title");
    expect(updated?.createdAt).toBe(FIXED_NOW);
    expect(updated?.updatedAt).toBe("2026-01-16T12:00:00.000Z");
  });

  it("caps journal photos while preserving first occurrence order", () => {
    const ids = Array.from({ length: TRIP_JOURNAL_PHOTO_LIMIT + 3 }, (_, index) => `photo-${index}`);

    const next = ids.reduce((photoIds, photoId) => attachJournalPhotoId(photoIds, photoId), [] as string[]);

    expect(next).toHaveLength(TRIP_JOURNAL_PHOTO_LIMIT);
    expect(next[0]).toBe("photo-0");
  });

  it("derives trip stories chronologically with favorites and summaries", () => {
    const draft = createTripDraftFixture({
      journalEntries: [
        createJournalEntryFixture({ id: "later", entryDate: "2026-01-12", favorite: true, status: "complete" }),
        createJournalEntryFixture({ id: "earlier", entryDate: "2026-01-10", favorite: false, status: "draft" })
      ]
    });

    const story = deriveTripStory({ tripDraft: draft });

    expect(story.entries.map((entry) => entry.id)).toEqual(["earlier", "later"]);
    expect(story.favoriteEntries.map((entry) => entry.id)).toEqual(["later"]);
    expect(story.summary).toMatchObject({ totalEntries: 2, completedEntries: 1, draftEntries: 1, favoriteEntries: 1 });
  });

  it("searches title, body, date, place, and mood locally", () => {
    const story = deriveTripStory({
      tripDraft: createTripDraftFixture({
        journalEntries: [createJournalEntryFixture({ title: "Market walk", mood: "reflective" })]
      }),
      unavailablePlaceLabel: "Place unavailable"
    });

    expect(searchTripJournalEntries(story.entries, "market")).toHaveLength(1);
    expect(searchTripJournalEntries(story.entries, "reflective")).toHaveLength(1);
    expect(searchTripJournalEntries(story.entries, "no-match")).toHaveLength(0);
  });

  it("removes a permanently deleted photo from places and journals without mutating source", () => {
    const draft = createTripDraftFixture({
      placeReferences: [createPlaceReferenceFixture({ photoIds: ["photo-1", "photo-2"] })],
      journalEntries: [createJournalEntryFixture({ photoIds: ["photo-1", "photo-3"] })]
    });
    const before = cloneJson(draft);

    const next = removePhotoIdFromTripDraftMetadata(draft, "photo-1");

    expect(next.placeReferences[0].photoIds).toEqual(["photo-2"]);
    expect(next.journalEntries?.[0].photoIds).toEqual(["photo-3"]);
    expect(draft).toEqual(before);
  });
});
