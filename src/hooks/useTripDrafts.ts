import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addPlacePlanningAction as addPlacePlanningActionDomain,
  addPlacePhotoIds as addPlacePhotoIdsDomain,
  addPlaceToTripDraft,
  addTripPlanningAction as addTripPlanningActionDomain,
  createTripDraft,
  createTripDraftFromCollection,
  createTripDraftWithPlace,
  createMissingTripItineraryDays,
  createTripDay,
  deleteTripDraft,
  deleteTripDay,
  duplicateTripDraft,
  hydrateTripDrafts,
  moveTripPlace,
  moveTripPlaceGroup,
  moveTripPlaceWithinSection,
  readTripDrafts,
  removePlacePlanningAction as removePlacePlanningActionDomain,
  removePlacePhotoId as removePlacePhotoIdDomain,
  removePlaceFromTripDraft,
  removeTripPlanningAction as removeTripPlanningActionDomain,
  renameTripDay,
  renameTripDraft,
  restoreTripDraftSnapshot,
  setTripPlaceTimeBlock,
  TRIP_DRAFTS_STORAGE_KEY,
  togglePlacePlanningAction as togglePlacePlanningActionDomain,
  toggleTripPlanningAction as toggleTripPlanningActionDomain,
  updateTripDetails,
  updatePlacePlanningAction as updatePlacePlanningActionDomain,
  updateTripPlanningAction as updateTripPlanningActionDomain,
  updateTripPlaceNote,
  updateTripPlaceVisitStatus,
  writeTripDrafts,
  savedPlaceToTripDraftReferenceInput,
  type AddPlacePlanningActionInput,
  type AddPlanningActionInput,
  type HydratedTripDraft,
  type PlacePlanningActionTargetInput,
  type PlacePhotoIdInput,
  type PlacePhotoIdsInput,
  type PlanningActionTargetInput,
  type TripDraft,
  type TripDraftMutationResult,
  type TripDraftMutationError,
  type TripDraftsState,
  type TripItineraryDay,
  type MoveTripPlaceGroupInput,
  type UpdatePlacePlanningActionInput,
  type UpdatePlanningActionInput,
  type TripTimeBlock,
  type UpdateTripPlaceNoteInput,
  type UpdateTripPlaceVisitStatusInput,
  type UpdateTripDetailsInput
} from "../lib/tripDrafts";
import type { PlaceCollection } from "../lib/placeCollections";
import type { SavedPlace } from "../lib/savedPlaces";

type TripDraftCreateInput = {
  name: string;
};

export type TripDraftUndoActionType =
  | "rename-draft"
  | "update-details"
  | "create-days"
  | "add-day"
  | "rename-day"
  | "delete-day"
  | "move-place"
  | "set-time-block"
  | "reorder-place"
  | "remove-place"
  | "add-place"
  | "move-place-group"
  | "update-place-note"
  | "update-place-status"
  | "add-trip-action"
  | "update-trip-action"
  | "toggle-trip-action"
  | "remove-trip-action"
  | "add-place-action"
  | "update-place-action"
  | "toggle-place-action"
  | "remove-place-action";

export type TripDraftUndoState = {
  available: boolean;
  actionType: TripDraftUndoActionType | null;
  affectedCount?: number;
  expiresAt?: number;
};

export type TripDraftUndoResult = TripDraftMutationResult<TripDraftsState> & {
  stale?: boolean;
};

const TRIP_DRAFT_UNDO_DURATION_MS = 10_000;

