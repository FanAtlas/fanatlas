import type { CollectionPersistedReference, PlaceCollection } from "./placeCollections";
import type { SavedPlace, SavedPlaceStorageSource } from "./savedPlaces";

export const TRIP_DRAFTS_STORAGE_KEY = "fanatlas_trip_drafts_v1";
export const TRIP_DRAFTS_SCHEMA_VERSION = 1;
export const UNSCHEDULED_TRIP_DAY_ID = "unscheduled";
export const TRIP_TIME_BLOCK_ORDER = [null, "morning", "afternoon", "evening"] as const;

export const TRIP_DRAFT_LIMITS = {
  maxDrafts: 100,
  maxPlacesPerDraft: 500,
  maxNameLength: 100,
  maxDaysPerDraft: 60,
  maxDayTitleLength: 80,
  maxDestinationLabelLength: 120,
  maxDestinationCityLength: 100,
  maxDestinationCountryLength: 100,
  maxPlacePlanningNoteLength: 1000,
  maxPlanningActionLength: 200
} as const;

export const TRIP_PLACE_NOTE_MAX_LENGTH = TRIP_DRAFT_LIMITS.maxPlacePlanningNoteLength;
export const PLANNING_ACTION_MAX_LENGTH = TRIP_DRAFT_LIMITS.maxPlanningActionLength;

export type TripDraftId = string;
export type TripDayId = string;
export type TripDraftStatus = "draft" | "planned" | "archived";
export type TripCompletionStatus = "draft" | "active" | "completed" | "archived";
export type TripTimeBlock = "morning" | "afternoon" | "evening";
export type TripPlaceVisitStatus = "planned" | "visited" | "skipped";

export type PlanningAction = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
};

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
  timeBlock?: TripTimeBlock;
  planningNote?: string;
  visitStatus?: TripPlaceVisitStatus;
  planningActions?: PlanningAction[];
  photoIds?: string[];
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

export type TripDestination = {
  label: string;
  countryCode?: string;
  city?: string;
  country?: string;
};

export type TripTravelDates = {
  startDate: string;
  endDate?: string;
};

export type TripDateDayAlignment = {
  tripDurationDays: number | null;
  itineraryDayCount: number;
  extraItineraryDays: number;
  unusedTripDates: number;
};

export type TripDraft = {
  id: TripDraftId;
  name: string;
  status: TripDraftStatus;
  completionStatus?: TripCompletionStatus;
  completedAt?: string;
  source?: TripDraftSource;
  destination?: TripDestination;
  travelDates?: TripTravelDates;
  planningActions?: PlanningAction[];
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
  date: string | null;
  isOutsideTravelDateRange: boolean;
  places: HydratedTripDraftPlace[];
  timeBlocks?: HydratedTripTimeBlockSection[];
  availablePlaces: SavedPlace[];
  unavailableReferences: TripDraftPlaceReference[];
  counts: {
    total: number;
    available: number;
    unavailable: number;
    routable: number;
  };
};

export type HydratedTripTimeBlockSection = {
  id: "unassigned" | TripTimeBlock;
  timeBlock: TripTimeBlock | null;
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
  context: {
    destination: TripDestination | null;
    travelDates: TripTravelDates | null;
    durationDays: number | null;
    itineraryDayCount: number;
    dateAlignment: TripDateDayAlignment | null;
  };
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

export type TripProgress = {
  planned: number;
  visited: number;
  skipped: number;
  remaining: number;
  total: number;
  completionPercent: number;
};

export type PlanningActionProgress = {
  completed: number;
  incomplete: number;
  total: number;
  completionPercent: number;
};

export type TripDraftMutationError =
  | "invalid_name"
  | "invalid_day_title"
  | "draft_not_found"
  | "day_not_found"
  | "draft_limit_reached"
  | "day_limit_reached"
  | "place_limit_reached"
  | "incomplete_travel_dates"
  | "no_missing_itinerary_days"
  | "invalid_generated_day_titles"
  | "invalid_time_block"
  | "time_block_not_allowed_in_unscheduled"
  | "invalid_destination"
  | "invalid_start_date"
  | "invalid_end_date"
  | "end_date_before_start_date"
  | "invalid_destination_day"
  | "invalid_place_group"
  | "stale_place_group"
  | "place_note_too_long"
  | "stale_place_note"
  | "invalid_visit_status"
  | "invalid_planning_action"
  | "planning_action_too_long"
  | "planning_action_not_found"
  | "stale_planning_action"
  | "invalid_photo_id"
  | "photo_not_found"
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

export type UpdateTripDetailsInput = {
  destination?: {
    label: string;
    city?: string;
    country?: string;
    countryCode?: string;
  } | null;
  travelDates?: {
    startDate: string;
    endDate?: string;
  } | null;
};

export type MoveTripPlaceGroupInput = {
  memberIds: readonly string[];
  expectedSourceDayId: string;
  expectedSourceTimeBlock: TripTimeBlock | null;
  destinationDayId: string;
  destinationTimeBlock: TripTimeBlock | null;
};

export type UpdateTripPlaceNoteInput = {
  logicalPlaceId: string;
  expectedCurrentNote?: string | null;
  note: string | null;
};

export type UpdateTripPlaceVisitStatusInput = {
  logicalPlaceId: string;
  status: TripPlaceVisitStatus;
};

export type AddPlanningActionInput = {
  text: string;
};

export type UpdatePlanningActionInput = {
  actionId: string;
  expectedCurrentText: string;
  text: string;
};

export type PlanningActionTargetInput = {
  actionId: string;
};

export type AddPlacePlanningActionInput = AddPlanningActionInput & {
  logicalPlaceId: string;
};

export type UpdatePlacePlanningActionInput = UpdatePlanningActionInput & {
  logicalPlaceId: string;
};

export type PlacePlanningActionTargetInput = PlanningActionTargetInput & {
  logicalPlaceId: string;
};

export type PlacePhotoIdsInput = {
  logicalPlaceId: string;
  photoIds: readonly string[];
};

export type PlacePhotoIdInput = {
  logicalPlaceId: string;
  photoId: string;
};

export function restoreTripDraftSnapshot(
  state: TripDraftsState,
  snapshot: TripDraft,
  restoredAt: string
): TripDraftMutationResult<TripDraftsState> {
  const current = normalizeTripDraftsState(state);
  if (!current.drafts.some((draft) => draft.id === snapshot.id)) return { ok: false, error: "draft_not_found" };
  return {
    ok: true,
    value: replaceDraft(current, {
      ...cloneTripDraft(snapshot),
      updatedAt: restoredAt
    })
  };
}

export function normalizeTripPlacePlanningNote(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  return normalized ? normalized : undefined;
}

function normalizeStoredTripPlacePlanningNote(value: unknown): string | undefined {
  const note = normalizeTripPlacePlanningNote(value);
  return note && note.length <= TRIP_PLACE_NOTE_MAX_LENGTH ? note : undefined;
}

export function normalizeTripPlaceVisitStatus(value: unknown): TripPlaceVisitStatus {
  return value === "visited" || value === "skipped" || value === "planned" ? value : "planned";
}

function normalizeTripPlaceVisitStatusForStorage(value: unknown): TripPlaceVisitStatus | undefined {
  const status = normalizeTripPlaceVisitStatus(value);
  return status === "planned" ? undefined : status;
}

export function calculateTripProgress(placeReferences: readonly TripDraftPlaceReference[]): TripProgress {
  const progress = placeReferences.reduce(
    (counts, reference) => {
      const status = normalizeTripPlaceVisitStatus(reference.visitStatus);
      return {
        planned: counts.planned + (status === "planned" ? 1 : 0),
        visited: counts.visited + (status === "visited" ? 1 : 0),
        skipped: counts.skipped + (status === "skipped" ? 1 : 0)
      };
    },
    { planned: 0, visited: 0, skipped: 0 }
  );
  const total = progress.planned + progress.visited + progress.skipped;
  return {
    ...progress,
    remaining: progress.planned,
    total,
    completionPercent: total === 0 ? 0 : Math.round((progress.visited / total) * 100)
  };
}

export function normalizePlanningActionText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text && text.length <= PLANNING_ACTION_MAX_LENGTH ? text : undefined;
}

