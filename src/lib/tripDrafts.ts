import type { CollectionPersistedReference, PlaceCollection } from "./placeCollections";
import type { SavedPlace, SavedPlaceStorageSource } from "./savedPlaces";

export const TRIP_DRAFTS_STORAGE_KEY = "fanatlas_trip_drafts_v1";
export const TRIP_DRAFTS_SCHEMA_VERSION = 1;
export const UNSCHEDULED_TRIP_DAY_ID = "unscheduled";

export const TRIP_DRAFT_LIMITS = {
  maxDrafts: 100,
  maxPlacesPerDraft: 500,
  maxNameLength: 100,
  maxDaysPerDraft: 60,
  maxDayTitleLength: 80
} as const;

export type TripDraftId = string;
export type TripDayId = string;
export type TripDraftStatus = "draft" | "planned" | "archived";

export type TripDraftPersistedReference = {
  storageSource: SavedPlaceStorageSource;
  persistedId: string;
  itemType?: string;
};

export type AddPlaceToTripDraftInput = {
  logicalPlaceId: string;
  persistedReferences: TripDraftPersistedReference[];
};

export type TripDraftPlaceReference = {
  logicalPlaceId: string;
  persistedReferences: TripDraftPersistedReference[];
  addedAt: string;
  dayId: string;
  order: number;
};

