import type { SavedPlace, SavedPlaceStorageReference, SavedPlaceStorageSource } from "./savedPlaces";

export const PLACE_COLLECTIONS_STORAGE_KEY = "fanatlas_place_collections_v1";
export const PLACE_COLLECTIONS_SCHEMA_VERSION = 1;

export const PLACE_COLLECTION_LIMITS = {
  maxCollections: 100,
  maxPlacesPerCollection: 500,
  maxNameLength: 80,
  maxDescriptionLength: 300
} as const;

export type PlaceCollectionId = string;

export type CollectionPersistedReference = {
  storageSource: SavedPlaceStorageSource;
  persistedId: string;
  itemType?: string;
};

export type CollectionPlaceReference = {
  logicalPlaceId: string;
  persistedReferences: CollectionPersistedReference[];
  addedAt: string;
};

export type PlaceCollection = {
  id: PlaceCollectionId;
  name: string;
  description?: string;
  placeReferences: CollectionPlaceReference[];
  createdAt: string;
  updatedAt: string;
};

export type PlaceCollectionsState = {
  version: typeof PLACE_COLLECTIONS_SCHEMA_VERSION;
  collections: PlaceCollection[];
};

export type HydratedCollectionPlace = {
  reference: CollectionPlaceReference;
  place: SavedPlace | null;
  isAvailable: boolean;
};

export type HydratedPlaceCollection = {
  collection: PlaceCollection;
  places: HydratedCollectionPlace[];
  availablePlaces: SavedPlace[];
  unavailableReferences: CollectionPlaceReference[];
  counts: {
    total: number;
    available: number;
    unavailable: number;
    routable: number;
  };
};

export type CollectionMutationError =
  | "invalid_name"
  | "collection_not_found"
  | "collection_limit_reached"
  | "place_limit_reached"
  | "storage_unavailable"
  | "storage_write_failed";

export type CollectionMutationResult<T = PlaceCollectionsState> = {
  ok: boolean;
  value?: T;
  error?: CollectionMutationError;
};

const EMPTY_STATE: PlaceCollectionsState = {
  version: PLACE_COLLECTIONS_SCHEMA_VERSION,
  collections: []
};

export function readPlaceCollections(): PlaceCollectionsState {
  try {
    return normalizePlaceCollectionsState(JSON.parse(localStorage.getItem(PLACE_COLLECTIONS_STORAGE_KEY) || "null"));
  } catch {
    return EMPTY_STATE;
  }
}

export function writePlaceCollections(state: PlaceCollectionsState): CollectionMutationResult<PlaceCollectionsState> {
  try {
    const normalized = normalizePlaceCollectionsState(state);
    localStorage.setItem(PLACE_COLLECTIONS_STORAGE_KEY, JSON.stringify(normalized));
    return { ok: true, value: normalized };
  } catch {
    return { ok: false, error: "storage_write_failed" };
  }
}

export function createPlaceCollection(
  state: PlaceCollectionsState,
  input: { name: string; description?: string }
): CollectionMutationResult<{ state: PlaceCollectionsState; collection: PlaceCollection }> {
  const name = normalizeName(input.name);
  if (!name) return { ok: false, error: "invalid_name" };

  const current = normalizePlaceCollectionsState(state);
  if (current.collections.length >= PLACE_COLLECTION_LIMITS.maxCollections) {
    return { ok: false, error: "collection_limit_reached" };
  }

  const now = isoNow();
  const collection: PlaceCollection = {
    id: createCollectionId(),
    name,
    description: normalizeDescription(input.description) || undefined,
    placeReferences: [],
    createdAt: now,
    updatedAt: now
  };

  return {
    ok: true,
    value: {
      state: {
        version: PLACE_COLLECTIONS_SCHEMA_VERSION,
        collections: [...current.collections, collection]
      },
      collection
    }
  };
}