export function normalizePlanningAction(value: unknown): PlanningAction | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record.id);
  const text = normalizePlanningActionText(record.text);
  if (!id || !text) return null;
  return {
    id,
    text,
    completed: typeof record.completed === "boolean" ? record.completed : false,
    createdAt: validIsoString(record.createdAt) || isoNow()
  };
}

export function normalizePlanningActions(value: unknown): PlanningAction[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item) => {
    const action = normalizePlanningAction(item);
    if (!action || seen.has(action.id)) return [];
    seen.add(action.id);
    return [action];
  });
}

export function calculatePlanningActionProgress(actions: readonly PlanningAction[]): PlanningActionProgress {
  const completed = actions.filter((action) => action.completed).length;
  const incomplete = actions.length - completed;
  const total = actions.length;
  return {
    completed,
    incomplete,
    total,
    completionPercent: total === 0 ? 0 : Math.round((completed / total) * 100)
  };
}

export function normalizeTripPhotoIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item) => {
    const id = readString(item);
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [id];
  });
}

function validatePlanningActionTextInput(value: unknown): { value: string } | { error: TripDraftMutationError } {
  if (typeof value !== "string") return { error: "invalid_planning_action" };
  if (value.length > PLANNING_ACTION_MAX_LENGTH) return { error: "planning_action_too_long" };
  const text = value.trim();
  return text ? { value: text } : { error: "invalid_planning_action" };
}

function validatePhotoIdsInput(value: readonly string[]): string[] | null {
  const seen = new Set<string>();
  const ids = value.flatMap((item) => {
    const id = readString(item);
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [id];
  });
  return ids.length > 0 ? ids : null;
}

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

export function updateTripDetails(
  state: TripDraftsState,
  draftId: string,
  input: UpdateTripDetailsInput
): TripDraftMutationResult<TripDraftsState> {
  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };

  const destinationResult = normalizeTripDetailsDestinationInput(input.destination);
  if ("error" in destinationResult) return { ok: false, error: destinationResult.error };
  const datesResult = normalizeTripDetailsDatesInput(input.travelDates);
  if ("error" in datesResult) return { ok: false, error: datesResult.error };

  const nextDestination = input.destination === undefined ? draft.destination : destinationResult.value;
  const nextTravelDates = input.travelDates === undefined ? draft.travelDates : datesResult.value;
  const destinationChanged = !sameDestination(draft.destination, nextDestination);
  const datesChanged = !sameTravelDates(draft.travelDates, nextTravelDates);
  if (!destinationChanged && !datesChanged) return { ok: true, value: current };

  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      destination: nextDestination,
      travelDates: nextTravelDates,
      updatedAt: isoNow()
    })
  };
}

export function setTripDestination(
  state: TripDraftsState,
  draftId: string,
  input: NonNullable<UpdateTripDetailsInput["destination"]>
) {
  return updateTripDetails(state, draftId, { destination: input });
}

export function clearTripDestination(state: TripDraftsState, draftId: string) {
  return updateTripDetails(state, draftId, { destination: null });
}

export function setTripTravelDates(
  state: TripDraftsState,
  draftId: string,
  input: NonNullable<UpdateTripDetailsInput["travelDates"]>
) {
  return updateTripDetails(state, draftId, { travelDates: input });
}

export function clearTripTravelDates(state: TripDraftsState, draftId: string) {
  return updateTripDetails(state, draftId, { travelDates: null });
}

export function deleteTripDraft(state: TripDraftsState, draftId: string): TripDraftMutationResult<TripDraftsState> {
  const current = normalizeTripDraftsState(state);
  if (!current.drafts.some((draft) => draft.id === draftId)) return { ok: false, error: "draft_not_found" };
  return { ok: true, value: { ...current, drafts: current.drafts.filter((draft) => draft.id !== draftId) } };
}

