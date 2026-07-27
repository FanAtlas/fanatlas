import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addPlaceToTripDraft,
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
  removePlaceFromTripDraft,
  renameTripDay,
  renameTripDraft,
  setTripPlaceTimeBlock,
  TRIP_DRAFTS_STORAGE_KEY,
  updateTripDetails,
  writeTripDrafts,
  savedPlaceToTripDraftReferenceInput,
  type HydratedTripDraft,
  type TripDraft,
  type TripDraftMutationResult,
  type TripDraftMutationError,
  type TripDraftsState,
  type TripItineraryDay,
  type MoveTripPlaceGroupInput,
  type TripTimeBlock,
  type UpdateTripDetailsInput
} from "../lib/tripDrafts";
import type { PlaceCollection } from "../lib/placeCollections";
import type { SavedPlace } from "../lib/savedPlaces";

type TripDraftCreateInput = {
  name: string;
};

type UseTripDraftsResult = {
  drafts: TripDraft[];
  hydratedDrafts: HydratedTripDraft[];
  draftPlaceMembership: Map<string, Set<string>>;
  error: TripDraftMutationError | null;
  createDraft: (input: TripDraftCreateInput) => TripDraft | null;
  createDraftFromCollection: (collection: PlaceCollection, input?: { name?: string }) => TripDraft | null;
  renameDraft: (draftId: string, input: TripDraftCreateInput) => boolean;
  duplicateDraft: (draftId: string, input?: { name?: string }) => TripDraft | null;
  deleteDraft: (draftId: string) => boolean;
  removePlaceFromDraft: (draftId: string, logicalPlaceId: string) => boolean;
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
  addPlaceToDraft: (draftId: string, place: SavedPlace) => TripDraftMutationResult<TripDraftsState>;
  createDraftWithPlace: (input: { name: string; place: SavedPlace }) => TripDraftMutationResult<{ state: TripDraftsState; draft: TripDraft }>;
  refreshDrafts: () => void;
};