export type TripItineraryDay = {
  id: TripDayId;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type TripDraftSource = {
  type: "collection";
  collectionId: string;
  collectionNameSnapshot?: string;
};

export type TripDraft = {
  id: TripDraftId;
  name: string;
  status: TripDraftStatus;
  source?: TripDraftSource;
  itineraryDays: TripItineraryDay[];
  placeReferences: TripDraftPlaceReference[];
  createdAt: string;
  updatedAt: string;
};

export type TripDraftsState = {
  version: typeof TRIP_DRAFTS_SCHEMA_VERSION;
  drafts: TripDraft[];
};

export type HydratedTripDraftPlace = {
  reference: TripDraftPlaceReference;
  place: SavedPlace | null;
  isAvailable: boolean;
};

export type HydratedTripItinerarySection = {
  id: string;
  kind: "unscheduled" | "day";
  title: string;
  day: TripItineraryDay | null;
  places: HydratedTripDraftPlace[];
  availablePlaces: SavedPlace[];
  unavailableReferences: TripDraftPlaceReference[];
  counts: {
    total: number;
    available: number;
    unavailable: number;
    routable: number;
  };
};

export type HydratedTripDraft = {
  draft: TripDraft;
  sections: HydratedTripItinerarySection[];
  places: HydratedTripDraftPlace[];
  availablePlaces: SavedPlace[];
  unavailableReferences: TripDraftPlaceReference[];
  counts: {
    total: number;
    available: number;
    unavailable: number;
    routable: number;
    days: number;
  };
};

export type TripDraftMutationError =
  | "invalid_name"
  | "invalid_day_title"
  | "draft_not_found"
  | "day_not_found"
  | "draft_limit_reached"
  | "day_limit_reached"
  | "place_limit_reached"
  | "invalid_destination_day"
  | "place_not_found"
  | "invalid_place_reference"
  | "place_already_in_draft"
  | "reserved_day_operation"
  | "storage_unavailable"
  | "storage_write_failed";

export type TripDraftMutationResult<T = TripDraftsState> = {
  ok: boolean;
  value?: T;
  error?: TripDraftMutationError;
};

const EMPTY_STATE: TripDraftsState = {
  version: TRIP_DRAFTS_SCHEMA_VERSION,
  drafts: []
};

export function readTripDrafts(): TripDraftsState {
  try {
    return normalizeTripDraftsState(JSON.parse(localStorage.getItem(TRIP_DRAFTS_STORAGE_KEY) || "null"));
  } catch {
    return EMPTY_STATE;
  }
}

export function writeTripDrafts(state: TripDraftsState): TripDraftMutationResult<TripDraftsState> {
  try {
    const normalized = normalizeTripDraftsState(state);
    localStorage.setItem(TRIP_DRAFTS_STORAGE_KEY, JSON.stringify(normalized));
    return { ok: true, value: normalized };
  } catch {
    return { ok: false, error: "storage_write_failed" };
  }
}

export function createTripDraft(
  state: TripDraftsState,
  input: { name: string }
): TripDraftMutationResult<{ state: TripDraftsState; draft: TripDraft }> {
  const name = normalizeName(input.name);
  if (!name) return { ok: false, error: "invalid_name" };

  const current = normalizeTripDraftsState(state);
  if (current.drafts.length >= TRIP_DRAFT_LIMITS.maxDrafts) return { ok: false, error: "draft_limit_reached" };

  const now = isoNow();
  const draft: TripDraft = {
    id: createDraftId(),
    name,
    status: "draft",
    itineraryDays: [],
    placeReferences: [],
    createdAt: now,
    updatedAt: now
  };

  return {
    ok: true,
    value: {
      state: { version: TRIP_DRAFTS_SCHEMA_VERSION, drafts: [...current.drafts, draft] },
      draft
    }
  };
}

export function createTripDraftFromCollection(
  state: TripDraftsState,
  collection: PlaceCollection,
  input: { name?: string } = {}
): TripDraftMutationResult<{ state: TripDraftsState; draft: TripDraft }> {
  const name = normalizeName(input.name) || normalizeName(`${collection.name} trip`);
  if (!name) return { ok: false, error: "invalid_name" };

  const current = normalizeTripDraftsState(state);
  if (current.drafts.length >= TRIP_DRAFT_LIMITS.maxDrafts) return { ok: false, error: "draft_limit_reached" };
  if (collection.placeReferences.length > TRIP_DRAFT_LIMITS.maxPlacesPerDraft) return { ok: false, error: "place_limit_reached" };

  const now = isoNow();
  const draft: TripDraft = {
    id: createDraftId(),
    name,
    status: "draft",
    source: {
      type: "collection",
      collectionId: collection.id,
      collectionNameSnapshot: collection.name
    },
    itineraryDays: [],
    placeReferences: collectionToTripDraftPlaceReferences(collection),
    createdAt: now,
    updatedAt: now
  };

  return {
    ok: true,
    value: {
      state: { version: TRIP_DRAFTS_SCHEMA_VERSION, drafts: [...current.drafts, draft] },
      draft
    }
  };
}

export function renameTripDraft(
  state: TripDraftsState,
  draftId: string,
  input: { name: string }
): TripDraftMutationResult<TripDraftsState> {
  const name = normalizeName(input.name);
  if (!name) return { ok: false, error: "invalid_name" };

  const current = normalizeTripDraftsState(state);
  let found = false;
  let changed = false;
  const drafts = current.drafts.map((draft) => {
    if (draft.id !== draftId) return draft;
    found = true;
    if (draft.name === name) return draft;
    changed = true;
    return { ...draft, name, updatedAt: isoNow() };
  });

  if (!found) return { ok: false, error: "draft_not_found" };
  return { ok: true, value: changed ? { ...current, drafts } : current };
}

export function deleteTripDraft(state: TripDraftsState, draftId: string): TripDraftMutationResult<TripDraftsState> {
  const current = normalizeTripDraftsState(state);
  if (!current.drafts.some((draft) => draft.id === draftId)) return { ok: false, error: "draft_not_found" };
  return { ok: true, value: { ...current, drafts: current.drafts.filter((draft) => draft.id !== draftId) } };
}

export function createTripDraftWithPlace(
  state: TripDraftsState,
  input: { name: string; place: AddPlaceToTripDraftInput }
): TripDraftMutationResult<{ state: TripDraftsState; draft: TripDraft }> {
  const name = normalizeName(input.name);
  if (!name) return { ok: false, error: "invalid_name" };
  const placeInput = normalizeAddPlaceInput(input.place);
  if (!placeInput) return { ok: false, error: "invalid_place_reference" };

  const current = normalizeTripDraftsState(state);
  if (current.drafts.length >= TRIP_DRAFT_LIMITS.maxDrafts) return { ok: false, error: "draft_limit_reached" };

  const now = isoNow();
  const draft: TripDraft = {
    id: createDraftId(),
    name,
    status: "draft",
    itineraryDays: [],
    placeReferences: [{
      logicalPlaceId: placeInput.logicalPlaceId,
      persistedReferences: placeInput.persistedReferences,
      addedAt: now,
      dayId: UNSCHEDULED_TRIP_DAY_ID,
      order: 0
    }],
    createdAt: now,
    updatedAt: now
  };

  return {
    ok: true,
    value: {
      state: { version: TRIP_DRAFTS_SCHEMA_VERSION, drafts: [...current.drafts, draft] },
      draft
    }
  };
}

export function addPlaceToTripDraft(
  state: TripDraftsState,
  draftId: string,
  input: AddPlaceToTripDraftInput
): TripDraftMutationResult<TripDraftsState> {
  const placeInput = normalizeAddPlaceInput(input);
  if (!placeInput) return { ok: false, error: "invalid_place_reference" };

  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  if (draft.placeReferences.some((reference) => reference.logicalPlaceId === placeInput.logicalPlaceId)) {
    return { ok: false, error: "place_already_in_draft" };
  }
  if (draft.placeReferences.length >= TRIP_DRAFT_LIMITS.maxPlacesPerDraft) return { ok: false, error: "place_limit_reached" };

  const unscheduled = sectionReferences(draft.placeReferences, UNSCHEDULED_TRIP_DAY_ID);
  const reference: TripDraftPlaceReference = {
    logicalPlaceId: placeInput.logicalPlaceId,
    persistedReferences: placeInput.persistedReferences,
    addedAt: isoNow(),
    dayId: UNSCHEDULED_TRIP_DAY_ID,
    order: unscheduled.length
  };

  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      placeReferences: resequenceReferencesByDay([...draft.placeReferences, reference]),
      updatedAt: isoNow()
    })
  };
}