type UseTripDraftsResult = {
  drafts: TripDraft[];
  hydratedDrafts: HydratedTripDraft[];
  draftPlaceMembership: Map<string, Set<string>>;
  error: TripDraftMutationError | null;
  undoState: TripDraftUndoState;
  createDraft: (input: TripDraftCreateInput) => TripDraft | null;
  createDraftFromCollection: (collection: PlaceCollection, input?: { name?: string }) => TripDraft | null;
  renameDraft: (draftId: string, input: TripDraftCreateInput) => boolean;
  duplicateDraft: (draftId: string, input?: { name?: string }) => TripDraft | null;
  deleteDraft: (draftId: string) => boolean;
  removePlaceFromDraft: (draftId: string, logicalPlaceId: string) => boolean;
  removePlaceFromDraftPermanently: (draftId: string, logicalPlaceId: string) => boolean;
  createDay: (draftId: string, input: { title: string }) => boolean;
  createMissingDays: (
    draftId: string,
    titles: string[]
  ) => TripDraftMutationResult<{ state: TripDraftsState; createdDays: TripItineraryDay[] }>;
  renameDay: (draftId: string, dayId: string, input: { title: string }) => boolean;
  deleteDay: (draftId: string, dayId: string) => boolean;
  movePlace: (draftId: string, logicalPlaceId: string, destination: { dayId: string; index?: number }) => boolean;
  movePlaceGroup: (draftId: string, input: MoveTripPlaceGroupInput) => TripDraftMutationResult<TripDraftsState>;
  movePlaceWithinSection: (
    draftId: string,
    logicalPlaceId: string,
    direction: "up" | "down"
  ) => TripDraftMutationResult<TripDraftsState>;
  setPlaceTimeBlock: (
    draftId: string,
    logicalPlaceId: string,
    timeBlock: TripTimeBlock | null
  ) => TripDraftMutationResult<TripDraftsState>;
  updateDetails: (draftId: string, input: UpdateTripDetailsInput) => TripDraftMutationResult<TripDraftsState>;
  updatePlaceNote: (draftId: string, input: UpdateTripPlaceNoteInput) => TripDraftMutationResult<TripDraftsState>;
  updatePlaceVisitStatus: (draftId: string, input: UpdateTripPlaceVisitStatusInput) => TripDraftMutationResult<TripDraftsState>;
  addTripPlanningAction: (draftId: string, input: AddPlanningActionInput) => TripDraftMutationResult<TripDraftsState>;
  updateTripPlanningAction: (draftId: string, input: UpdatePlanningActionInput) => TripDraftMutationResult<TripDraftsState>;
  toggleTripPlanningAction: (draftId: string, input: PlanningActionTargetInput) => TripDraftMutationResult<TripDraftsState>;
  removeTripPlanningAction: (draftId: string, input: PlanningActionTargetInput) => TripDraftMutationResult<TripDraftsState>;
  addPlacePlanningAction: (draftId: string, input: AddPlacePlanningActionInput) => TripDraftMutationResult<TripDraftsState>;
  updatePlacePlanningAction: (draftId: string, input: UpdatePlacePlanningActionInput) => TripDraftMutationResult<TripDraftsState>;
  togglePlacePlanningAction: (draftId: string, input: PlacePlanningActionTargetInput) => TripDraftMutationResult<TripDraftsState>;
  removePlacePlanningAction: (draftId: string, input: PlacePlanningActionTargetInput) => TripDraftMutationResult<TripDraftsState>;
  addPlacePhotoIds: (draftId: string, input: PlacePhotoIdsInput) => TripDraftMutationResult<TripDraftsState>;
  removePlacePhotoId: (draftId: string, input: PlacePhotoIdInput) => TripDraftMutationResult<TripDraftsState>;
  addPlaceToDraft: (draftId: string, place: SavedPlace) => TripDraftMutationResult<TripDraftsState>;
  createDraftWithPlace: (input: { name: string; place: SavedPlace }) => TripDraftMutationResult<{ state: TripDraftsState; draft: TripDraft }>;
  undoLastMutation: () => TripDraftUndoResult;
  clearUndo: () => void;
  refreshDrafts: () => void;
};