export function renamePlaceCollection(
  state: PlaceCollectionsState,
  collectionId: string,
  input: { name: string; description?: string }
): CollectionMutationResult<PlaceCollectionsState> {
  const name = normalizeName(input.name);
  if (!name) return { ok: false, error: "invalid_name" };

  const current = normalizePlaceCollectionsState(state);
  let changed = false;
  const collections = current.collections.map((collection) => {
    if (collection.id !== collectionId) return collection;
    const description = normalizeDescription(input.description) || undefined;
    if (collection.name === name && collection.description === description) return collection;
    changed = true;
    return { ...collection, name, description, updatedAt: isoNow() };
  });

  if (!current.collections.some((collection) => collection.id === collectionId)) {
    return { ok: false, error: "collection_not_found" };
  }

  return {
    ok: true,
    value: changed ? { ...current, collections } : current
  };
}

export function deletePlaceCollection(
  state: PlaceCollectionsState,
  collectionId: string
): CollectionMutationResult<PlaceCollectionsState> {
  const current = normalizePlaceCollectionsState(state);
  if (!current.collections.some((collection) => collection.id === collectionId)) {
    return { ok: false, error: "collection_not_found" };
  }

  return {
    ok: true,
    value: {
      ...current,
      collections: current.collections.filter((collection) => collection.id !== collectionId)
    }
  };
}

export function addSavedPlaceToCollection(
  state: PlaceCollectionsState,
  collectionId: string,
  place: SavedPlace
): CollectionMutationResult<PlaceCollectionsState> {
  const current = normalizePlaceCollectionsState(state);
  const collection = current.collections.find((item) => item.id === collectionId);
  if (!collection) return { ok: false, error: "collection_not_found" };

  if (collection.placeReferences.some((reference) => reference.logicalPlaceId === place.id)) {
    return { ok: true, value: current };
  }

  if (collection.placeReferences.length >= PLACE_COLLECTION_LIMITS.maxPlacesPerCollection) {
    return { ok: false, error: "place_limit_reached" };
  }

  const reference = savedPlaceToCollectionReference(place);
  if (!reference.logicalPlaceId) return { ok: false, error: "collection_not_found" };

  return {
    ok: true,
    value: {
      ...current,
      collections: current.collections.map((item) => (
        item.id === collectionId
          ? {
              ...item,
              placeReferences: [...item.placeReferences, reference],
              updatedAt: isoNow()
            }
          : item
      ))
    }
  };
}

export function removeSavedPlaceFromCollection(
  state: PlaceCollectionsState,
  collectionId: string,
  logicalPlaceId: string
): CollectionMutationResult<PlaceCollectionsState> {
  const current = normalizePlaceCollectionsState(state);
  const collection = current.collections.find((item) => item.id === collectionId);
  if (!collection) return { ok: false, error: "collection_not_found" };

  const nextReferences = collection.placeReferences.filter((reference) => reference.logicalPlaceId !== logicalPlaceId);
  if (nextReferences.length === collection.placeReferences.length) {
    return { ok: true, value: current };
  }

  return {
    ok: true,
    value: {
      ...current,
      collections: current.collections.map((item) => (
        item.id === collectionId
          ? { ...item, placeReferences: nextReferences, updatedAt: isoNow() }
          : item
      ))
    }
  };
}

export function savedPlaceToCollectionReference(place: SavedPlace): CollectionPlaceReference {
  return {
    logicalPlaceId: place.id,
    persistedReferences: uniquePersistedReferences([
      ...place.storageReferences.map(storageReferenceToCollectionReference),
      {
        storageSource: place.storageSource,
        persistedId: place.persistedId,
        itemType: place.itemType
      }
    ]),
    addedAt: isoNow()
  };
}