export function duplicateTripDraft(
  state: TripDraftsState,
  draftId: string,
  input: { name?: string } = {}
): TripDraftMutationResult<{ state: TripDraftsState; draft: TripDraft }> {
  const current = normalizeTripDraftsState(state);
  const original = current.drafts.find((draft) => draft.id === draftId);
  if (!original) return { ok: false, error: "draft_not_found" };
  if (current.drafts.length >= TRIP_DRAFT_LIMITS.maxDrafts) return { ok: false, error: "draft_limit_reached" };

  const name = normalizeName(input.name) || normalizeName(`${original.name} copy`);
  if (!name) return { ok: false, error: "invalid_name" };

  const now = isoNow();
  const dayIdMap = new Map<string, string>();
  const itineraryDays = original.itineraryDays.map((day) => {
    const nextId = createDraftId();
    dayIdMap.set(day.id, nextId);
    return {
      ...day,
      id: nextId,
      createdAt: now,
      updatedAt: now
    };
  });
  const draft: TripDraft = {
    ...original,
    id: createDraftId(),
    name,
    status: "draft",
    source: original.source ? { ...original.source } : undefined,
    itineraryDays,
    placeReferences: original.placeReferences.map((reference) => ({
      ...reference,
      dayId: reference.dayId === UNSCHEDULED_TRIP_DAY_ID ? UNSCHEDULED_TRIP_DAY_ID : dayIdMap.get(reference.dayId) || UNSCHEDULED_TRIP_DAY_ID,
      persistedReferences: reference.persistedReferences.map((persisted) => ({ ...persisted }))
    })),
    createdAt: now,
    updatedAt: now
  };

  return { ok: true, value: { state: { ...current, drafts: [...current.drafts, draft] }, draft } };
}

export function removePlaceFromTripDraft(
  state: TripDraftsState,
  draftId: string,
  logicalPlaceId: string
): TripDraftMutationResult<TripDraftsState> {
  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };

  const reference = draft.placeReferences.find((item) => item.logicalPlaceId === logicalPlaceId);
  if (!reference) return { ok: true, value: current };

  const nextReferences = resequenceReferencesByDay(draft.placeReferences.filter((item) => item.logicalPlaceId !== logicalPlaceId));
  if (nextReferences.length === draft.placeReferences.length) return { ok: true, value: current };

  return {
    ok: true,
    value: {
      ...current,
      drafts: current.drafts.map((item) => (
        item.id === draftId ? { ...item, placeReferences: nextReferences, updatedAt: isoNow() } : item
      ))
    }
  };
}