export function markTripCompleted(
  state: TripDraftsState,
  draftId: string,
  completedAt: string = isoNow()
): TripDraftMutationResult<TripDraftsState> {
  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  const normalizedCompletedAt = validIsoString(completedAt) || isoNow();
  if (draft.completionStatus === "completed" && draft.completedAt) return { ok: true, value: current };
  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      completionStatus: "completed",
      completedAt: draft.completedAt || normalizedCompletedAt,
      updatedAt: isoNow()
    })
  };
}

export function reopenCompletedTrip(
  state: TripDraftsState,
  draftId: string,
  nextStatus: Exclude<TripCompletionStatus, "completed"> = "draft"
): TripDraftMutationResult<TripDraftsState> {
  if (nextStatus !== "draft" && nextStatus !== "active" && nextStatus !== "archived") {
    return { ok: false, error: "invalid_visit_status" };
  }
  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  if (draft.completionStatus === nextStatus && !draft.completedAt) return { ok: true, value: current };
  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      completionStatus: nextStatus,
      completedAt: undefined,
      updatedAt: isoNow()
    })
  };
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

  const unscheduled = groupReferences(draft.placeReferences, UNSCHEDULED_TRIP_DAY_ID);
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
      placeReferences: resequenceReferencesByDayAndTimeBlock([...draft.placeReferences, reference]),
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
    completionStatus: "draft",
    completedAt: undefined,
    source: original.source ? { ...original.source } : undefined,
    destination: original.destination ? { ...original.destination } : undefined,
    travelDates: original.travelDates ? { ...original.travelDates } : undefined,
    planningActions: original.planningActions?.map(clonePlanningAction),
    itineraryDays,
    placeReferences: original.placeReferences.map((reference) => ({
      ...reference,
      dayId: reference.dayId === UNSCHEDULED_TRIP_DAY_ID ? UNSCHEDULED_TRIP_DAY_ID : dayIdMap.get(reference.dayId) || UNSCHEDULED_TRIP_DAY_ID,
      persistedReferences: reference.persistedReferences.map((persisted) => ({ ...persisted })),
      visitStatus: undefined,
      planningActions: reference.planningActions?.map(clonePlanningAction),
      photoIds: []
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

  const nextReferences = resequenceReferencesByDayAndTimeBlock(draft.placeReferences.filter((item) => item.logicalPlaceId !== logicalPlaceId));
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

export function getMissingTripItineraryDayCount(draft: TripDraft): number {
  const alignment = getTripDateDayAlignment(draft);
  return alignment ? Math.max(0, alignment.unusedTripDates) : 0;
}

export function canCreateMissingTripItineraryDays(draft: TripDraft): boolean {
  return getMissingTripItineraryDayCount(draft) > 0;
}

export function createMissingTripItineraryDays(
  state: TripDraftsState,
  draftId: string,
  input: { titles?: string[] } = {}
): TripDraftMutationResult<{ state: TripDraftsState; createdDays: TripItineraryDay[] }> {
  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  if (!draft.travelDates?.startDate || !draft.travelDates.endDate) return { ok: false, error: "incomplete_travel_dates" };

  const missingDayCount = getMissingTripItineraryDayCount(draft);
  if (missingDayCount <= 0) return { ok: false, error: "no_missing_itinerary_days" };
  if (draft.itineraryDays.length + missingDayCount > TRIP_DRAFT_LIMITS.maxDaysPerDraft) {
    return { ok: false, error: "day_limit_reached" };
  }

  const titles = normalizeGeneratedDayTitles(input.titles, missingDayCount);
  if (!titles) return { ok: false, error: "invalid_generated_day_titles" };

  const now = isoNow();
  const firstOrder = draft.itineraryDays.length;
  const createdDays = titles.map((title, index): TripItineraryDay => ({
    id: createDraftId(),
    title,
    order: firstOrder + index,
    createdAt: now,
    updatedAt: now
  }));

  return {
    ok: true,
    value: {
      state: replaceDraft(current, {
        ...draft,
        itineraryDays: [...draft.itineraryDays, ...createdDays],
        updatedAt: now
      }),
      createdDays
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

  const unscheduled = groupReferences(draft.placeReferences, UNSCHEDULED_TRIP_DAY_ID);
  const deletedDayReferences = sectionReferences(draft.placeReferences, dayId).map((reference, index) => ({
    ...reference,
    dayId: UNSCHEDULED_TRIP_DAY_ID,
    timeBlock: undefined,
    order: unscheduled.length + index
  }));
  const untouched = draft.placeReferences.filter((reference) => reference.dayId !== dayId && reference.dayId !== UNSCHEDULED_TRIP_DAY_ID);
  const nextReferences = resequenceReferencesByDayAndTimeBlock([...unscheduled, ...deletedDayReferences, ...untouched]);
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
  const destinationTimeBlock = destinationDayId === UNSCHEDULED_TRIP_DAY_ID
    ? undefined
    : moving.dayId === UNSCHEDULED_TRIP_DAY_ID
      ? undefined
      : moving.timeBlock;
  const destinationItems = groupReferences(withoutMoving, destinationDayId, destinationTimeBlock);
  const insertIndex = clampIndex(destination.index, destinationItems.length);
  const currentSection = groupReferences(draft.placeReferences, moving.dayId, moving.timeBlock);
  const currentIndex = currentSection.findIndex((reference) => reference.logicalPlaceId === logicalPlaceId);
  if (moving.dayId === destinationDayId && sameTimeBlock(moving.timeBlock, destinationTimeBlock) && currentIndex === insertIndex) {
    return { ok: true };
  }

  const moved = { ...moving, dayId: destinationDayId, timeBlock: destinationTimeBlock, order: insertIndex };
  const nextReferences = [
    ...withoutMoving.filter((reference) => !sameTripPlaceGroup(reference, destinationDayId, destinationTimeBlock)),
    ...destinationItems.slice(0, insertIndex),
    moved,
    ...destinationItems.slice(insertIndex)
  ];
  const normalizedReferences = resequenceReferencesByDayAndTimeBlock(nextReferences);
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

export function setTripPlaceTimeBlock(
  state: TripDraftsState,
  draftId: string,
  logicalPlaceId: string,
  timeBlock: TripTimeBlock | null
): TripDraftMutationResult<TripDraftsState> {
  if (timeBlock !== null && !normalizeTripTimeBlock(timeBlock)) return { ok: false, error: "invalid_time_block" };

  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };

  const moving = draft.placeReferences.find((reference) => reference.logicalPlaceId === logicalPlaceId);
  if (!moving) return { ok: false, error: "place_not_found" };
  if (moving.dayId === UNSCHEDULED_TRIP_DAY_ID) return { ok: false, error: "time_block_not_allowed_in_unscheduled" };

  const nextTimeBlock = timeBlock || undefined;
  if (sameTimeBlock(moving.timeBlock, nextTimeBlock)) return { ok: true };

  const withoutMoving = draft.placeReferences.filter((reference) => reference.logicalPlaceId !== logicalPlaceId);
  const destinationItems = groupReferences(withoutMoving, moving.dayId, nextTimeBlock);
  const moved = { ...moving, timeBlock: nextTimeBlock, order: destinationItems.length };
  const now = isoNow();

  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      placeReferences: resequenceReferencesByDayAndTimeBlock([...withoutMoving, moved]),
      updatedAt: now
    })
  };
}

export function updateTripPlaceNote(
  state: TripDraftsState,
  draftId: string,
  input: UpdateTripPlaceNoteInput
): TripDraftMutationResult<TripDraftsState> {
  if (input.note !== null && input.note.length > TRIP_PLACE_NOTE_MAX_LENGTH) {
    return { ok: false, error: "place_note_too_long" };
  }
  const expectedCurrentNote = input.expectedCurrentNote === null
    ? undefined
    : normalizeTripPlacePlanningNote(input.expectedCurrentNote);
  const nextNote = input.note === null ? undefined : normalizeTripPlacePlanningNote(input.note);

  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };

  const reference = draft.placeReferences.find((item) => item.logicalPlaceId === input.logicalPlaceId);
  if (!reference) return { ok: false, error: "place_not_found" };
  const currentNote = normalizeTripPlacePlanningNote(reference.planningNote);
  if (currentNote !== expectedCurrentNote) return { ok: false, error: "stale_place_note" };
  if (currentNote === nextNote) return { ok: true };

  const now = isoNow();
  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      placeReferences: draft.placeReferences.map((item) => (
        item.logicalPlaceId === input.logicalPlaceId
          ? { ...item, planningNote: nextNote }
          : item
      )),
      updatedAt: now
    })
  };
}

