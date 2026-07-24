import {
  classifyPlaceTrust,
  getCoordinates,
  normalizePlaceType,
  stablePlaceId,
  type NormalizedPlaceType,
  type PlaceLike,
  type PlaceTrust
} from "./placeUtils";

export type SavedPlaceStorageSource =
  | "supabase_favorite"
  | "explore_local"
  | "unknown";

export type SavedPlaceStorageReference = {
  source: SavedPlaceStorageSource;
  persistedId: string;
  itemType?: string;
  trust: PlaceTrust;
  original?: unknown;
};

export type SavedPlace = {
  id: string;
  persistedId: string;
  storageSource: SavedPlaceStorageSource;
  storageReferences: SavedPlaceStorageReference[];
  name: string;
  type: NormalizedPlaceType;
  trust: PlaceTrust;
  source?: string;
  providerId?: string;
  city?: string;
  country?: string;
  address?: string;
  lat?: number;
  lng?: number;
  hasCoordinates: boolean;
  isRoutable: boolean;
  image?: string;
  detail?: string;
  savedAt?: string;
  itemType?: string;
  original: unknown;
};

export type ExploreSavedPlaceResult = {
  places: SavedPlace[];
  unresolvedIds: string[];
};

type MergeSavedPlacesInput = {
  supabaseFavorites?: readonly unknown[];
  exploreSavedPlaces?: readonly unknown[];
};

const TRUST_PRIORITY: Record<PlaceTrust, number> = {
  verified_provider: 5,
  archived_event: 4,
  static_editorial: 3,
  destination_suggestion: 2,
  unknown: 1
};

const EXPLORE_SAVED_PLACES_KEY = "fanatlas_saved_explore_cards";

export function readExploreSavedIds(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(EXPLORE_SAVED_PLACES_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    return parsed.flatMap((value) => {
      if (typeof value !== "string") return [];
      const id = value.trim();
      if (!id || seen.has(id)) return [];
      seen.add(id);
      return [id];
    });
  } catch {
    return [];
  }
}

export function normalizeSupabaseFavorite(record: unknown): SavedPlace | null {
  const favorite = asRecord(record);
  if (!favorite) return null;

  const metadata = asRecord(favorite.metadata);
  const destination = asRecord(metadata?.destination);
  const itemType = readString(favorite.item_type);
  const persistedId = readString(favorite.item_id) || readString(favorite.id);
  const name = firstString(favorite.name, metadata?.name, metadata?.title, destination?.name);
  if (!name || !persistedId) return null;

  const place = buildPlaceLike({
    root: favorite,
    metadata,
    destination,
    fallbackName: name,
    fallbackType: itemType
  });
  const coordinates = getCoordinates(place);
  const trust = classifyPlaceTrust(place);
  const type = typeFromFavorite(itemType, place);
  const logicalId = stablePlaceId(place);

  return {
    id: logicalId,
    persistedId,
    storageSource: "supabase_favorite",
    storageReferences: [{
      source: "supabase_favorite",
      persistedId,
      itemType: itemType || undefined,
      trust,
      original: record
    }],
    name,
    type,
    trust,
    source: place.source || undefined,
    providerId: firstString(place.providerId, place.placeId) || undefined,
    city: firstString(place.city) || undefined,
    country: firstString(place.country) || undefined,
    address: firstString(place.address) || undefined,
    lat: coordinates?.lat,
    lng: coordinates?.lng,
    hasCoordinates: coordinates !== null,
    isRoutable: coordinates !== null && trust === "verified_provider",
    image: firstString(favorite.image, metadata?.image) || undefined,
    detail: firstString(place.detail) || undefined,
    savedAt: readString(favorite.created_at) || undefined,
    itemType: itemType || undefined,
    original: record
  };
}

