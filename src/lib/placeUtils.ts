import type { MapDestination, MapDestinationType } from "../mapDestinations";

export type PlaceLike = {
  id?: string | number | null;
  placeId?: string | null;
  providerId?: string | null;
  item_id?: string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  source?: string | null;
  type?: string | null;
  category?: string | null;
  detail?: string | null;
  address?: string | null;
  image?: string | null;
  emoji?: string | null;
  metadata?: unknown;
  isSuggestion?: boolean | null;
  archived?: boolean | null;
};

export type PlaceTrust =
  | "verified_provider"
  | "destination_suggestion"
  | "static_editorial"
  | "archived_event"
  | "unknown";

export type NormalizedPlaceType =
  | "restaurant"
  | "cafe"
  | "hotel"
  | "attraction"
  | "park"
  | "museum"
  | "family"
  | "event"
  | "stadium"
  | "fan_zone"
  | "transport"
  | "emergency"
  | "other";

export type PlaceMapDestination = MapDestination & {
  id: string;
  country?: string;
  source?: string;
  trust: PlaceTrust;
  image?: string;
};

type PlaceToMapDestinationOptions = {
  allowSuggestions?: boolean;
};

const VERIFIED_PROVIDER_SOURCES = new Set(["google_places", "openstreetmap"]);
const SUGGESTION_SOURCES = new Set(["fallback", "suggestion", "generated", "search_suggestion"]);
const STATIC_SOURCES = new Set(["mock", "static", "editorial", "curated"]);
const ARCHIVE_SOURCES = new Set(["archive", "archived", "event_archive"]);

export function getCoordinates(place: PlaceLike): { lat: number; lng: number } | null {
  const lat = parseCoordinate(place.lat ?? place.latitude);
  const lng = parseCoordinate(place.lng ?? place.longitude);

  // FanAtlas treats only the 0,0 pair as unusable placeholder data.
  if (
    lat === null ||
    lng === null ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180 ||
    (lat === 0 && lng === 0)
  ) {
    return null;
  }

  return { lat, lng };
}

export function hasValidCoordinates(placeOrCoordinates: PlaceLike): boolean {
  return getCoordinates(placeOrCoordinates) !== null;
}

export function classifyPlaceTrust(place: PlaceLike): PlaceTrust {
  const source = normalizeSource(place.source);
  const name = normalizeDisplayText(place.name);
  const coordinates = getCoordinates(place);

  // Archive evidence is explicit and wins before generic source handling.
  if (hasArchiveEvidence(place, source)) return "archived_event";

  // Generated or fallback coordinates are not provider verification evidence.
  if (SUGGESTION_SOURCES.has(source) || place.isSuggestion === true || hasMetadataFlag(place.metadata, ["isSuggestion", "suggestion", "generatedCoordinates"])) {
    return "destination_suggestion";
  }

  // Verified requires known provider source, a non-empty name, and usable coordinates.
  if (VERIFIED_PROVIDER_SOURCES.has(source) && coordinates && name) {
    return "verified_provider";
  }

  if (STATIC_SOURCES.has(source) || isRecognizedStaticPlace(place, source)) {
    return "static_editorial";
  }

  return "unknown";
}

export function isVerifiedPlace(place: PlaceLike): boolean {
  return classifyPlaceTrust(place) === "verified_provider";
}

export function normalizePlaceType(place: PlaceLike): NormalizedPlaceType {
  // Priority is structured type, then structured category, then detail text.
  const type = normalizeToken(place.type);
  const category = normalizeToken(place.category);
  const detail = normalizeToken(place.detail);

  return typeFromStructuredToken(type) ||
    typeFromStructuredToken(category) ||
    typeFromDetail(detail) ||
    "other";
}

export function stablePlaceId(place: PlaceLike): string {
  const source = normalizeSource(place.source);
  const name = normalizeDisplayText(place.name);
  const city = normalizeDisplayText(place.city);
  const country = normalizeDisplayText(place.country);
  const coordinates = getCoordinates(place);
  const providerId = firstNonEmpty(place.providerId, place.placeId);
  const existingId = firstNonEmpty(place.id);
  const itemId = firstNonEmpty(place.item_id);

  // Identity priority: provider, existing id, item_id, source+coords+name, name+city+country, then stable display fields.
  if (providerId) return compactId(`provider-${slugPart(providerId)}`);
  if (existingId) return compactId(`id-${slugPart(existingId)}`);
  if (itemId) return compactId(`item-${slugPart(itemId)}`);
  if (source && coordinates && name) {
    return compactId(`${source}-${coordinates.lat.toFixed(5)}-${coordinates.lng.toFixed(5)}-${slugPart(name)}`);
  }
  if (name && (city || country)) {
    return compactId(`place-${slugPart(name)}-${slugPart(city)}-${slugPart(country)}`);
  }

  const fallback = [source, name, city, country, normalizeToken(place.type), normalizeToken(place.category), normalizeDisplayText(place.detail)]
    .filter(Boolean)
    .join("-");
  return compactId(`unknown-${slugPart(fallback || "place")}`);
}

