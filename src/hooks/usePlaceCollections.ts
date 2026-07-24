import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addSavedPlaceToCollection,
  createPlaceCollection,
  deletePlaceCollection,
  hydratePlaceCollections,
  PLACE_COLLECTIONS_STORAGE_KEY,
  readPlaceCollections,
  removeSavedPlaceFromCollection,
  renamePlaceCollection,
  writePlaceCollections,
  type CollectionMutationError,
  type HydratedPlaceCollection,
  type PlaceCollection,
  type PlaceCollectionsState
} from "../lib/placeCollections";
import type { SavedPlace } from "../lib/savedPlaces";

type CollectionCreateInput = {
  name: string;
  description?: string;
};

type UsePlaceCollectionsResult = {
  collections: PlaceCollection[];
  hydratedCollections: HydratedPlaceCollection[];
  error: CollectionMutationError | null;
  createCollection: (input: CollectionCreateInput) => PlaceCollection | null;
  renameCollection: (collectionId: string, input: CollectionCreateInput) => boolean;
  deleteCollection: (collectionId: string) => boolean;
  addPlaceToCollection: (collectionId: string, place: SavedPlace) => boolean;
  removePlaceFromCollection: (collectionId: string, logicalPlaceId: string) => boolean;
  refreshCollections: () => void;
};

export function usePlaceCollections(savedPlaces: readonly SavedPlace[]): UsePlaceCollectionsResult {
  const [state, setState] = useState<PlaceCollectionsState>(() => readPlaceCollections());
  const [error, setError] = useState<CollectionMutationError | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refreshCollections = useCallback(() => {
    const nextState = readPlaceCollections();
    stateRef.current = nextState;
    setState(nextState);
    setError(null);
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === PLACE_COLLECTIONS_STORAGE_KEY) refreshCollections();
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refreshCollections]);

  const persist = useCallback((nextState: PlaceCollectionsState) => {
    const result = writePlaceCollections(nextState);
    if (!result.ok || !result.value) {
      setError(result.error || "storage_write_failed");
      return false;
    }
    stateRef.current = result.value;
    setState(result.value);
    setError(null);
    return true;
  }, []);

  const createCollection = useCallback((input: CollectionCreateInput) => {
    const result = createPlaceCollection(stateRef.current, input);
    if (!result.ok || !result.value) {
      setError(result.error || "invalid_name");
      return null;
    }
    return persist(result.value.state) ? result.value.collection : null;
  }, [persist]);

  const renameCollection = useCallback((collectionId: string, input: CollectionCreateInput) => {
    const result = renamePlaceCollection(stateRef.current, collectionId, input);
    if (!result.ok || !result.value) {
      setError(result.error || "collection_not_found");
      return false;
    }
    return persist(result.value);
  }, [persist]);

  const deleteCollection = useCallback((collectionId: string) => {
    const result = deletePlaceCollection(stateRef.current, collectionId);
    if (!result.ok || !result.value) {
      setError(result.error || "collection_not_found");
      return false;
    }
    return persist(result.value);
  }, [persist]);

  const addPlaceToCollection = useCallback((collectionId: string, place: SavedPlace) => {
    const result = addSavedPlaceToCollection(stateRef.current, collectionId, place);
    if (!result.ok || !result.value) {
      setError(result.error || "collection_not_found");
      return false;
    }
    return persist(result.value);
  }, [persist]);

  const removePlaceFromCollection = useCallback((collectionId: string, logicalPlaceId: string) => {
    const result = removeSavedPlaceFromCollection(stateRef.current, collectionId, logicalPlaceId);
    if (!result.ok || !result.value) {
      setError(result.error || "collection_not_found");
      return false;
    }
    return persist(result.value);
  }, [persist]);

  const hydratedCollections = useMemo(
    () => hydratePlaceCollections(state, savedPlaces),
    [savedPlaces, state]
  );

  return {
    collections: state.collections,
    hydratedCollections,
    error,
    createCollection,
    renameCollection,
    deleteCollection,
    addPlaceToCollection,
    removePlaceFromCollection,
    refreshCollections
  };
}