export function useTripDrafts(savedPlaces: readonly SavedPlace[]): UseTripDraftsResult {
  const [state, setState] = useState<TripDraftsState>(() => readTripDrafts());
  const [error, setError] = useState<TripDraftMutationError | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refreshDrafts = useCallback(() => {
    const nextState = readTripDrafts();
    stateRef.current = nextState;
    setState(nextState);
    setError(null);
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

  const createDraft = useCallback((input: TripDraftCreateInput) => {
    const result = createTripDraft(stateRef.current, input);
    if (!result.ok || !result.value) {
      setError(result.error || "invalid_name");
      return null;
    }
    return persist(result.value.state) ? result.value.draft : null;
  }, [persist]);

  const createDraftFromCollection = useCallback((collection: PlaceCollection, input: { name?: string } = {}) => {
    const result = createTripDraftFromCollection(stateRef.current, collection, input);
    if (!result.ok || !result.value) {
      setError(result.error || "invalid_name");
      return null;
    }
    return persist(result.value.state) ? result.value.draft : null;
  }, [persist]);

  const renameDraft = useCallback((draftId: string, input: TripDraftCreateInput) => {
    const result = renameTripDraft(stateRef.current, draftId, input);
    if (!result.ok || !result.value) {
      setError(result.error || "draft_not_found");
      return false;
    }
    return persist(result.value);
  }, [persist]);

  const duplicateDraft = useCallback((draftId: string, input: { name?: string } = {}) => {
    const result = duplicateTripDraft(stateRef.current, draftId, input);
    if (!result.ok || !result.value) {
      setError(result.error || "draft_not_found");
      return null;
    }
    return persist(result.value.state) ? result.value.draft : null;
  }, [persist]);

  const deleteDraft = useCallback((draftId: string) => {
    const result = deleteTripDraft(stateRef.current, draftId);
    if (!result.ok || !result.value) {
      setError(result.error || "draft_not_found");
      return false;
    }
    return persist(result.value);
  }, [persist]);

  const removePlaceFromDraft = useCallback((draftId: string, logicalPlaceId: string) => {
    const result = removePlaceFromTripDraft(stateRef.current, draftId, logicalPlaceId);
    if (!result.ok || !result.value) {
      setError(result.error || "draft_not_found");
      return false;
    }
    return persist(result.value);
  }, [persist]);

  const createDay = useCallback((draftId: string, input: { title: string }) => {
    const result = createTripDay(stateRef.current, draftId, input);
    if (!result.ok || !result.value) {
      setError(result.error || "invalid_day_title");
      return false;
    }
    return persist(result.value.state);
  }, [persist]);

  const createMissingDays = useCallback((
    draftId: string,
    titles: string[]
  ): TripDraftMutationResult<{ state: TripDraftsState; createdDays: TripItineraryDay[] }> => {
    const result = createMissingTripItineraryDays(stateRef.current, draftId, { titles });
    if (!result.ok || !result.value) {
      setError(result.error || "no_missing_itinerary_days");
      return result;
    }
    return persist(result.value.state) ? result : { ok: false, error: "storage_write_failed" };
  }, [persist]);

  const renameDay = useCallback((draftId: string, dayId: string, input: { title: string }) => {
    const result = renameTripDay(stateRef.current, draftId, dayId, input);
    if (!result.ok || !result.value) {
      setError(result.error || "day_not_found");
      return false;
    }
    return persist(result.value);
  }, [persist]);

  const deleteDay = useCallback((draftId: string, dayId: string) => {
    const result = deleteTripDay(stateRef.current, draftId, dayId);
    if (!result.ok || !result.value) {
      setError(result.error || "day_not_found");
      return false;
    }
    return persist(result.value);
  }, [persist]);

  const movePlace = useCallback((draftId: string, logicalPlaceId: string, destination: { dayId: string; index?: number }) => {
    const result = moveTripPlace(stateRef.current, draftId, logicalPlaceId, destination);
    if (!result.ok || !result.value) {
      setError(result.error || "place_not_found");
      return false;
    }
    return persist(result.value);
  }, [persist]);

  const movePlaceGroup = useCallback((
    draftId: string,
    input: MoveTripPlaceGroupInput
  ): TripDraftMutationResult<TripDraftsState> => {
    const result = moveTripPlaceGroup(stateRef.current, draftId, input);
    if (!result.ok) {
      setError(result.error || "invalid_place_group");
      return result;
    }
    if (!result.value) {
      setError(null);
      return result;
    }
    return persist(result.value) ? result : { ok: false, error: "storage_write_failed" };
  }, [persist]);

  const movePlaceWithinSection = useCallback((
    draftId: string,
    logicalPlaceId: string,
    direction: "up" | "down"
  ): TripDraftMutationResult<TripDraftsState> => {
    const result = moveTripPlaceWithinSection(stateRef.current, draftId, logicalPlaceId, direction);
    if (!result.ok) {
      setError(result.error || "place_not_found");
      return result;
    }
    if (!result.value) {
      setError(null);
      return result;
    }
    return persist(result.value) ? result : { ok: false, error: "storage_write_failed" };
  }, [persist]);

  const setPlaceTimeBlock = useCallback((
    draftId: string,
    logicalPlaceId: string,
    timeBlock: TripTimeBlock | null
  ): TripDraftMutationResult<TripDraftsState> => {
    const result = setTripPlaceTimeBlock(stateRef.current, draftId, logicalPlaceId, timeBlock);
    if (!result.ok) {
      setError(result.error || "invalid_time_block");
      return result;
    }
    if (!result.value) {
      setError(null);
      return result;
    }
    return persist(result.value) ? result : { ok: false, error: "storage_write_failed" };
  }, [persist]);

  const updateDetails = useCallback((draftId: string, input: UpdateTripDetailsInput): TripDraftMutationResult<TripDraftsState> => {
    const result = updateTripDetails(stateRef.current, draftId, input);
    if (!result.ok) {
      setError(result.error || "draft_not_found");
      return result;
    }
    if (!result.value) {
      setError(null);
      return result;
    }
    return persist(result.value) ? result : { ok: false, error: "storage_write_failed" };
  }, [persist]);

  const addPlaceToDraft = useCallback((draftId: string, place: SavedPlace): TripDraftMutationResult<TripDraftsState> => {
    const input = savedPlaceToTripDraftReferenceInput(place);
    if (!input) {
      const result: TripDraftMutationResult<TripDraftsState> = { ok: false, error: "invalid_place_reference" };
      setError(result.error);
      return result;
    }

    const result = addPlaceToTripDraft(stateRef.current, draftId, input);
    if (!result.ok || !result.value) {
      setError(result.error || "draft_not_found");
      return result;
    }
    return persist(result.value) ? { ok: true, value: result.value } : { ok: false, error: "storage_write_failed" };
  }, [persist]);

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
    return persist(result.value.state) ? result : { ok: false, error: "storage_write_failed" };
  }, [persist]);

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
    createDraft,
    createDraftFromCollection,
    renameDraft,
    duplicateDraft,
    deleteDraft,
    removePlaceFromDraft,
    createDay,
    createMissingDays,
    renameDay,
    deleteDay,
    movePlace,
    movePlaceGroup,
    movePlaceWithinSection,
    setPlaceTimeBlock,
    updateDetails,
    addPlaceToDraft,
    createDraftWithPlace,
    refreshDrafts
  };
}
