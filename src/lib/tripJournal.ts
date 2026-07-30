import type { SavedPlace } from "./savedPlaces";
import type { TripDraft, TripItineraryDay } from "./tripDrafts";
import type {
  CreateTripJournalEntryInput,
  TripDraftPhotoReferences,
  TripJournalDataQuality,
  TripJournalEntry,
  TripJournalEntryStatus,
  TripJournalMood,
  TripJournalSummary,
  TripStory,
  TripStoryEntry,
  UpdateTripJournalEntryInput
} from "./tripJournalTypes";

export const TRIP_JOURNAL_TITLE_MAX_LENGTH = 120;
export const TRIP_JOURNAL_BODY_MAX_LENGTH = 20000;
export const TRIP_JOURNAL_PHOTO_LIMIT = 20;

const VALID_MOODS: readonly TripJournalMood[] = ["joyful", "peaceful", "excited", "grateful", "reflective", "surprised", "tired", "challenging"];
const VALID_STATUSES: readonly TripJournalEntryStatus[] = ["draft", "complete"];

export function emptyTripJournalDataQuality(): TripJournalDataQuality {
  return {
    entriesProcessed: 0,
    invalidEntriesRemoved: 0,
    invalidDatesRemoved: 0,
    staleDayLinksRemoved: 0,
    stalePlaceLinksRemoved: 0,
    duplicatePhotoIdsRemoved: 0,
    invalidMoodValuesRemoved: 0
  };
}

export function normalizeTripJournalEntries(
  value: unknown,
  context: { validDayIds?: ReadonlySet<string>; validPlaceReferenceIds?: ReadonlySet<string> } = {},
  quality: TripJournalDataQuality = emptyTripJournalDataQuality()
): TripJournalEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const entries: TripJournalEntry[] = [];
  value.forEach((item) => {
    const entry = normalizeTripJournalEntry(item, context, quality);
    if (!entry || seen.has(entry.id)) {
      quality.invalidEntriesRemoved += 1;
      return;
    }
    seen.add(entry.id);
    quality.entriesProcessed += 1;
    entries.push(entry);
  });
  return entries;
}

export function normalizeTripJournalEntry(
  value: unknown,
  context: { validDayIds?: ReadonlySet<string>; validPlaceReferenceIds?: ReadonlySet<string> } = {},
  quality: TripJournalDataQuality = emptyTripJournalDataQuality()
): TripJournalEntry | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record.id);
  const body = normalizeJournalBody(record.body);
  const createdAt = validIsoString(record.createdAt);
  const updatedAt = validIsoString(record.updatedAt) || createdAt;
  if (!id || !body || !createdAt || !updatedAt) return null;

  const entryDate = normalizeJournalDate(record.entryDate);
  if (record.entryDate && !entryDate) quality.invalidDatesRemoved += 1;
  const itineraryDayId = normalizeLinkedId(record.itineraryDayId, context.validDayIds);
  if (record.itineraryDayId && !itineraryDayId) quality.staleDayLinksRemoved += 1;
  const placeReferenceId = normalizeLinkedId(record.placeReferenceId, context.validPlaceReferenceIds);
  if (record.placeReferenceId && !placeReferenceId) quality.stalePlaceLinksRemoved += 1;
  const mood = normalizeTripJournalMood(record.mood);
  if (record.mood && !mood) quality.invalidMoodValuesRemoved += 1;
  const photoResult = normalizeJournalPhotoIdsWithReport(record.photoIds);
  quality.duplicatePhotoIdsRemoved += photoResult.removedCount;

  return {
    id,
    title: normalizeJournalTitle(record.title),
    body,
    entryDate,
    itineraryDayId,
    placeReferenceId,
    photoIds: photoResult.photoIds,
    mood,
    favorite: typeof record.favorite === "boolean" ? record.favorite : false,
    status: normalizeTripJournalStatus(record.status),
    createdAt,
    updatedAt
  };
}