export function createTripDay(
  state: TripDraftsState,
  draftId: string,
  input: { title: string }
): TripDraftMutationResult<{ state: TripDraftsState; day: TripItineraryDay }> {
  const title = normalizeDayTitle(input.title);
  if (!title) return { ok: false, error: "invalid_day_title" };

  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  if (draft.itineraryDays.length >= TRIP_DRAFT_LIMITS.maxDaysPerDraft) return { ok: false, error: "day_limit_reached" };

  const now = isoNow();
  const day: TripItineraryDay = {
    id: createDraftId(),
    title,
    order: draft.itineraryDays.length,
    createdAt: now,
    updatedAt: now
  };

  const nextDraft = {
    ...draft,
    itineraryDays: resequenceDays([...draft.itineraryDays, day]),
    updatedAt: now
  };

  return {
    ok: true,
    value: {
      state: replaceDraft(current, nextDraft),
      day
    }
  };
}

export function renameTripDay(
  state: TripDraftsState,
  draftId: string,
  dayId: string,
  input: { title: string }
): TripDraftMutationResult<TripDraftsState> {
  if (dayId === UNSCHEDULED_TRIP_DAY_ID) return { ok: false, error: "reserved_day_operation" };
  const title = normalizeDayTitle(input.title);
  if (!title) return { ok: false, error: "invalid_day_title" };

  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  const day = draft.itineraryDays.find((item) => item.id === dayId);
  if (!day) return { ok: false, error: "day_not_found" };
  if (day.title === title) return { ok: true, value: current };

  const now = isoNow();
  const nextDraft = {
    ...draft,
    itineraryDays: draft.itineraryDays.map((item) => item.id === dayId ? { ...item, title, updatedAt: now } : item),
    updatedAt: now
  };

  return { ok: true, value: replaceDraft(current, nextDraft) };
}

export function deleteTripDay(
  state: TripDraftsState,
  draftId: string,
  dayId: string
): TripDraftMutationResult<TripDraftsState> {
  if (dayId === UNSCHEDULED_TRIP_DAY_ID) return { ok: false, error: "reserved_day_operation" };

  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  if (!draft.itineraryDays.some((day) => day.id === dayId)) return { ok: false, error: "day_not_found" };

  const unscheduled = sectionReferences(draft.placeReferences, UNSCHEDULED_TRIP_DAY_ID);
  const deletedDayReferences = sectionReferences(draft.placeReferences, dayId).map((reference, index) => ({
    ...reference,
    dayId: UNSCHEDULED_TRIP_DAY_ID,
    order: unscheduled.length + index
  }));
  const untouched = draft.placeReferences.filter((reference) => reference.dayId !== dayId && reference.dayId !== UNSCHEDULED_TRIP_DAY_ID);
  const nextReferences = resequenceReferencesByDay([...unscheduled, ...deletedDayReferences, ...untouched]);
  const now = isoNow();
  const nextDraft = {
    ...draft,
    itineraryDays: resequenceDays(draft.itineraryDays.filter((day) => day.id !== dayId)),
    placeReferences: nextReferences,
    updatedAt: now
  };

  return { ok: true, value: replaceDraft(current, nextDraft) };
}

export function moveTripPlace(
  state: TripDraftsState,
  draftId: string,
  logicalPlaceId: string,
  destination: { dayId: string; index?: number }
): TripDraftMutationResult<TripDraftsState> {
  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };

  const destinationDayId = normalizeDestinationDayId(destination.dayId, draft.itineraryDays);
  if (!destinationDayId) return { ok: false, error: "invalid_destination_day" };

  const moving = draft.placeReferences.find((reference) => reference.logicalPlaceId === logicalPlaceId);
  if (!moving) return { ok: false, error: "place_not_found" };

  const withoutMoving = draft.placeReferences.filter((reference) => reference.logicalPlaceId !== logicalPlaceId);
  const destinationItems = sectionReferences(withoutMoving, destinationDayId);
  const insertIndex = clampIndex(destination.index, destinationItems.length);
  const currentSection = sectionReferences(draft.placeReferences, moving.dayId);
  const currentIndex = currentSection.findIndex((reference) => reference.logicalPlaceId === logicalPlaceId);
  if (moving.dayId === destinationDayId && currentIndex === insertIndex) return { ok: true, value: current };

  const moved = { ...moving, dayId: destinationDayId, order: insertIndex };
  const destinationLogicalIds = new Set(destinationItems.map((reference) => reference.logicalPlaceId));
  const nextReferences = [
    ...withoutMoving.filter((reference) => reference.dayId !== destinationDayId),
    ...destinationItems.slice(0, insertIndex),
    moved,
    ...destinationItems.slice(insertIndex)
  ].map((reference) => (
    destinationLogicalIds.has(reference.logicalPlaceId) || reference.logicalPlaceId === moved.logicalPlaceId
      ? reference
      : reference
  ));
  const normalizedReferences = resequenceReferencesByDay(nextReferences);
  const normalizedMoving = normalizedReferences.find((reference) => reference.logicalPlaceId === logicalPlaceId);
  if (normalizedMoving && moving.dayId === normalizedMoving.dayId && moving.order === normalizedMoving.order) return { ok: true, value: current };

  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      placeReferences: normalizedReferences,
      updatedAt: isoNow()
    })
  };
}