export function normalizeExploreSavedPlace(card: unknown, persistedId?: string): SavedPlace | null {
  const record = asRecord(card);
  if (!record) return null;

  const sourcePlace = asRecord(record.sourcePlace);
  const name = firstString(record.title, record.name, sourcePlace?.name);
  const storageId = persistedId || firstString(record.id, sourcePlace?.id);
  if (!name || !storageId) return null;

  const place = buildPlaceLike({
    root: record,
    metadata: sourcePlace,
    fallbackName: name,
    fallbackType: firstString(record.category, sourcePlace?.category)
  });
  place.id = firstString(record.sourceId, sourcePlace?.stablePlaceId, sourcePlace?.id, record.id) || place.id;
  const coordinates = getCoordinates(place);
  const trust = classifyPlaceTrust(place);
  const logicalId = firstString(record.logicalId) || stablePlaceId(place);

  return {
    id: logicalId,
    persistedId: storageId,
    storageSource: "explore_local",
    storageReferences: [{
      source: "explore_local",
      persistedId: storageId,
      itemType: firstString(record.category, sourcePlace?.category) || undefined,
      trust,
      original: card
    }],
    name,
    type: normalizePlaceType(place),
    trust,
    source: place.source || undefined,
    providerId: firstString(place.providerId, place.placeId) || undefined,
    city: firstString(place.city) || undefined,
    country: firstString(place.country) || undefined,
    address: firstString(place.address) || undefined,
    lat: coordinates?.lat,
    lng: coordinates?.lng,
    hasCoordinates: coordinates !== null,
    isRoutable: coordinates !== null && trust === "verified_provider",
    image: firstString(record.image, sourcePlace?.image) || undefined,
    detail: firstString(record.detail, record.meta, sourcePlace?.detail) || undefined,
    itemType: firstString(record.category, sourcePlace?.category) || undefined,
    original: card
  };
}

export function normalizeExploreSavedPlaces(
  savedIds: readonly unknown[],
  candidates: readonly unknown[]
): ExploreSavedPlaceResult {
  const candidatesByPersistedId = new Map<string, unknown>();

  candidates.forEach((candidate) => {
    const record = asRecord(candidate);
    if (!record) return;
    [readString(record.id), readString(record.sourceId), readString(record.providerId), readString(record.logicalId), readString(asRecord(record.sourcePlace)?.id)]
      .filter(Boolean)
      .forEach((id) => candidatesByPersistedId.set(id, candidate));
  });

  const places: SavedPlace[] = [];
  const unresolvedIds: string[] = [];

  savedIds.map(String).forEach((id) => {
    const candidate = candidatesByPersistedId.get(id);
    if (!candidate) {
      unresolvedIds.push(id);
      return;
    }

    const normalized = normalizeExploreSavedPlace(candidate, id);
    if (normalized) places.push(normalized);
    else unresolvedIds.push(id);
  });

  return { places, unresolvedIds };
}

export function resolveExploreSavedPlaces({
  savedIds,
  candidates
}: {
  savedIds: readonly unknown[];
  candidates: readonly unknown[];
}): ExploreSavedPlaceResult {
  return normalizeExploreSavedPlaces(savedIds, candidates);
}

export function mergeSavedPlaces(input: MergeSavedPlacesInput): SavedPlace[] {
  const normalized = [
    ...(input.supabaseFavorites || []).map(normalizeSupabaseFavorite),
    ...(input.exploreSavedPlaces || []).map((place) => (
      isSavedPlace(place) ? place : normalizeExploreSavedPlace(place)
    ))
  ].filter((place): place is SavedPlace => Boolean(place));

  const byId = new Map<string, SavedPlace>();
  normalized.forEach((place) => {
    const existing = byId.get(place.id);
    byId.set(place.id, existing ? mergePair(existing, place) : place);
  });

  return [...byId.values()].sort(compareSavedPlaces);
}

function buildPlaceLike({
  root,
  metadata,
  destination,
  fallbackName,
  fallbackType
}: {
  root: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  destination?: Record<string, unknown>;
  fallbackName: string;
  fallbackType?: string;
}): PlaceLike {
  return {
    id: firstString(metadata?.stablePlaceId, metadata?.id),
    placeId: firstString(metadata?.placeId, metadata?.googlePlaceId, destination?.placeId),
    providerId: firstString(metadata?.providerId, metadata?.placeId, metadata?.googlePlaceId, destination?.providerId),
    item_id: readString(root.item_id),
    name: firstString(root.name, metadata?.name, metadata?.title, destination?.name, fallbackName),
    city: firstString(root.city, metadata?.city, destination?.city),
    country: firstString(metadata?.country, destination?.country),
    lat: firstCoordinateValue(metadata?.lat, metadata?.latitude, destination?.lat, destination?.latitude, root.lat, root.latitude),
    lng: firstCoordinateValue(metadata?.lng, metadata?.longitude, destination?.lng, destination?.longitude, root.lng, root.longitude),
    latitude: firstCoordinateValue(metadata?.latitude, destination?.latitude, root.latitude),
    longitude: firstCoordinateValue(metadata?.longitude, destination?.longitude, root.longitude),
    source: firstString(metadata?.source, destination?.source, root.source),
    type: firstString(metadata?.type, destination?.type, root.type, fallbackType),
    category: firstString(metadata?.category, destination?.category, root.category, fallbackType),
    detail: firstString(metadata?.detail, metadata?.description, destination?.detail, root.detail, root.meta),
    address: firstString(metadata?.address, destination?.address, root.address),
    image: firstString(root.image, metadata?.image),
    emoji: firstString(metadata?.emoji, destination?.emoji),
    metadata,
    isSuggestion: readBoolean(metadata?.isSuggestion) || undefined,
    archived: readBoolean(metadata?.archived) || readBoolean(metadata?.isArchived) || undefined
  };
}