export function createTripJournalEntry(input: CreateTripJournalEntryInput, options: { id: string; now: string; draft: TripDraft }): TripJournalEntry | null {
  const now = validIsoString(options.now);
  const id = readString(options.id);
  if (!id || !now) return null;
  return normalizeTripJournalEntry({
    id,
    title: input.title,
    body: input.body,
    entryDate: input.entryDate,
    itineraryDayId: input.itineraryDayId,
    placeReferenceId: input.placeReferenceId,
    photoIds: input.photoIds,
    mood: input.mood,
    favorite: input.favorite === true,
    status: input.status || "draft",
    createdAt: now,
    updatedAt: now
  }, tripJournalLinkContext(options.draft));
}

export function updateTripJournalEntryValue(entry: TripJournalEntry, patch: Omit<UpdateTripJournalEntryInput, "entryId">, options: { now: string; draft: TripDraft }): TripJournalEntry | null {
  const candidate = {
    ...entry,
    title: patch.title === null ? undefined : patch.title ?? entry.title,
    body: patch.body ?? entry.body,
    entryDate: patch.entryDate === null ? undefined : patch.entryDate ?? entry.entryDate,
    itineraryDayId: patch.itineraryDayId === null ? undefined : patch.itineraryDayId ?? entry.itineraryDayId,
    placeReferenceId: patch.placeReferenceId === null ? undefined : patch.placeReferenceId ?? entry.placeReferenceId,
    photoIds: patch.photoIds ?? entry.photoIds,
    mood: patch.mood === null ? undefined : patch.mood ?? entry.mood,
    favorite: patch.favorite ?? entry.favorite,
    status: patch.status ?? entry.status,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  };
  const normalized = normalizeTripJournalEntry(candidate, tripJournalLinkContext(options.draft));
  if (!normalized) return null;
  if (sameJournalEntry(entry, normalized)) return entry;
  return { ...normalized, updatedAt: validIsoString(options.now) || entry.updatedAt };
}

export function removeTripJournalEntryById(entries: readonly TripJournalEntry[], entryId: string) {
  const id = readString(entryId);
  const removed = entries.find((entry) => entry.id === id);
  return {
    removed,
    entries: removed ? entries.filter((entry) => entry.id !== id) : [...entries]
  };
}

export function normalizeJournalTitle(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const title = value.replace(/\r\n?/g, "\n").replace(/\s*\n+\s*/g, " ").trim().replace(/[ \t]+/g, " ");
  return title && title.length <= TRIP_JOURNAL_TITLE_MAX_LENGTH ? title : undefined;
}

export function normalizeJournalBody(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const body = value.replace(/\r\n?/g, "\n").replace(/^\s+|\s+$/g, "");
  return body && body.length <= TRIP_JOURNAL_BODY_MAX_LENGTH ? body : undefined;
}

export function normalizeTripJournalMood(value: unknown): TripJournalMood | undefined {
  return VALID_MOODS.includes(value as TripJournalMood) ? value as TripJournalMood : undefined;
}

export function normalizeTripJournalStatus(value: unknown): TripJournalEntryStatus {
  return VALID_STATUSES.includes(value as TripJournalEntryStatus) ? value as TripJournalEntryStatus : "draft";
}

export function normalizeJournalPhotoIds(value: unknown): string[] {
  return normalizeJournalPhotoIdsWithReport(value).photoIds;
}

export function attachJournalPhotoId(photoIds: readonly string[] | undefined, photoId: string) {
  return normalizeJournalPhotoIds([...(photoIds || []), photoId]);
}

export function removeJournalPhotoId(photoIds: readonly string[] | undefined, photoId: string) {
  const id = readString(photoId);
  return normalizeJournalPhotoIds((photoIds || []).filter((item) => item !== id));
}

export function removePhotoIdFromAllJournalEntries(entries: readonly TripJournalEntry[] | undefined, photoId: string): TripJournalEntry[] {
  const id = readString(photoId);
  if (!id) return entries ? [...entries] : [];
  return (entries || []).map((entry) => {
    const nextPhotoIds = removeJournalPhotoId(entry.photoIds, id);
    return nextPhotoIds.length === (entry.photoIds || []).length ? { ...entry } : { ...entry, photoIds: nextPhotoIds };
  });
}

export function collectJournalPhotoIds(entries: readonly TripJournalEntry[] | undefined) {
  return new Set((entries || []).flatMap((entry) => normalizeJournalPhotoIds(entry.photoIds)));
}