export function placeToMapDestination(
  place: PlaceLike,
  options: PlaceToMapDestinationOptions = {}
): PlaceMapDestination | null {
  const coordinates = getCoordinates(place);
  if (!coordinates) return null;

  const trust = classifyPlaceTrust(place);
  if (trust !== "verified_provider") {
    if (!options.allowSuggestions || trust !== "destination_suggestion") return null;
  }

  const normalizedType = normalizePlaceType(place);
  return {
    id: stablePlaceId(place),
    name: normalizeDisplayText(place.name) || "Unknown place",
    city: normalizeDisplayText(place.city),
    country: normalizeDisplayText(place.country) || undefined,
    lat: coordinates.lat,
    lng: coordinates.lng,
    emoji: normalizeDisplayText(place.emoji) || emojiForType(normalizedType),
    type: mapDestinationType(normalizedType),
    address: normalizeDisplayText(place.address) || undefined,
    openingHours: normalizeDisplayText(place.detail) || undefined,
    source: normalizeSource(place.source) || undefined,
    trust,
    image: normalizeDisplayText(place.image) || undefined
  };
}

function parseCoordinate(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDisplayText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeSource(value: unknown) {
  return normalizeToken(value);
}

function normalizeToken(value: unknown) {
  return normalizeDisplayText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function firstNonEmpty(...values: Array<string | number | null | undefined>) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return "";
}

function slugPart(value: string | number) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function compactId(value: string) {
  return value.replace(/-+/g, "-").slice(0, 120);
}

function typeFromStructuredToken(token: string): NormalizedPlaceType | null {
  if (!token) return null;
  if (token === "stadium" || token === "venue_stadium") return "stadium";
  if (token === "fan_zone" || token === "fanzone" || token === "fan_park" || token === "fan_village") return "fan_zone";
  if (token === "restaurant" || token === "fast_food" || token === "food") return "restaurant";
  if (token === "cafe" || token === "coffee" || token === "coffee_shop") return "cafe";
  if (token === "hotel" || token === "hostel" || token === "guest_house" || token === "stay" || token === "stays" || token === "accommodation" || token === "lodging") return "hotel";
  if (token === "museum") return "museum";
  if (token === "park") return "park";
  if (token === "family" || token === "family_activity") return "family";
  if (token === "event" || token === "event_archive" || token === "archived_event" || token === "match") return "event";
  if (token === "transport" || token === "transit" || token === "station" || token === "bus_station" || token === "train_station") return "transport";
  if (token === "hospital" || token === "police" || token === "emergency" || token === "fire_station" || token === "embassy") return "emergency";
  if (token === "attraction" || token === "attractions" || token === "landmark" || token === "tourism" || token === "historic") return "attraction";
  return null;
}

function typeFromDetail(token: string): NormalizedPlaceType | null {
  if (!token) return null;
  if (token === "event_archive" || token === "archived_event") return "event";
  return typeFromStructuredToken(token);
}

function hasArchiveEvidence(place: PlaceLike, source: string) {
  return place.archived === true ||
    ARCHIVE_SOURCES.has(source) ||
    hasMetadataFlag(place.metadata, ["archived", "isArchived", "eventArchive"]);
}

function hasMetadataFlag(metadata: unknown, keys: string[]) {
  if (!metadata || typeof metadata !== "object") return false;
  const record = metadata as Record<string, unknown>;
  return keys.some((key) => record[key] === true);
}

function isRecognizedStaticPlace(place: PlaceLike, source: string) {
  if (source) return false;
  const name = normalizeDisplayText(place.name);
  const city = normalizeDisplayText(place.city);
  const category = normalizeToken(place.category);
  const type = normalizeToken(place.type);
  return Boolean(name && city && (category || type) && !getCoordinates(place));
}

function mapDestinationType(type: NormalizedPlaceType): MapDestinationType {
  if (type === "restaurant") return "restaurant";
  if (type === "cafe") return "cafe";
  if (type === "hotel") return "hotel";
  if (type === "stadium") return "stadium";
  if (type === "fan_zone") return "fan-zone";
  if (type === "emergency") return "hospital";
  return "place";
}

function emojiForType(type: NormalizedPlaceType) {
  if (type === "restaurant") return "🍽";
  if (type === "cafe") return "☕";
  if (type === "hotel") return "🏨";
  if (type === "stadium") return "🏟";
  if (type === "fan_zone") return "🎉";
  if (type === "transport") return "🚆";
  if (type === "emergency") return "🏥";
  return "📍";
}