export function collectionToTripDraftPlaceReferences(collection: PlaceCollection): TripDraftPlaceReference[] {
  return collection.placeReferences.slice(0, TRIP_DRAFT_LIMITS.maxPlacesPerDraft).map((reference, index) => ({
    logicalPlaceId: reference.logicalPlaceId,
    persistedReferences: uniquePersistedReferences(reference.persistedReferences.map(collectionReferenceToTripReference)),
    addedAt: reference.addedAt,
    dayId: UNSCHEDULED_TRIP_DAY_ID,
    order: index
  }));
}

export function savedPlaceToTripDraftReferenceInput(place: SavedPlace): AddPlaceToTripDraftInput | null {
  const logicalPlaceId = readString(place.id);
  if (!logicalPlaceId) return null;
  return {
    logicalPlaceId,
    persistedReferences: uniquePersistedReferences(place.storageReferences.map((reference) => ({
      storageSource: reference.source,
      persistedId: reference.persistedId,
      itemType: reference.itemType
    })))
  };
}

export function hydrateTripDraft(draft: TripDraft, savedPlaces: readonly SavedPlace[]): HydratedTripDraft {
  const placesById = new Map(savedPlaces.map((place) => [place.id, place]));
  const sections = [
    buildHydratedSection(UNSCHEDULED_TRIP_DAY_ID, "unscheduled" as const, null, draft.placeReferences, placesById),
    ...draft.itineraryDays.map((day) => buildHydratedSection(day.id, "day" as const, day, draft.placeReferences, placesById))
  ];
  const places = sections.flatMap((section) => section.places);
  const availablePlaces = sections.flatMap((section) => section.availablePlaces);
  const unavailableReferences = sections.flatMap((section) => section.unavailableReferences);

  return {
    draft,
    sections,
    places,
    availablePlaces,
    unavailableReferences,
    counts: {
      total: places.length,
      available: availablePlaces.length,
      unavailable: unavailableReferences.length,
      routable: availablePlaces.filter((place) => place.isRoutable).length,
      days: draft.itineraryDays.length
    }
  };
}

function buildHydratedSection(
  id: string,
  kind: "unscheduled" | "day",
  day: TripItineraryDay | null,
  references: readonly TripDraftPlaceReference[],
  placesById: Map<string, SavedPlace>
): HydratedTripItinerarySection {
  const sectionReferences = references
    .filter((reference) => reference.dayId === id)
    .sort((left, right) => left.order - right.order);
  const places = sectionReferences.map((reference) => {
    const place = placesById.get(reference.logicalPlaceId) || null;
    return { reference, place, isAvailable: place !== null };
  });
  const availablePlaces = places.flatMap((item) => item.place ? [item.place] : []);
  const unavailableReferences = places.flatMap((item) => item.place ? [] : [item.reference]);

  return {
    id,
    kind,
    title: day?.title || "",
    day,
    places,
    availablePlaces,
    unavailableReferences,
    counts: {
      total: places.length,
      available: availablePlaces.length,
      unavailable: unavailableReferences.length,
      routable: availablePlaces.filter((place) => place.isRoutable).length
    }
  };
}

export function hydrateTripDrafts(state: TripDraftsState, savedPlaces: readonly SavedPlace[]): HydratedTripDraft[] {
  return normalizeTripDraftsState(state).drafts.map((draft) => hydrateTripDraft(draft, savedPlaces));
}