export function useTripDrafts(savedPlaces: readonly SavedPlace[]): UseTripDraftsResult {
  const [state, setState] = useState<TripDraftsState>(() => readTripDrafts());
  const [error, setError] = useState<TripDraftMutationError | null>(null);
  const [undoState, setUndoState] = useState<TripDraftUndoState>({ available: false, actionType: null });
  const stateRef = useRef(state);
  const undoEntryRef = useRef<TripDraftUndoEntry | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearUndo = useCallback(() => {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    undoEntryRef.current = null;
    setUndoState({ available: false, actionType: null });
  }, []);

  const refreshDrafts = useCallback(() => {
    const nextState = readTripDrafts();
    stateRef.current = nextState;
    setState(nextState);
    setError(null);
    const undoEntry = undoEntryRef.current;
    if (undoEntry && !canApplyTripDraftUndo(nextState, undoEntry)) clearUndo();
  }, [clearUndo]);

  useEffect(() => () => {
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === TRIP_DRAFTS_STORAGE_KEY) refreshDrafts();
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refreshDrafts]);

  const persist = useCallback((nextState: TripDraftsState) => {
    const result = writeTripDrafts(nextState);
    if (!result.ok || !result.value) {
      setError(result.error || "storage_write_failed");
      return false;
    }
    stateRef.current = result.value;
    setState(result.value);
    setError(null);
    return true;
  }, []);

  const activateUndo = useCallback((
    before: TripDraft,
    after: TripDraft,
    actionType: TripDraftUndoActionType,
    affectedCount?: number
  ) => {
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    const createdAt = Date.now();
    const expiresAt = createdAt + TRIP_DRAFT_UNDO_DURATION_MS;
    const entry: TripDraftUndoEntry = {
      tripDraftId: before.id,
      before: cloneTripDraftForUndo(before),
      afterUpdatedAt: after.updatedAt,
      actionType,
      affectedCount,
      createdAt,
      expiresAt
    };
    undoEntryRef.current = entry;
    setUndoState({ available: true, actionType, affectedCount, expiresAt });
    undoTimerRef.current = window.setTimeout(() => {
      undoEntryRef.current = null;
      undoTimerRef.current = null;
      setUndoState({ available: false, actionType: null });
    }, TRIP_DRAFT_UNDO_DURATION_MS);
  }, []);

  const commitUndoableState = useCallback((
    beforeState: TripDraftsState,
    nextState: TripDraftsState,
    draftId: string,
    actionType: TripDraftUndoActionType,
    affectedCount?: number
  ) => {
    const beforeDraft = beforeState.drafts.find((draft) => draft.id === draftId);
    const afterDraft = nextState.drafts.find((draft) => draft.id === draftId);
    if (!beforeDraft || !afterDraft || !tripDraftChanged(beforeDraft, afterDraft)) return true;
    if (!persist(nextState)) return false;
    activateUndo(beforeDraft, afterDraft, actionType, affectedCount);
    return true;
  }, [activateUndo, clearUndo, persist]);

  const undoLastMutation = useCallback((): TripDraftUndoResult => {
    const entry = undoEntryRef.current;
    if (!entry) return { ok: false, error: "stale_place_group", stale: true };
    if (isTripDraftUndoExpired(entry)) {
      clearUndo();
      return { ok: false, error: "stale_place_group", stale: true };
    }
    if (!canApplyTripDraftUndo(stateRef.current, entry)) {
      clearUndo();
      return { ok: false, error: "stale_place_group", stale: true };
    }

    const result = restoreTripDraftSnapshot(stateRef.current, entry.before, new Date().toISOString());
    if (!result.ok || !result.value) {
      setError(result.error || "storage_write_failed");
      return result;
    }
    const persisted = writeTripDrafts(result.value);
    if (!persisted.ok || !persisted.value) {
      setError(persisted.error || "storage_write_failed");
      return { ok: false, error: persisted.error || "storage_write_failed" };
    }
    stateRef.current = persisted.value;
    setState(persisted.value);
    setError(null);
    clearUndo();
    return { ok: true, value: persisted.value };
  }, [clearUndo]);

  const createDraft = useCallback((input: TripDraftCreateInput) => {
    const result = createTripDraft(stateRef.current, input);
    if (!result.ok || !result.value) {
      setError(result.error || "invalid_name");
      return null;
    }
    if (!persist(result.value.state)) return null;
    clearUndo();
    return result.value.draft;
  }, [clearUndo, persist]);

  const createDraftFromCollection = useCallback((collection: PlaceCollection, input: { name?: string } = {}) => {
    const result = createTripDraftFromCollection(stateRef.current, collection, input);
    if (!result.ok || !result.value) {
      setError(result.error || "invalid_name");
      return null;
    }
    if (!persist(result.value.state)) return null;
    clearUndo();
    return result.value.draft;
  }, [clearUndo, persist]);

  const renameDraft = useCallback((draftId: string, input: TripDraftCreateInput) => {
    const beforeState = stateRef.current;
    const result = renameTripDraft(beforeState, draftId, input);
    if (!result.ok || !result.value) {
      setError(result.error || "draft_not_found");
      return false;
    }
    return commitUndoableState(beforeState, result.value, draftId, "rename-draft");
  }, [commitUndoableState]);

  const duplicateDraft = useCallback((draftId: string, input: { name?: string } = {}) => {
    const result = duplicateTripDraft(stateRef.current, draftId, input);
    if (!result.ok || !result.value) {
      setError(result.error || "draft_not_found");
      return null;
    }
    if (!persist(result.value.state)) return null;
    clearUndo();
    return result.value.draft;
  }, [clearUndo, persist]);

  const deleteDraft = useCallback((draftId: string) => {
    const result = deleteTripDraft(stateRef.current, draftId);
    if (!result.ok || !result.value) {
      setError(result.error || "draft_not_found");
      return false;
    }
    if (!persist(result.value)) return false;
    clearUndo();
    return true;
  }, [clearUndo, persist]);

  const removePlaceFromDraft = useCallback((draftId: string, logicalPlaceId: string) => {
    const beforeState = stateRef.current;
    const result = removePlaceFromTripDraft(beforeState, draftId, logicalPlaceId);
    if (!result.ok || !result.value) {
      setError(result.error || "draft_not_found");
      return false;
    }
    return commitUndoableState(beforeState, result.value, draftId, "remove-place", 1);
  }, [commitUndoableState]);

  const removePlaceFromDraftPermanently = useCallback((draftId: string, logicalPlaceId: string) => {
    const result = removePlaceFromTripDraft(stateRef.current, draftId, logicalPlaceId);
    if (!result.ok || !result.value) {
      setError(result.error || "draft_not_found");
      return false;
    }
    if (!persist(result.value)) return false;
    clearUndo();
    return true;
  }, [clearUndo, persist]);

  const createDay = useCallback((draftId: string, input: { title: string }) => {
    const beforeState = stateRef.current;
    const result = createTripDay(beforeState, draftId, input);
    if (!result.ok || !result.value) {
      setError(result.error || "invalid_day_title");
      return false;
    }
    return commitUndoableState(beforeState, result.value.state, draftId, "add-day", 1);
  }, [commitUndoableState]);

  const createMissingDays = useCallback((
    draftId: string,
    titles: string[]
  ): TripDraftMutationResult<{ state: TripDraftsState; createdDays: TripItineraryDay[] }> => {
    const beforeState = stateRef.current;
    const result = createMissingTripItineraryDays(beforeState, draftId, { titles });
    if (!result.ok || !result.value) {
      setError(result.error || "no_missing_itinerary_days");
      return result;
    }
    return commitUndoableState(beforeState, result.value.state, draftId, "create-days", result.value.createdDays.length)
      ? result
      : { ok: false, error: "storage_write_failed" };
  }, [commitUndoableState]);

  const renameDay = useCallback((draftId: string, dayId: string, input: { title: string }) => {
    const beforeState = stateRef.current;
    const result = renameTripDay(beforeState, draftId, dayId, input);
    if (!result.ok || !result.value) {
      setError(result.error || "day_not_found");
      return false;
    }
    return commitUndoableState(beforeState, result.value, draftId, "rename-day", 1);
  }, [commitUndoableState]);

  const deleteDay = useCallback((draftId: string, dayId: string) => {
    const beforeState = stateRef.current;
    const result = deleteTripDay(beforeState, draftId, dayId);
    if (!result.ok || !result.value) {
      setError(result.error || "day_not_found");
      return false;
    }
    return commitUndoableState(beforeState, result.value, draftId, "delete-day", 1);
  }, [commitUndoableState]);

  const movePlace = useCallback((draftId: string, logicalPlaceId: string, destination: { dayId: string; index?: number }) => {
    const beforeState = stateRef.current;
    const result = moveTripPlace(beforeState, draftId, logicalPlaceId, destination);
    if (!result.ok || !result.value) {
      setError(result.error || "place_not_found");
      return false;
    }
    return commitUndoableState(beforeState, result.value, draftId, "move-place", 1);
  }, [commitUndoableState]);

  const movePlaceGroup = useCallback((
    draftId: string,
    input: MoveTripPlaceGroupInput
  ): TripDraftMutationResult<TripDraftsState> => {
    const beforeState = stateRef.current;
    const result = moveTripPlaceGroup(beforeState, draftId, input);
    if (!result.ok) {
      setError(result.error || "invalid_place_group");
      return result;
    }
    if (!result.value) {
      setError(null);
      return result;
    }
    return commitUndoableState(beforeState, result.value, draftId, "move-place-group", input.memberIds.length)
      ? result
      : { ok: false, error: "storage_write_failed" };
  }, [commitUndoableState]);

  const movePlaceWithinSection = useCallback((
    draftId: string,
    logicalPlaceId: string,
    direction: "up" | "down"
  ): TripDraftMutationResult<TripDraftsState> => {
    const beforeState = stateRef.current;
    const result = moveTripPlaceWithinSection(beforeState, draftId, logicalPlaceId, direction);
    if (!result.ok) {
      setError(result.error || "place_not_found");
      return result;
    }
    if (!result.value) {
      setError(null);
      return result;
    }
    return commitUndoableState(beforeState, result.value, draftId, "reorder-place", 1)
      ? result
      : { ok: false, error: "storage_write_failed" };
  }, [commitUndoableState]);

  const setPlaceTimeBlock = useCallback((
    draftId: string,
    logicalPlaceId: string,
    timeBlock: TripTimeBlock | null
  ): TripDraftMutationResult<TripDraftsState> => {
    const beforeState = stateRef.current;
    const result = setTripPlaceTimeBlock(beforeState, draftId, logicalPlaceId, timeBlock);
    if (!result.ok) {
      setError(result.error || "invalid_time_block");
      return result;
    }
    if (!result.value) {
      setError(null);
      return result;
    }
    return commitUndoableState(beforeState, result.value, draftId, "set-time-block", 1)
      ? result
      : { ok: false, error: "storage_write_failed" };
  }, [commitUndoableState]);

  const updateDetails = useCallback((draftId: string, input: UpdateTripDetailsInput): TripDraftMutationResult<TripDraftsState> => {
    const beforeState = stateRef.current;
    const result = updateTripDetails(beforeState, draftId, input);
    if (!result.ok) {
      setError(result.error || "draft_not_found");
      return result;
    }
    if (!result.value) {
      setError(null);
      return result;
    }
    return commitUndoableState(beforeState, result.value, draftId, "update-details")
      ? result
      : { ok: false, error: "storage_write_failed" };
  }, [commitUndoableState]);

  const updatePlaceNote = useCallback((draftId: string, input: UpdateTripPlaceNoteInput): TripDraftMutationResult<TripDraftsState> => {
    const beforeState = stateRef.current;
    const result = updateTripPlaceNote(beforeState, draftId, input);
    if (!result.ok) {
      setError(result.error || "place_not_found");
      return result;
    }
    if (!result.value) {
      setError(null);
      return result;
    }
    return commitUndoableState(beforeState, result.value, draftId, "update-place-note", 1)
      ? result
      : { ok: false, error: "storage_write_failed" };
  }, [commitUndoableState]);

  const updatePlaceVisitStatus = useCallback((
    draftId: string,
    input: UpdateTripPlaceVisitStatusInput
  ): TripDraftMutationResult<TripDraftsState> => {
    const beforeState = stateRef.current;
    const result = updateTripPlaceVisitStatus(beforeState, draftId, input);
    if (!result.ok) {
      setError(result.error || "place_not_found");
      return result;
    }
    if (!result.value) {
      setError(null);
      return result;
    }
    return commitUndoableState(beforeState, result.value, draftId, "update-place-status", 1)
      ? result
      : { ok: false, error: "storage_write_failed" };
  }, [commitUndoableState]);

  const submitTripPlanningActionMutation = useCallback((
    draftId: string,
    result: TripDraftMutationResult<TripDraftsState>,
    actionType: TripDraftUndoActionType,
    beforeState: TripDraftsState
  ): TripDraftMutationResult<TripDraftsState> => {
    if (!result.ok) {
      setError(result.error || "invalid_planning_action");
      return result;
    }
    if (!result.value) {
      setError(null);
      return result;
    }
    return commitUndoableState(beforeState, result.value, draftId, actionType, 1)
      ? result
      : { ok: false, error: "storage_write_failed" };
  }, [commitUndoableState]);

  const addTripPlanningAction = useCallback((draftId: string, input: AddPlanningActionInput): TripDraftMutationResult<TripDraftsState> => {
    const beforeState = stateRef.current;
    return submitTripPlanningActionMutation(
      draftId,
      addTripPlanningActionDomain(beforeState, draftId, input),
      "add-trip-action",
      beforeState
    );
  }, [submitTripPlanningActionMutation]);

  const updateTripPlanningAction = useCallback((draftId: string, input: UpdatePlanningActionInput): TripDraftMutationResult<TripDraftsState> => {
    const beforeState = stateRef.current;
    return submitTripPlanningActionMutation(
      draftId,
      updateTripPlanningActionDomain(beforeState, draftId, input),
      "update-trip-action",
      beforeState
    );
  }, [submitTripPlanningActionMutation]);

  const toggleTripPlanningAction = useCallback((draftId: string, input: PlanningActionTargetInput): TripDraftMutationResult<TripDraftsState> => {
    const beforeState = stateRef.current;
    return submitTripPlanningActionMutation(
      draftId,
      toggleTripPlanningActionDomain(beforeState, draftId, input),
      "toggle-trip-action",
      beforeState
    );
  }, [submitTripPlanningActionMutation]);

  const removeTripPlanningAction = useCallback((draftId: string, input: PlanningActionTargetInput): TripDraftMutationResult<TripDraftsState> => {
    const beforeState = stateRef.current;
    return submitTripPlanningActionMutation(
      draftId,
      removeTripPlanningActionDomain(beforeState, draftId, input),
      "remove-trip-action",
      beforeState
    );
  }, [submitTripPlanningActionMutation]);

  const addPlacePlanningAction = useCallback((draftId: string, input: AddPlacePlanningActionInput): TripDraftMutationResult<TripDraftsState> => {
    const beforeState = stateRef.current;
    return submitTripPlanningActionMutation(
      draftId,
      addPlacePlanningActionDomain(beforeState, draftId, input),
      "add-place-action",
      beforeState
    );
  }, [submitTripPlanningActionMutation]);

  const updatePlacePlanningAction = useCallback((draftId: string, input: UpdatePlacePlanningActionInput): TripDraftMutationResult<TripDraftsState> => {
    const beforeState = stateRef.current;
    return submitTripPlanningActionMutation(
      draftId,
      updatePlacePlanningActionDomain(beforeState, draftId, input),
      "update-place-action",
      beforeState
    );
  }, [submitTripPlanningActionMutation]);

  const togglePlacePlanningAction = useCallback((draftId: string, input: PlacePlanningActionTargetInput): TripDraftMutationResult<TripDraftsState> => {
    const beforeState = stateRef.current;
    return submitTripPlanningActionMutation(
      draftId,
      togglePlacePlanningActionDomain(beforeState, draftId, input),
      "toggle-place-action",
      beforeState
    );
  }, [submitTripPlanningActionMutation]);

  const removePlacePlanningAction = useCallback((draftId: string, input: PlacePlanningActionTargetInput): TripDraftMutationResult<TripDraftsState> => {
    const beforeState = stateRef.current;
    return submitTripPlanningActionMutation(
      draftId,
      removePlacePlanningActionDomain(beforeState, draftId, input),
      "remove-place-action",
      beforeState
    );
  }, [submitTripPlanningActionMutation]);

  const commitNonUndoablePhotoMutation = useCallback((result: TripDraftMutationResult<TripDraftsState>) => {
    if (!result.ok) {
      setError(result.error || "storage_write_failed");
      return result;
    }
    if (!result.value) {
      setError(null);
      return result;
    }
    if (!persist(result.value)) return { ok: false, error: "storage_write_failed" as const };
    clearUndo();
    return result;
  }, [clearUndo, persist]);

  const addPlacePhotoIds = useCallback((draftId: string, input: PlacePhotoIdsInput): TripDraftMutationResult<TripDraftsState> => {
    return commitNonUndoablePhotoMutation(addPlacePhotoIdsDomain(stateRef.current, draftId, input));
  }, [commitNonUndoablePhotoMutation]);

  const removePlacePhotoId = useCallback((draftId: string, input: PlacePhotoIdInput): TripDraftMutationResult<TripDraftsState> => {
    return commitNonUndoablePhotoMutation(removePlacePhotoIdDomain(stateRef.current, draftId, input));
  }, [commitNonUndoablePhotoMutation]);

  const addPlaceToDraft = useCallback((draftId: string, place: SavedPlace): TripDraftMutationResult<TripDraftsState> => {
    const input = savedPlaceToTripDraftReferenceInput(place);
    if (!input) {
      const result: TripDraftMutationResult<TripDraftsState> = { ok: false, error: "invalid_place_reference" };
      setError(result.error);
      return result;
    }

    const beforeState = stateRef.current;
    const result = addPlaceToTripDraft(beforeState, draftId, input);
    if (!result.ok || !result.value) {
      setError(result.error || "draft_not_found");
      return result;
    }
    return commitUndoableState(beforeState, result.value, draftId, "add-place", 1)
      ? { ok: true, value: result.value }
      : { ok: false, error: "storage_write_failed" };
  }, [commitUndoableState]);

  const createDraftWithPlace = useCallback((input: { name: string; place: SavedPlace }): TripDraftMutationResult<{ state: TripDraftsState; draft: TripDraft }> => {
    const placeInput = savedPlaceToTripDraftReferenceInput(input.place);
    if (!placeInput) {
      const result: TripDraftMutationResult<{ state: TripDraftsState; draft: TripDraft }> = { ok: false, error: "invalid_place_reference" };
      setError(result.error);
      return result;
    }

    const result = createTripDraftWithPlace(stateRef.current, { name: input.name, place: placeInput });
    if (!result.ok || !result.value) {
      setError(result.error || "invalid_name");
      return result;
    }
    if (!persist(result.value.state)) return { ok: false, error: "storage_write_failed" };
    clearUndo();
    return result;
  }, [clearUndo, persist]);

  const hydratedDrafts = useMemo(
    () => hydrateTripDrafts(state, savedPlaces),
    [savedPlaces, state]
  );
  const draftPlaceMembership = useMemo(() => {
    const membership = new Map<string, Set<string>>();
    state.drafts.forEach((draft) => {
      membership.set(draft.id, new Set(draft.placeReferences.map((reference) => reference.logicalPlaceId)));
    });
    return membership;
  }, [state.drafts]);

  return {
    drafts: state.drafts,
    hydratedDrafts,
    draftPlaceMembership,
    error,
    undoState,
    createDraft,
    createDraftFromCollection,
    renameDraft,
    duplicateDraft,
    deleteDraft,
    removePlaceFromDraft,
    removePlaceFromDraftPermanently,
    createDay,
    createMissingDays,
    renameDay,
    deleteDay,
    movePlace,
    movePlaceGroup,
    movePlaceWithinSection,
    setPlaceTimeBlock,
    updateDetails,
    updatePlaceNote,
    updatePlaceVisitStatus,
    addTripPlanningAction,
    updateTripPlanningAction,
    toggleTripPlanningAction,
    removeTripPlanningAction,
    addPlacePlanningAction,
    updatePlacePlanningAction,
    togglePlacePlanningAction,
    removePlacePlanningAction,
    addPlacePhotoIds,
    removePlacePhotoId,
    addPlaceToDraft,
    createDraftWithPlace,
    undoLastMutation,
    clearUndo,
    refreshDrafts
  };
}