export function updateTripPlaceVisitStatus(
  state: TripDraftsState,
  draftId: string,
  input: UpdateTripPlaceVisitStatusInput
): TripDraftMutationResult<TripDraftsState> {
  if (input.status !== "planned" && input.status !== "visited" && input.status !== "skipped") {
    return { ok: false, error: "invalid_visit_status" };
  }

  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };

  const reference = draft.placeReferences.find((item) => item.logicalPlaceId === input.logicalPlaceId);
  if (!reference) return { ok: false, error: "place_not_found" };
  const currentStatus = normalizeTripPlaceVisitStatus(reference.visitStatus);
  if (currentStatus === input.status) return { ok: true };

  const nextStatus = input.status === "planned" ? undefined : input.status;
  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      placeReferences: draft.placeReferences.map((item) => (
        item.logicalPlaceId === input.logicalPlaceId
          ? { ...item, visitStatus: nextStatus }
          : item
      )),
      updatedAt: isoNow()
    })
  };
}

export function addTripPlanningAction(
  state: TripDraftsState,
  draftId: string,
  input: AddPlanningActionInput
): TripDraftMutationResult<TripDraftsState> {
  const textResult = validatePlanningActionTextInput(input.text);
  if ("error" in textResult) return { ok: false, error: textResult.error };

  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  const now = isoNow();
  const action: PlanningAction = {
    id: createDraftId(),
    text: textResult.value,
    completed: false,
    createdAt: now
  };
  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      planningActions: [...(draft.planningActions || []), action],
      updatedAt: now
    })
  };
}

export function updateTripPlanningAction(
  state: TripDraftsState,
  draftId: string,
  input: UpdatePlanningActionInput
): TripDraftMutationResult<TripDraftsState> {
  const textResult = validatePlanningActionTextInput(input.text);
  if ("error" in textResult) return { ok: false, error: textResult.error };
  const expectedText = normalizePlanningActionText(input.expectedCurrentText);
  if (!expectedText) return { ok: false, error: "stale_planning_action" };

  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  const actions = draft.planningActions || [];
  const action = actions.find((item) => item.id === input.actionId);
  if (!action) return { ok: false, error: "planning_action_not_found" };
  if (action.text !== expectedText) return { ok: false, error: "stale_planning_action" };
  if (action.text === textResult.value) return { ok: true };

  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      planningActions: actions.map((item) => (
        item.id === input.actionId ? { ...item, text: textResult.value } : item
      )),
      updatedAt: isoNow()
    })
  };
}

export function toggleTripPlanningAction(
  state: TripDraftsState,
  draftId: string,
  input: PlanningActionTargetInput
): TripDraftMutationResult<TripDraftsState> {
  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  const actions = draft.planningActions || [];
  if (!actions.some((action) => action.id === input.actionId)) return { ok: false, error: "planning_action_not_found" };
  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      planningActions: actions.map((action) => (
        action.id === input.actionId ? { ...action, completed: !action.completed } : action
      )),
      updatedAt: isoNow()
    })
  };
}

export function removeTripPlanningAction(
  state: TripDraftsState,
  draftId: string,
  input: PlanningActionTargetInput
): TripDraftMutationResult<TripDraftsState> {
  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  const actions = draft.planningActions || [];
  if (!actions.some((action) => action.id === input.actionId)) return { ok: false, error: "planning_action_not_found" };
  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      planningActions: actions.filter((action) => action.id !== input.actionId),
      updatedAt: isoNow()
    })
  };
}