export function normalizeTripDraftsState(value: unknown): TripDraftsState {
  const record = asRecord(value);
  if (!record || record.version !== TRIP_DRAFTS_SCHEMA_VERSION || !Array.isArray(record.drafts)) return EMPTY_STATE;

  const seen = new Set<string>();
  const drafts: TripDraft[] = [];
  for (const value of record.drafts) {
    if (drafts.length >= TRIP_DRAFT_LIMITS.maxDrafts) break;
    const draft = normalizeTripDraft(value);
    if (!draft || seen.has(draft.id)) continue;
    seen.add(draft.id);
    drafts.push(draft);
  }
  return { version: TRIP_DRAFTS_SCHEMA_VERSION, drafts };
}

export function normalizeTripDraft(value: unknown): TripDraft | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record.id);
  const name = normalizeName(record.name);
  if (!id || !name) return null;

  const seenReferences = new Set<string>();
  const itineraryDays = normalizeTripItineraryDays(record.itineraryDays);
  const validDayIds = new Set(itineraryDays.map((day) => day.id));
  const placeReferences = resequenceReferencesByDay(Array.isArray(record.placeReferences)
    ? record.placeReferences.flatMap((value) => {
        if (seenReferences.size >= TRIP_DRAFT_LIMITS.maxPlacesPerDraft) return [];
        const reference = normalizeTripDraftPlaceReference(value, validDayIds);
        if (!reference || seenReferences.has(reference.logicalPlaceId)) return [];
        seenReferences.add(reference.logicalPlaceId);
        return [reference];
      })
    : []);

  return {
    id,
    name,
    status: normalizeStatus(record.status),
    source: normalizeSource(record.source),
    itineraryDays,
    placeReferences,
    createdAt: validIsoString(record.createdAt) || isoNow(),
    updatedAt: validIsoString(record.updatedAt) || validIsoString(record.createdAt) || isoNow()
  };
}

export function normalizeTripDraftPlaceReference(value: unknown, validDayIds: ReadonlySet<string> = new Set()): TripDraftPlaceReference | null {
  const record = asRecord(value);
  if (!record) return null;
  const logicalPlaceId = readString(record.logicalPlaceId);
  if (!logicalPlaceId) return null;
  return {
    logicalPlaceId,
    persistedReferences: Array.isArray(record.persistedReferences)
      ? uniquePersistedReferences(record.persistedReferences.map(normalizePersistedReference).filter(Boolean))
      : [],
    addedAt: validIsoString(record.addedAt) || isoNow(),
    dayId: normalizeReferenceDayId(record.dayId, validDayIds),
    order: readOrder(record.order)
  };
}

export function normalizeTripItineraryDay(value: unknown): TripItineraryDay | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record.id);
  const title = normalizeDayTitle(record.title);
  if (!id || id === UNSCHEDULED_TRIP_DAY_ID || !title) return null;
  return {
    id,
    title,
    order: readOrder(record.order),
    createdAt: validIsoString(record.createdAt) || isoNow(),
    updatedAt: validIsoString(record.updatedAt) || validIsoString(record.createdAt) || isoNow()
  };
}

function normalizePersistedReference(value: unknown): TripDraftPersistedReference | null {
  const record = asRecord(value);
  if (!record) return null;
  const persistedId = readString(record.persistedId);
  if (!persistedId) return null;
  return {
    storageSource: normalizeStorageSource(record.storageSource),
    persistedId,
    itemType: readString(record.itemType) || undefined
  };
}

function normalizeAddPlaceInput(value: unknown): AddPlaceToTripDraftInput | null {
  const record = asRecord(value);
  if (!record) return null;
  const logicalPlaceId = readString(record.logicalPlaceId);
  if (!logicalPlaceId) return null;
  return {
    logicalPlaceId,
    persistedReferences: Array.isArray(record.persistedReferences)
      ? uniquePersistedReferences(record.persistedReferences.map(normalizePersistedReference).filter(Boolean))
      : []
  };
}

function collectionReferenceToTripReference(reference: CollectionPersistedReference): TripDraftPersistedReference {
  return {
    storageSource: reference.storageSource,
    persistedId: reference.persistedId,
    itemType: reference.itemType
  };
}