type TripDraftUndoEntry = {
  tripDraftId: string;
  before: TripDraft;
  afterUpdatedAt: string;
  actionType: TripDraftUndoActionType;
  affectedCount?: number;
  createdAt: number;
  expiresAt: number;
};

function cloneTripDraftForUndo(draft: TripDraft): TripDraft {
  return {
    ...draft,
    source: draft.source ? { ...draft.source } : undefined,
    destination: draft.destination ? { ...draft.destination } : undefined,
    travelDates: draft.travelDates ? { ...draft.travelDates } : undefined,
    planningActions: draft.planningActions?.map((action) => ({ ...action })),
    itineraryDays: draft.itineraryDays.map((day) => ({ ...day })),
    placeReferences: draft.placeReferences.map((reference) => ({
      ...reference,
      persistedReferences: reference.persistedReferences.map((persisted) => ({ ...persisted })),
      planningActions: reference.planningActions?.map((action) => ({ ...action })),
      photoIds: reference.photoIds ? [...reference.photoIds] : undefined
    }))
  };
}

function tripDraftChanged(before: TripDraft, after: TripDraft) {
  return JSON.stringify(before) !== JSON.stringify(after);
}

function canApplyTripDraftUndo(state: TripDraftsState, entry: TripDraftUndoEntry) {
  const currentDraft = state.drafts.find((draft) => draft.id === entry.tripDraftId);
  return Boolean(currentDraft && currentDraft.updatedAt === entry.afterUpdatedAt);
}

function isTripDraftUndoExpired(entry: TripDraftUndoEntry) {
  return Date.now() >= entry.expiresAt;
}