export function hydratePlaceCollection(
  collection: PlaceCollection,
  savedPlaces: readonly SavedPlace[]
): HydratedPlaceCollection {
  const placesById = new Map(savedPlaces.map((place) => [place.id, place]));
  const places = collection.placeReferences.map((reference) => {
    const place = placesById.get(reference.logicalPlaceId) || null;
    return {
      reference,
      place,
      isAvailable: place !== null
    };
  });
  const availablePlaces = places.flatMap((item) => item.place ? [item.place] : []);
  const unavailableReferences = places.flatMap((item) => item.place ? [] : [item.reference]);

  return {
    collection,
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

export function hydratePlaceCollections(
  state: PlaceCollectionsState,
  savedPlaces: readonly SavedPlace[]
): HydratedPlaceCollection[] {
  const normalized = normalizePlaceCollectionsState(state);
  return normalized.collections.map((collection) => hydratePlaceCollection(collection, savedPlaces));
}

export function normalizePlaceCollectionsState(value: unknown): PlaceCollectionsState {
  const record = asRecord(value);
  if (!record || record.version !== PLACE_COLLECTIONS_SCHEMA_VERSION || !Array.isArray(record.collections)) {
    return EMPTY_STATE;
  }

  const seen = new Set<string>();
  const collections: PlaceCollection[] = [];
  for (const value of record.collections) {
    if (collections.length >= PLACE_COLLECTION_LIMITS.maxCollections) break;
    const collection = normalizePlaceCollection(value);
    if (!collection || seen.has(collection.id)) continue;
    seen.add(collection.id);
    collections.push(collection);
  }

  return {
    version: PLACE_COLLECTIONS_SCHEMA_VERSION,
    collections
  };
}

export function normalizePlaceCollection(value: unknown): PlaceCollection | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = readString(record.id);
  const name = normalizeName(record.name);
  if (!id || !name) return null;

  const seenReferences = new Set<string>();
  const placeReferences = Array.isArray(record.placeReferences)
    ? record.placeReferences.flatMap((value) => {
        if (seenReferences.size >= PLACE_COLLECTION_LIMITS.maxPlacesPerCollection) return [];
        const reference = normalizeCollectionPlaceReference(value);
        if (!reference || seenReferences.has(reference.logicalPlaceId)) return [];
        seenReferences.add(reference.logicalPlaceId);
        return [reference];
      })
    : [];

  return {
    id,
    name,
    description: normalizeDescription(record.description) || undefined,
    placeReferences,
    createdAt: validIsoString(record.createdAt) || isoNow(),
    updatedAt: validIsoString(record.updatedAt) || validIsoString(record.createdAt) || isoNow()
  };
}

export function normalizeCollectionPlaceReference(value: unknown): CollectionPlaceReference | null {
  const record = asRecord(value);
  if (!record) return null;

  const logicalPlaceId = readString(record.logicalPlaceId);
  if (!logicalPlaceId) return null;

  const persistedReferences = Array.isArray(record.persistedReferences)
    ? uniquePersistedReferences(record.persistedReferences.map(normalizePersistedReference).filter(Boolean))
    : [];

  return {
    logicalPlaceId,
    persistedReferences,
    addedAt: validIsoString(record.addedAt) || isoNow()
  };
}

function normalizePersistedReference(value: unknown): CollectionPersistedReference | null {
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

function storageReferenceToCollectionReference(reference: SavedPlaceStorageReference): CollectionPersistedReference {
  return {
    storageSource: reference.source,
    persistedId: reference.persistedId,
    itemType: reference.itemType
  };
}

function uniquePersistedReferences(references: Array<CollectionPersistedReference | null>): CollectionPersistedReference[] {
  const seen = new Set<string>();
  return references.flatMap((reference) => {
    if (!reference || !reference.persistedId) return [];
    const key = `${reference.storageSource}:${reference.persistedId}:${reference.itemType || ""}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [reference];
  });
}

function createCollectionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `collection-${Date.now().toString(36)}-${fallbackCounter()}`;
}

let idCounter = 0;

function fallbackCounter() {
  idCounter += 1;
  return idCounter.toString(36);
}

function normalizeName(value: unknown) {
  return readString(value).slice(0, PLACE_COLLECTION_LIMITS.maxNameLength);
}

function normalizeDescription(value: unknown) {
  return readString(value).slice(0, PLACE_COLLECTION_LIMITS.maxDescriptionLength);
}

function normalizeStorageSource(value: unknown): SavedPlaceStorageSource {
  if (value === "supabase_favorite" || value === "explore_local" || value === "unknown") return value;
  return "unknown";
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