function typeFromFavorite(itemType: string, place: PlaceLike) {
  if (itemType === "fan-zone") return "fan_zone";
  if (itemType === "stadium") return "stadium";
  return normalizePlaceType(place);
}

function mergePair(left: SavedPlace, right: SavedPlace): SavedPlace {
  const winner = richerPlace(left, right);
  const other = winner === left ? right : left;
  const trust = TRUST_PRIORITY[left.trust] >= TRUST_PRIORITY[right.trust] ? left.trust : right.trust;
  const coordinates = left.trust === "verified_provider" && left.hasCoordinates
    ? { lat: left.lat, lng: left.lng }
    : right.trust === "verified_provider" && right.hasCoordinates
      ? { lat: right.lat, lng: right.lng }
      : winner.hasCoordinates
        ? { lat: winner.lat, lng: winner.lng }
        : { lat: other.lat, lng: other.lng };

  return {
    ...winner,
    trust,
    source: winner.source || other.source,
    providerId: winner.providerId || other.providerId,
    city: winner.city || other.city,
    country: winner.country || other.country,
    address: winner.address || other.address,
    lat: coordinates.lat,
    lng: coordinates.lng,
    hasCoordinates: coordinates.lat !== undefined && coordinates.lng !== undefined,
    isRoutable: coordinates.lat !== undefined && coordinates.lng !== undefined && trust === "verified_provider",
    image: winner.image || other.image,
    detail: winner.detail || other.detail,
    savedAt: earlierDate(left.savedAt, right.savedAt),
    storageReferences: uniqueReferences([...left.storageReferences, ...right.storageReferences])
  };
}

function richerPlace(left: SavedPlace, right: SavedPlace) {
  const score = (place: SavedPlace) =>
    (place.hasCoordinates ? 4 : 0) +
    (place.trust === "verified_provider" ? 4 : 0) +
    (place.image ? 2 : 0) +
    (place.city ? 1 : 0) +
    (place.country ? 1 : 0) +
    (place.address ? 1 : 0) +
    (place.detail ? 1 : 0);
  return score(right) > score(left) ? right : left;
}

function compareSavedPlaces(left: SavedPlace, right: SavedPlace) {
  const leftTime = Date.parse(left.savedAt || "");
  const rightTime = Date.parse(right.savedAt || "");
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return rightTime - leftTime;
  }
  return `${left.storageSource}-${left.persistedId}`.localeCompare(`${right.storageSource}-${right.persistedId}`);
}

function uniqueReferences(references: SavedPlaceStorageReference[]) {
  const seen = new Set<string>();
  return references.filter((reference) => {
    const key = `${reference.source}:${reference.persistedId}:${reference.itemType || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function earlierDate(left?: string, right?: string) {
  if (!left) return right;
  if (!right) return left;
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (!Number.isFinite(leftTime)) return right;
  if (!Number.isFinite(rightTime)) return left;
  return leftTime <= rightTime ? left : right;
}

function isSavedPlace(value: unknown): value is SavedPlace {
  const record = asRecord(value);
  return Boolean(record && readString(record.id) && readString(record.persistedId) && readString(record.storageSource));
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = readString(value);
    if (text) return text;
  }
  return "";
}

function readString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function readBoolean(value: unknown) {
  return value === true;
}

function firstCoordinateValue(...values: unknown[]): string | number | null | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}