function uniquePersistedReferences(references: Array<TripDraftPersistedReference | null>): TripDraftPersistedReference[] {
  const seen = new Set<string>();
  return references.flatMap((reference) => {
    if (!reference || !reference.persistedId) return [];
    const key = `${reference.storageSource}:${reference.persistedId}:${reference.itemType || ""}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [reference];
  });
}

function normalizeTripItineraryDays(value: unknown): TripItineraryDay[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const days: TripItineraryDay[] = [];
  for (const item of value) {
    if (days.length >= TRIP_DRAFT_LIMITS.maxDaysPerDraft) break;
    const day = normalizeTripItineraryDay(item);
    if (!day || seen.has(day.id)) continue;
    seen.add(day.id);
    days.push(day);
  }
  return resequenceDays(days);
}

function resequenceDays(days: TripItineraryDay[]) {
  return days
    .map((day, inputIndex) => ({ day, inputIndex }))
    .sort((left, right) => left.day.order - right.day.order || left.inputIndex - right.inputIndex)
    .map(({ day }, order) => ({ ...day, order }));
}

function resequenceReferencesByDay(references: TripDraftPlaceReference[]) {
  const grouped = new Map<string, Array<{ reference: TripDraftPlaceReference; inputIndex: number }>>();
  references.forEach((reference, inputIndex) => {
    const items = grouped.get(reference.dayId) || [];
    items.push({ reference, inputIndex });
    grouped.set(reference.dayId, items);
  });

  return references.map((reference) => reference.dayId).filter((dayId, index, dayIds) => dayIds.indexOf(dayId) === index).flatMap((dayId) => (
    (grouped.get(dayId) || [])
      .sort((left, right) => left.reference.order - right.reference.order || left.inputIndex - right.inputIndex)
      .map(({ reference }, order) => ({ ...reference, order }))
  ));
}

function sectionReferences(references: readonly TripDraftPlaceReference[], dayId: string) {
  return references
    .filter((reference) => reference.dayId === dayId)
    .sort((left, right) => left.order - right.order);
}

function replaceDraft(state: TripDraftsState, nextDraft: TripDraft): TripDraftsState {
  return {
    ...state,
    drafts: state.drafts.map((draft) => draft.id === nextDraft.id ? normalizeTripDraft(nextDraft) || nextDraft : draft)
  };
}

function normalizeStatus(value: unknown): TripDraftStatus {
  return value === "planned" || value === "archived" ? value : "draft";
}

function normalizeSource(value: unknown): TripDraftSource | undefined {
  const record = asRecord(value);
  if (!record || record.type !== "collection") return undefined;
  const collectionId = readString(record.collectionId);
  if (!collectionId) return undefined;
  return {
    type: "collection",
    collectionId,
    collectionNameSnapshot: readString(record.collectionNameSnapshot) || undefined
  };
}

function normalizeReferenceDayId(value: unknown, validDayIds: ReadonlySet<string>) {
  const dayId = readString(value);
  if (!dayId || dayId === UNSCHEDULED_TRIP_DAY_ID) return UNSCHEDULED_TRIP_DAY_ID;
  return validDayIds.has(dayId) ? dayId : UNSCHEDULED_TRIP_DAY_ID;
}

function normalizeDestinationDayId(value: unknown, days: readonly TripItineraryDay[]) {
  const dayId = readString(value);
  if (dayId === UNSCHEDULED_TRIP_DAY_ID) return UNSCHEDULED_TRIP_DAY_ID;
  return days.some((day) => day.id === dayId) ? dayId : "";
}

function createDraftId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `trip-draft-${Date.now().toString(36)}-${fallbackCounter()}`;
}

let idCounter = 0;

function fallbackCounter() {
  idCounter += 1;
  return idCounter.toString(36);
}

function normalizeName(value: unknown) {
  return readString(value).slice(0, TRIP_DRAFT_LIMITS.maxNameLength);
}

function normalizeDayTitle(value: unknown) {
  return readString(value).slice(0, TRIP_DRAFT_LIMITS.maxDayTitleLength);
}

function normalizeStorageSource(value: unknown): SavedPlaceStorageSource {
  if (value === "supabase_favorite" || value === "explore_local" || value === "unknown") return value;
  return "unknown";
}

function readOrder(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : Number.MAX_SAFE_INTEGER;
}

function clampIndex(value: unknown, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return max;
  return Math.max(0, Math.min(Math.floor(value), max));
}

function validIsoString(value: unknown) {
  const text = readString(value);
  if (!text) return "";
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString() : "";
}

function isoNow() {
  return new Date().toISOString();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readString(value: unknown) {
  if (typeof value === "string") return value.trim().replace(/\s+/g, " ");
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}