export function addPlacePlanningAction(
  state: TripDraftsState,
  draftId: string,
  input: AddPlacePlanningActionInput
): TripDraftMutationResult<TripDraftsState> {
  const textResult = validatePlanningActionTextInput(input.text);
  if ("error" in textResult) return { ok: false, error: textResult.error };
  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  const reference = draft.placeReferences.find((item) => item.logicalPlaceId === input.logicalPlaceId);
  if (!reference) return { ok: false, error: "place_not_found" };
  const now = isoNow();
  const action: PlanningAction = {
    id: createDraftId(),
    text: textResult.value,
    completed: false,
    createdAt: now
  };
  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      placeReferences: draft.placeReferences.map((item) => (
        item.logicalPlaceId === input.logicalPlaceId
          ? { ...item, planningActions: [...(item.planningActions || []), action] }
          : item
      )),
      updatedAt: now
    })
  };
}

export function updatePlacePlanningAction(
  state: TripDraftsState,
  draftId: string,
  input: UpdatePlacePlanningActionInput
): TripDraftMutationResult<TripDraftsState> {
  const textResult = validatePlanningActionTextInput(input.text);
  if ("error" in textResult) return { ok: false, error: textResult.error };
  const expectedText = normalizePlanningActionText(input.expectedCurrentText);
  if (!expectedText) return { ok: false, error: "stale_planning_action" };
  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  const reference = draft.placeReferences.find((item) => item.logicalPlaceId === input.logicalPlaceId);
  if (!reference) return { ok: false, error: "place_not_found" };
  const actions = reference.planningActions || [];
  const action = actions.find((item) => item.id === input.actionId);
  if (!action) return { ok: false, error: "planning_action_not_found" };
  if (action.text !== expectedText) return { ok: false, error: "stale_planning_action" };
  if (action.text === textResult.value) return { ok: true };

  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      placeReferences: draft.placeReferences.map((item) => (
        item.logicalPlaceId === input.logicalPlaceId
          ? {
              ...item,
              planningActions: actions.map((candidate) => (
                candidate.id === input.actionId ? { ...candidate, text: textResult.value } : candidate
              ))
            }
          : item
      )),
      updatedAt: isoNow()
    })
  };
}

export function togglePlacePlanningAction(
  state: TripDraftsState,
  draftId: string,
  input: PlacePlanningActionTargetInput
): TripDraftMutationResult<TripDraftsState> {
  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  const reference = draft.placeReferences.find((item) => item.logicalPlaceId === input.logicalPlaceId);
  if (!reference) return { ok: false, error: "place_not_found" };
  const actions = reference.planningActions || [];
  if (!actions.some((action) => action.id === input.actionId)) return { ok: false, error: "planning_action_not_found" };
  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      placeReferences: draft.placeReferences.map((item) => (
        item.logicalPlaceId === input.logicalPlaceId
          ? {
              ...item,
              planningActions: actions.map((action) => (
                action.id === input.actionId ? { ...action, completed: !action.completed } : action
              ))
            }
          : item
      )),
      updatedAt: isoNow()
    })
  };
}

export function removePlacePlanningAction(
  state: TripDraftsState,
  draftId: string,
  input: PlacePlanningActionTargetInput
): TripDraftMutationResult<TripDraftsState> {
  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  const reference = draft.placeReferences.find((item) => item.logicalPlaceId === input.logicalPlaceId);
  if (!reference) return { ok: false, error: "place_not_found" };
  const actions = reference.planningActions || [];
  if (!actions.some((action) => action.id === input.actionId)) return { ok: false, error: "planning_action_not_found" };
  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      placeReferences: draft.placeReferences.map((item) => (
        item.logicalPlaceId === input.logicalPlaceId
          ? { ...item, planningActions: actions.filter((action) => action.id !== input.actionId) }
          : item
      )),
      updatedAt: isoNow()
    })
  };
}

export function addPlacePhotoIds(
  state: TripDraftsState,
  draftId: string,
  input: PlacePhotoIdsInput
): TripDraftMutationResult<TripDraftsState> {
  const photoIds = validatePhotoIdsInput(input.photoIds);
  if (!photoIds) return { ok: false, error: "invalid_photo_id" };

  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  const reference = draft.placeReferences.find((item) => item.logicalPlaceId === input.logicalPlaceId);
  if (!reference) return { ok: false, error: "place_not_found" };

  const existing = reference.photoIds || [];
  const existingSet = new Set(existing);
  const nextIds = photoIds.filter((photoId) => !existingSet.has(photoId));
  if (nextIds.length === 0) return { ok: true };

  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      placeReferences: draft.placeReferences.map((item) => (
        item.logicalPlaceId === input.logicalPlaceId
          ? { ...item, photoIds: [...existing, ...nextIds] }
          : item
      )),
      updatedAt: isoNow()
    })
  };
}

export function removePlacePhotoId(
  state: TripDraftsState,
  draftId: string,
  input: PlacePhotoIdInput
): TripDraftMutationResult<TripDraftsState> {
  const photoId = readString(input.photoId);
  if (!photoId) return { ok: false, error: "invalid_photo_id" };

  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };
  const reference = draft.placeReferences.find((item) => item.logicalPlaceId === input.logicalPlaceId);
  if (!reference) return { ok: false, error: "place_not_found" };
  const existing = reference.photoIds || [];
  if (!existing.includes(photoId)) return { ok: false, error: "photo_not_found" };

  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      placeReferences: draft.placeReferences.map((item) => (
        item.logicalPlaceId === input.logicalPlaceId
          ? { ...item, photoIds: existing.filter((itemPhotoId) => itemPhotoId !== photoId) }
          : item
      )),
      updatedAt: isoNow()
    })
  };
}