export function collectTripDraftPhotoReferences(draft: TripDraft): TripDraftPhotoReferences {
  const placePhotoIds = new Set(draft.placeReferences.flatMap((reference) => normalizeJournalPhotoIds(reference.photoIds)));
  const journalPhotoIds = collectJournalPhotoIds(draft.journalEntries);
  return {
    placePhotoIds,
    journalPhotoIds,
    allPhotoIds: new Set([...placePhotoIds, ...journalPhotoIds])
  };
}

export function removePhotoIdFromTripDraftMetadata(draft: TripDraft, photoId: string): TripDraft {
  const id = readString(photoId);
  if (!id) return cloneDraftJournalOnly(draft);
  return {
    ...draft,
    placeReferences: draft.placeReferences.map((reference) => ({
      ...reference,
      photoIds: normalizeJournalPhotoIds(reference.photoIds).filter((item) => item !== id)
    })),
    journalEntries: removePhotoIdFromAllJournalEntries(draft.journalEntries, id)
  };
}

export function unlinkJournalEntriesFromDay(entries: readonly TripJournalEntry[] | undefined, dayId: string, updatedAt?: string) {
  const id = readString(dayId);
  return (entries || []).map((entry) => entry.itineraryDayId === id ? { ...entry, itineraryDayId: undefined, updatedAt: updatedAt || entry.updatedAt } : { ...entry });
}

export function unlinkJournalEntriesFromPlace(entries: readonly TripJournalEntry[] | undefined, placeReferenceId: string, updatedAt?: string) {
  const id = readString(placeReferenceId);
  return (entries || []).map((entry) => entry.placeReferenceId === id ? { ...entry, placeReferenceId: undefined, updatedAt: updatedAt || entry.updatedAt } : { ...entry });
}

export function deriveTripStory(input: {
  tripDraft: TripDraft;
  savedPlaces?: readonly SavedPlace[];
  unavailablePlaceLabel?: string;
}): TripStory {
  const draft = input.tripDraft;
  const placesById = new Map((input.savedPlaces || []).map((place) => [place.id, place]));
  const dayById = new Map(draft.itineraryDays.map((day) => [day.id, day]));
  const referenceById = new Map(draft.placeReferences.map((reference) => [reference.logicalPlaceId, reference]));
  const entries = normalizeTripJournalEntries(draft.journalEntries, tripJournalLinkContext(draft))
    .map((entry): TripStoryEntry => {
      const day = entry.itineraryDayId ? dayById.get(entry.itineraryDayId) : undefined;
      const reference = entry.placeReferenceId ? referenceById.get(entry.placeReferenceId) : undefined;
      const place = reference ? placesById.get(reference.logicalPlaceId) : undefined;
      return {
        ...entry,
        photoIds: normalizeJournalPhotoIds(entry.photoIds),
        itineraryDayLabel: day ? formatDayLabel(day) : undefined,
        itineraryDayDate: day ? itineraryDayDate(draft, day) : undefined,
        placeName: place?.name || (reference ? input.unavailablePlaceLabel || "Place unavailable" : undefined),
        unavailableDay: Boolean(entry.itineraryDayId && !day),
        unavailablePlace: Boolean(entry.placeReferenceId && !reference)
      };
    })
    .sort((left, right) => compareStoryEntries(left, right, draft));
  const summary = deriveTripJournalSummary(entries);
  return {
    tripDraftId: draft.id,
    title: draft.name,
    dateRange: draft.travelDates ? { ...draft.travelDates } : undefined,
    entries,
    favoriteEntries: entries.filter((entry) => entry.favorite),
    summary,
    totalEntries: summary.totalEntries,
    completedEntries: summary.completedEntries,
    draftEntries: summary.draftEntries,
    totalPhotoReferences: summary.totalPhotoReferences
  };
}