export function moveTripPlaceGroup(
  state: TripDraftsState,
  draftId: string,
  input: MoveTripPlaceGroupInput
): TripDraftMutationResult<TripDraftsState> {
  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };

  const memberIds = normalizeUniqueTripPlaceMemberIds(input.memberIds);
  if (memberIds.length === 0 || memberIds.length !== input.memberIds.length) {
    return { ok: false, error: "invalid_place_group" };
  }

  const sourceTimeBlock = normalizeTripTimeBlockValue(input.expectedSourceTimeBlock);
  if (input.expectedSourceDayId === UNSCHEDULED_TRIP_DAY_ID || !draft.itineraryDays.some((day) => day.id === input.expectedSourceDayId)) {
    return { ok: false, error: "invalid_destination_day" };
  }
  if (input.expectedSourceTimeBlock !== null && !sourceTimeBlock) return { ok: false, error: "invalid_time_block" };

  const destinationResult = normalizeTripPlaceGroupDestination(draft, input.destinationDayId, input.destinationTimeBlock);
  if ("error" in destinationResult) return { ok: false, error: destinationResult.error };
  const { destinationDayId, destinationTimeBlock } = destinationResult.value;

  const referencesById = new Map(draft.placeReferences.map((reference) => [reference.logicalPlaceId, reference]));
  if (memberIds.some((memberId) => !referencesById.has(memberId))) return { ok: false, error: "place_not_found" };
  if (memberIds.some((memberId) => !sameTripPlaceGroup(referencesById.get(memberId)!, input.expectedSourceDayId, sourceTimeBlock || undefined))) {
    return { ok: false, error: "stale_place_group" };
  }
  if (input.expectedSourceDayId === destinationDayId && sameTimeBlock(sourceTimeBlock || undefined, destinationTimeBlock)) {
    return { ok: true };
  }

  const memberIdSet = new Set(memberIds);
  const sourceMembers = groupReferences(draft.placeReferences, input.expectedSourceDayId, sourceTimeBlock || undefined)
    .filter((reference) => memberIdSet.has(reference.logicalPlaceId));
  if (sourceMembers.length !== memberIds.length) return { ok: false, error: "stale_place_group" };

  const withoutMembers = draft.placeReferences.filter((reference) => !memberIdSet.has(reference.logicalPlaceId));
  const destinationReferences = groupReferences(withoutMembers, destinationDayId, destinationTimeBlock);
  const movedMembers = sourceMembers.map((reference, index): TripDraftPlaceReference => ({
    ...reference,
    dayId: destinationDayId,
    timeBlock: destinationDayId === UNSCHEDULED_TRIP_DAY_ID ? undefined : destinationTimeBlock,
    order: destinationReferences.length + index
  }));
  const now = isoNow();

  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      placeReferences: resequenceReferencesByDayAndTimeBlock([...withoutMembers, ...movedMembers]),
      updatedAt: now
    })
  };
}

export function moveTripPlaceWithinSection(
  state: TripDraftsState,
  draftId: string,
  logicalPlaceId: string,
  direction: "up" | "down"
): TripDraftMutationResult<TripDraftsState> {
  const current = normalizeTripDraftsState(state);
  const draft = current.drafts.find((item) => item.id === draftId);
  if (!draft) return { ok: false, error: "draft_not_found" };

  const moving = draft.placeReferences.find((reference) => reference.logicalPlaceId === logicalPlaceId);
  if (!moving) return { ok: false, error: "place_not_found" };

  const section = groupReferences(draft.placeReferences, moving.dayId, moving.timeBlock);
  const currentIndex = section.findIndex((reference) => reference.logicalPlaceId === logicalPlaceId);
  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= section.length) return { ok: true };

  const nextSection = [...section];
  const [reference] = nextSection.splice(currentIndex, 1);
  nextSection.splice(nextIndex, 0, reference);
  const nextSectionById = new Map(nextSection.map((reference, order) => [reference.logicalPlaceId, { ...reference, order }]));
  const nextReferences = draft.placeReferences.map((reference) => nextSectionById.get(reference.logicalPlaceId) || reference);

  return {
    ok: true,
    value: replaceDraft(current, {
      ...draft,
      placeReferences: resequenceReferencesByDayAndTimeBlock(nextReferences),
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
  const context = buildTripDraftContext(draft);
  const sections = [
    buildHydratedSection(UNSCHEDULED_TRIP_DAY_ID, "unscheduled" as const, null, null, false, draft.placeReferences, placesById),
    ...draft.itineraryDays.map((day) => {
      const date = getTripItineraryDayDate(draft, day);
      return buildHydratedSection(
        day.id,
        "day" as const,
        day,
        date,
        Boolean(date && draft.travelDates?.endDate && compareIsoDates(date, draft.travelDates.endDate) > 0),
        draft.placeReferences,
        placesById
      );
    })
  ];
  const places = sections.flatMap((section) => section.places);
  const availablePlaces = sections.flatMap((section) => section.availablePlaces);
  const unavailableReferences = sections.flatMap((section) => section.unavailableReferences);

  return {
    draft,
    context,
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
  date: string | null,
  isOutsideTravelDateRange: boolean,
  references: readonly TripDraftPlaceReference[],
  placesById: Map<string, SavedPlace>
): HydratedTripItinerarySection {
  const sectionReferences = sectionReferencesForHydration(references, id);
  const places = sectionReferences.map((reference) => {
    const place = placesById.get(reference.logicalPlaceId) || null;
    return { reference, place, isAvailable: place !== null };
  });
  const availablePlaces = places.flatMap((item) => item.place ? [item.place] : []);
  const unavailableReferences = places.flatMap((item) => item.place ? [] : [item.reference]);
  const timeBlocks = kind === "day"
    ? TRIP_TIME_BLOCK_ORDER.map((timeBlock) => buildHydratedTimeBlockSection(id, timeBlock, references, placesById))
    : undefined;

  return {
    id,
    kind,
    title: day?.title || "",
    day,
    date,
    isOutsideTravelDateRange,
    places,
    timeBlocks,
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

function buildHydratedTimeBlockSection(
  dayId: string,
  timeBlock: TripTimeBlock | null,
  references: readonly TripDraftPlaceReference[],
  placesById: Map<string, SavedPlace>
): HydratedTripTimeBlockSection {
  const group = groupReferences(references, dayId, timeBlock || undefined);
  const places = group.map((reference) => {
    const place = placesById.get(reference.logicalPlaceId) || null;
    return { reference, place, isAvailable: place !== null };
  });
  const availablePlaces = places.flatMap((item) => item.place ? [item.place] : []);
  const unavailableReferences = places.flatMap((item) => item.place ? [] : [item.reference]);
  return {
    id: timeBlock || "unassigned",
    timeBlock,
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

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function compareIsoDates(first: string, second: string): number {
  if (!isValidIsoDate(first) || !isValidIsoDate(second)) return 0;
  return first === second ? 0 : first < second ? -1 : 1;
}

export function getTripDurationDays(startDate: string, endDate: string): number | null {
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate) || compareIsoDates(endDate, startDate) < 0) return null;
  return Math.floor((isoDateToUtcTime(endDate) - isoDateToUtcTime(startDate)) / 86400000) + 1;
}

export function addDaysToIsoDate(startDate: string, offset: number): string | null {
  if (!isValidIsoDate(startDate) || !Number.isFinite(offset)) return null;
  const date = new Date(isoDateToUtcTime(startDate));
  date.setUTCDate(date.getUTCDate() + Math.floor(offset));
  return date.toISOString().slice(0, 10);
}

export function normalizeTripTimeBlock(value: unknown): TripTimeBlock | undefined {
  return value === "morning" || value === "afternoon" || value === "evening" ? value : undefined;
}

export function getTripItineraryDayDate(draft: TripDraft, day: TripItineraryDay): string | null {
  if (!draft.travelDates?.startDate || !isValidIsoDate(draft.travelDates.startDate)) return null;
  return addDaysToIsoDate(draft.travelDates.startDate, day.order);
}

export function getTripDateDayAlignment(draft: TripDraft): TripDateDayAlignment | null {
  const durationDays = draft.travelDates?.startDate && draft.travelDates.endDate
    ? getTripDurationDays(draft.travelDates.startDate, draft.travelDates.endDate)
    : null;
  if (!durationDays) return null;
  const itineraryDayCount = draft.itineraryDays.length;
  return {
    tripDurationDays: durationDays,
    itineraryDayCount,
    extraItineraryDays: Math.max(0, itineraryDayCount - durationDays),
    unusedTripDates: Math.max(0, durationDays - itineraryDayCount)
  };
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
  const placeReferences = resequenceReferencesByDayAndTimeBlock(Array.isArray(record.placeReferences)
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
    completionStatus: normalizeTripCompletionStatus(record.completionStatus),
    completedAt: normalizeTripCompletedAt(record.completedAt, record.completionStatus),
    source: normalizeSource(record.source),
    destination: normalizeTripDestination(record.destination),
    travelDates: normalizeTripTravelDates(record.travelDates),
    planningActions: normalizePlanningActions(record.planningActions),
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
  const dayId = normalizeReferenceDayId(record.dayId, validDayIds);
  const timeBlock = dayId === UNSCHEDULED_TRIP_DAY_ID ? undefined : normalizeTripTimeBlock(record.timeBlock);
  const planningNote = normalizeStoredTripPlacePlanningNote(record.planningNote);
  const visitStatus = normalizeTripPlaceVisitStatusForStorage(record.visitStatus);
  const planningActions = normalizePlanningActions(record.planningActions);
  const photoIds = normalizeTripPhotoIds(record.photoIds);
  return {
    logicalPlaceId,
    persistedReferences: Array.isArray(record.persistedReferences)
      ? uniquePersistedReferences(record.persistedReferences.map(normalizePersistedReference).filter(Boolean))
      : [],
    addedAt: validIsoString(record.addedAt) || isoNow(),
    dayId,
    timeBlock,
    planningNote,
    visitStatus,
    planningActions,
    photoIds,
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

function resequenceReferencesByDayAndTimeBlock(references: TripDraftPlaceReference[]) {
  const grouped = new Map<string, Array<{ reference: TripDraftPlaceReference; inputIndex: number }>>();
  references.forEach((reference, inputIndex) => {
    const groupKey = getTripPlaceGroupKey(reference.dayId, reference.timeBlock);
    const items = grouped.get(groupKey) || [];
    items.push({ reference, inputIndex });
    grouped.set(groupKey, items);
  });

  return references.map((reference) => getTripPlaceGroupKey(reference.dayId, reference.timeBlock))
    .filter((groupKey, index, groupKeys) => groupKeys.indexOf(groupKey) === index)
    .flatMap((groupKey) => (
    (grouped.get(groupKey) || [])
      .sort((left, right) => left.reference.order - right.reference.order || left.inputIndex - right.inputIndex)
      .map(({ reference }, order) => ({ ...reference, order }))
  ));
}

function sectionReferences(references: readonly TripDraftPlaceReference[], dayId: string) {
  return TRIP_TIME_BLOCK_ORDER.flatMap((timeBlock) => groupReferences(references, dayId, timeBlock || undefined));
}

function sectionReferencesForHydration(references: readonly TripDraftPlaceReference[], dayId: string) {
  return dayId === UNSCHEDULED_TRIP_DAY_ID
    ? groupReferences(references, dayId)
    : sectionReferences(references, dayId);
}

function groupReferences(references: readonly TripDraftPlaceReference[], dayId: string, timeBlock?: TripTimeBlock) {
  return references
    .filter((reference) => sameTripPlaceGroup(reference, dayId, timeBlock))
    .sort((left, right) => left.order - right.order);
}

function sameTripPlaceGroup(reference: TripDraftPlaceReference, dayId: string, timeBlock?: TripTimeBlock) {
  return reference.dayId === dayId && sameTimeBlock(reference.timeBlock, timeBlock);
}

function getTripPlaceGroupKey(dayId: string, timeBlock?: TripTimeBlock) {
  return `${dayId}:${timeBlock || "unassigned"}`;
}

function sameTimeBlock(left?: TripTimeBlock, right?: TripTimeBlock) {
  return (left || "") === (right || "");
}

function replaceDraft(state: TripDraftsState, nextDraft: TripDraft): TripDraftsState {
  return {
    ...state,
    drafts: state.drafts.map((draft) => draft.id === nextDraft.id ? normalizeTripDraft(nextDraft) || nextDraft : draft)
  };
}

function cloneTripDraft(draft: TripDraft): TripDraft {
  return {
    ...draft,
    source: draft.source ? { ...draft.source } : undefined,
    destination: draft.destination ? { ...draft.destination } : undefined,
    travelDates: draft.travelDates ? { ...draft.travelDates } : undefined,
    planningActions: draft.planningActions?.map(clonePlanningAction),
    itineraryDays: draft.itineraryDays.map((day) => ({ ...day })),
    placeReferences: draft.placeReferences.map((reference) => ({
      ...reference,
      persistedReferences: reference.persistedReferences.map((persisted) => ({ ...persisted })),
      planningActions: reference.planningActions?.map(clonePlanningAction),
      photoIds: reference.photoIds ? [...reference.photoIds] : undefined
    }))
  };
}

function clonePlanningAction(action: PlanningAction): PlanningAction {
  return { ...action };
}

function normalizeStatus(value: unknown): TripDraftStatus {
  return value === "planned" || value === "archived" ? value : "draft";
}

export function normalizeTripCompletionStatus(value: unknown): TripCompletionStatus {
  if (value === "active" || value === "completed" || value === "archived") return value;
  return "draft";
}

function normalizeTripCompletedAt(value: unknown, completionStatus: unknown): string | undefined {
  if (normalizeTripCompletionStatus(completionStatus) !== "completed") return undefined;
  return validIsoString(value) || undefined;
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

function normalizeTripDestination(value: unknown): TripDestination | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const label = readString(record.label).slice(0, TRIP_DRAFT_LIMITS.maxDestinationLabelLength);
  if (!label) return undefined;
  const city = readString(record.city).slice(0, TRIP_DRAFT_LIMITS.maxDestinationCityLength);
  const country = readString(record.country).slice(0, TRIP_DRAFT_LIMITS.maxDestinationCountryLength);
  const countryCode = normalizeCountryCode(record.countryCode);
  return {
    label,
    city: city || undefined,
    country: country || undefined,
    countryCode
  };
}

function normalizeTripTravelDates(value: unknown): TripTravelDates | undefined {
  const record = asRecord(value);
  if (!record || !isValidIsoDate(record.startDate)) return undefined;
  if (!record.endDate) return { startDate: record.startDate };
  if (!isValidIsoDate(record.endDate) || compareIsoDates(record.endDate, record.startDate) < 0) {
    return { startDate: record.startDate };
  }
  return {
    startDate: record.startDate,
    endDate: record.endDate
  };
}

function normalizeTripDetailsDestinationInput(value: UpdateTripDetailsInput["destination"]):
  | { ok: true; value?: TripDestination }
  | { ok: false; error: TripDraftMutationError } {
  if (value === undefined) return { ok: true };
  if (value === null) return { ok: true, value: undefined };
  const destination = normalizeTripDestination(value);
  if (!destination) return { ok: false, error: "invalid_destination" };
  return { ok: true, value: destination };
}

function normalizeTripDetailsDatesInput(value: UpdateTripDetailsInput["travelDates"]):
  | { ok: true; value?: TripTravelDates }
  | { ok: false; error: TripDraftMutationError } {
  if (value === undefined) return { ok: true };
  if (value === null) return { ok: true, value: undefined };
  if (!isValidIsoDate(value.startDate)) return { ok: false, error: "invalid_start_date" };
  if (!value.endDate) return { ok: true, value: { startDate: value.startDate } };
  if (!isValidIsoDate(value.endDate)) return { ok: false, error: "invalid_end_date" };
  if (compareIsoDates(value.endDate, value.startDate) < 0) return { ok: false, error: "end_date_before_start_date" };
  return { ok: true, value: { startDate: value.startDate, endDate: value.endDate } };
}

function buildTripDraftContext(draft: TripDraft): HydratedTripDraft["context"] {
  const durationDays = draft.travelDates?.startDate && draft.travelDates.endDate
    ? getTripDurationDays(draft.travelDates.startDate, draft.travelDates.endDate)
    : null;
  return {
    destination: draft.destination || null,
    travelDates: draft.travelDates || null,
    durationDays,
    itineraryDayCount: draft.itineraryDays.length,
    dateAlignment: getTripDateDayAlignment(draft)
  };
}

function sameDestination(left: TripDestination | undefined, right: TripDestination | undefined) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.label === right.label
    && (left.city || "") === (right.city || "")
    && (left.country || "") === (right.country || "")
    && (left.countryCode || "") === (right.countryCode || "");
}

function sameTravelDates(left: TripTravelDates | undefined, right: TripTravelDates | undefined) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.startDate === right.startDate && (left.endDate || "") === (right.endDate || "");
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

function normalizeTripPlaceGroupDestination(
  draft: TripDraft,
  dayIdValue: unknown,
  timeBlockValue: TripTimeBlock | null
): { ok: true; value: { destinationDayId: string; destinationTimeBlock?: TripTimeBlock } } | { ok: false; error: TripDraftMutationError } {
  const destinationDayId = normalizeDestinationDayId(dayIdValue, draft.itineraryDays);
  if (!destinationDayId) return { ok: false, error: "invalid_destination_day" };
  if (destinationDayId === UNSCHEDULED_TRIP_DAY_ID) {
    return timeBlockValue === null
      ? { ok: true, value: { destinationDayId } }
      : { ok: false, error: "invalid_time_block" };
  }

  const destinationTimeBlock = normalizeTripTimeBlockValue(timeBlockValue);
  if (timeBlockValue !== null && !destinationTimeBlock) return { ok: false, error: "invalid_time_block" };
  return { ok: true, value: { destinationDayId, destinationTimeBlock } };
}

function normalizeTripTimeBlockValue(value: TripTimeBlock | null) {
  return value === null ? undefined : normalizeTripTimeBlock(value);
}

function normalizeUniqueTripPlaceMemberIds(value: readonly string[]) {
  const seen = new Set<string>();
  return value.flatMap((memberId) => {
    const id = readString(memberId);
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [id];
  });
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

function normalizeGeneratedDayTitles(value: unknown, expectedCount: number) {
  if (!Array.isArray(value) || value.length !== expectedCount) return null;
  const titles: string[] = [];
  for (const item of value) {
    const title = readString(item);
    if (!title || title.length > TRIP_DRAFT_LIMITS.maxDayTitleLength) return null;
    titles.push(title);
  }
  return titles;
}

function normalizeCountryCode(value: unknown) {
  const code = readString(value).toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
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

function isoDateToUtcTime(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
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