export function deriveTripJournalSummary(entries: readonly TripJournalEntry[]): TripJournalSummary {
  const entryDates = entries.flatMap((entry) => entry.entryDate && isValidDateOnly(entry.entryDate) ? [entry.entryDate] : []).sort(compareDateOnly);
  return {
    totalEntries: entries.length,
    draftEntries: entries.filter((entry) => entry.status === "draft").length,
    completedEntries: entries.filter((entry) => entry.status === "complete").length,
    favoriteEntries: entries.filter((entry) => entry.favorite).length,
    linkedPlaces: new Set(entries.flatMap((entry) => entry.placeReferenceId ? [entry.placeReferenceId] : [])).size,
    linkedDays: new Set(entries.flatMap((entry) => entry.itineraryDayId ? [entry.itineraryDayId] : [])).size,
    totalPhotoReferences: entries.reduce((sum, entry) => sum + normalizeJournalPhotoIds(entry.photoIds).length, 0),
    firstEntryDate: entryDates[0],
    mostRecentEntryDate: entryDates[entryDates.length - 1]
  };
}

export function searchTripJournalEntries(entries: readonly TripStoryEntry[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [...entries];
  return entries.filter((entry) => [
    entry.title,
    entry.body,
    entry.entryDate,
    entry.placeName,
    entry.mood
  ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)));
}

export function tripJournalLinkContext(draft: TripDraft) {
  return {
    validDayIds: new Set(draft.itineraryDays.map((day) => day.id)),
    validPlaceReferenceIds: new Set(draft.placeReferences.map((reference) => reference.logicalPlaceId))
  };
}

function normalizeJournalPhotoIdsWithReport(value: unknown): { photoIds: string[]; removedCount: number } {
  if (!Array.isArray(value)) return { photoIds: [], removedCount: 0 };
  const seen = new Set<string>();
  const photoIds: string[] = [];
  let removedCount = 0;
  for (const item of value) {
    const id = readString(item);
    if (!id || seen.has(id) || photoIds.length >= TRIP_JOURNAL_PHOTO_LIMIT) {
      removedCount += 1;
      continue;
    }
    seen.add(id);
    photoIds.push(id);
  }
  return { photoIds, removedCount };
}

function normalizeJournalDate(value: unknown): string | undefined {
  return isValidDateOnly(value) ? value : undefined;
}

function normalizeLinkedId(value: unknown, validIds?: ReadonlySet<string>): string | undefined {
  const id = readString(value);
  if (!id) return undefined;
  return validIds && !validIds.has(id) ? undefined : id;
}

function compareStoryEntries(left: TripStoryEntry, right: TripStoryEntry, draft: TripDraft) {
  const leftDate = left.entryDate;
  const rightDate = right.entryDate;
  if (leftDate && rightDate && leftDate !== rightDate) return compareDateOnly(leftDate, rightDate);
  if (leftDate && !rightDate) return -1;
  if (!leftDate && rightDate) return 1;
  const leftDayOrder = itineraryDayOrder(draft, left.itineraryDayId);
  const rightDayOrder = itineraryDayOrder(draft, right.itineraryDayId);
  if (leftDayOrder !== rightDayOrder) return leftDayOrder - rightDayOrder;
  const createdCompare = left.createdAt.localeCompare(right.createdAt);
  return createdCompare || left.id.localeCompare(right.id);
}

function itineraryDayOrder(draft: TripDraft, dayId?: string) {
  if (!dayId) return Number.MAX_SAFE_INTEGER;
  return draft.itineraryDays.find((day) => day.id === dayId)?.order ?? Number.MAX_SAFE_INTEGER;
}

function formatDayLabel(day: TripItineraryDay) {
  return `Day ${day.order + 1}: ${day.title}`;
}

function itineraryDayDate(draft: TripDraft, day: TripItineraryDay) {
  if (!draft.travelDates?.startDate || !isValidDateOnly(draft.travelDates.startDate)) return undefined;
  return addDaysToDateOnly(draft.travelDates.startDate, day.order);
}

function addDaysToDateOnly(value: string, offset: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return date.toISOString().slice(0, 10);
}

function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function compareDateOnly(left: string, right: string) {
  return left === right ? 0 : left < right ? -1 : 1;
}

function validIsoString(value: unknown) {
  const text = readString(value);
  if (!text) return "";
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString() : "";
}

function sameJournalEntry(left: TripJournalEntry, right: TripJournalEntry) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cloneDraftJournalOnly(draft: TripDraft): TripDraft {
  return { ...draft, journalEntries: draft.journalEntries?.map((entry) => ({ ...entry, photoIds: entry.photoIds ? [...entry.photoIds] : undefined })) };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
