import { placeToMapDestination, type PlaceMapDestination, type PlaceLike } from "./placeUtils";
import type { SavedPlace } from "./savedPlaces";

export type SavedPlaceActionKind =
  | "open_restaurant"
  | "open_hotel"
  | "open_map"
  | "open_stadium"
  | "open_fan_zone"
  | "open_event"
  | "call"
  | "open_website"
  | "search_web";

export type SavedPlaceActionPriority = "primary" | "secondary";

export type SavedPlaceActionUnavailableReason =
  | "missing_coordinates"
  | "unsupported_type"
  | "missing_compatible_payload"
  | "unverified_suggestion"
  | "limited_data";

export type RestaurantOpenPayload = {
  name: string;
  city?: string;
  country?: string;
  address?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  image?: string;
  detail?: string;
  category: "restaurant";
  type?: string;
  source?: string;
  providerId?: string;
  placeId?: string;
  metadata?: Record<string, unknown>;
  original?: unknown;
};

export type HotelOpenPayload = {
  name: string;
  city?: string;
  country?: string;
  destination?: PlaceMapDestination;
  original?: unknown;
};

export type StadiumOpenPayload = {
  name: string;
  city?: string;
  destination?: PlaceMapDestination;
  original?: unknown;
};

export type FanZoneOpenPayload = {
  name: string;
  city?: string;
  destination?: PlaceMapDestination;
  original?: unknown;
};

export type EventOpenPayload = {
  name: string;
  city?: string;
  destination?: PlaceMapDestination;
  original?: unknown;
};

export type SavedPlaceAction =
  | {
      kind: "open_restaurant";
      priority: "primary";
      labelKey: "savedPlaces.actions.viewRestaurant";
      payload: RestaurantOpenPayload;
    }
  | {
      kind: "open_hotel";
      priority: "primary";
      labelKey: "savedPlaces.actions.viewHotel";
      payload: HotelOpenPayload;
    }
  | {
      kind: "open_map";
      priority: SavedPlaceActionPriority;
      labelKey: "savedPlaces.actions.viewOnMap";
      payload: PlaceMapDestination;
    }
  | {
      kind: "open_stadium";
      priority: "primary";
      labelKey: "savedPlaces.actions.viewStadium";
      payload: StadiumOpenPayload;
    }
  | {
      kind: "open_fan_zone";
      priority: "primary";
      labelKey: "savedPlaces.actions.viewFanZone";
      payload: FanZoneOpenPayload;
    }
  | {
      kind: "open_event";
      priority: "primary";
      labelKey: "savedPlaces.actions.viewEvent";
      payload: EventOpenPayload;
    }
  | {
      kind: "call";
      priority: "secondary";
      labelKey: "savedPlaces.actions.call";
      href: string;
    }
  | {
      kind: "open_website";
      priority: "secondary";
      labelKey: "savedPlaces.actions.website";
      href: string;
    }
  | {
      kind: "search_web";
      priority: "secondary";
      labelKey: "savedPlaces.actions.searchWeb";
      href: string;
    };

export type SavedPlaceActionSet = {
  primary: SavedPlaceAction | null;
  secondary: SavedPlaceAction[];
  canOpen: boolean;
  reason?: SavedPlaceActionUnavailableReason;
};

export function getSavedPlaceActions(place: SavedPlace): SavedPlaceActionSet {
  const mapDestination = toMapActionPayload(place);
  const restaurantPayload = toRestaurantOpenPayload(place);
  const hotelPayload = toHotelOpenPayload(place, mapDestination);
  const stadiumPayload = toStadiumOpenPayload(place, mapDestination);
  const fanZonePayload = toFanZoneOpenPayload(place, mapDestination);
  const eventPayload = toEventOpenPayload(place, mapDestination);
  const secondary = secondaryActions(place);

  // Primary priority: proven type-specific route first, then verified map fallback, then archived route.
  const primary =
    restaurantPayload ? restaurantAction(restaurantPayload) :
    hotelPayload ? hotelAction(hotelPayload) :
    stadiumPayload ? stadiumAction(stadiumPayload) :
    fanZonePayload ? fanZoneAction(fanZonePayload) :
    eventPayload ? eventAction(eventPayload) :
    mapDestination ? mapAction(mapDestination, "primary") :
    null;

  return {
    primary,
    secondary,
    canOpen: primary !== null,
    reason: primary ? undefined : unavailableReason(place)
  };
}

export function toRestaurantOpenPayload(place: SavedPlace): RestaurantOpenPayload | null {
  if (place.type !== "restaurant") return null;
  if (!place.name) return null;

  const metadata = metadataRecord(place);
  const candidate = originalRecord(place.original);
  const candidateOriginal = originalRecord(candidate.original);

  return {
    ...metadata,
    ...candidateOriginal,
    ...candidate,
    name: place.name,
    city: place.city || readString(candidate.city) || readString(candidateOriginal.city) || undefined,
    country: place.country || readString(candidate.country) || readString(candidateOriginal.country) || undefined,
    address: place.address || readString(candidate.address) || readString(candidateOriginal.address) || undefined,
    lat: place.lat,
    lng: place.lng,
    latitude: place.lat,
    longitude: place.lng,
    image: place.image || readString(candidate.image) || readString(candidateOriginal.image) || undefined,
    detail: place.detail || readString(candidate.detail) || readString(candidateOriginal.detail) || undefined,
    category: "restaurant",
    type: "restaurant",
    source: place.source || readString(candidate.source) || readString(candidateOriginal.source) || undefined,
    providerId: place.providerId || readString(candidate.providerId) || readString(candidateOriginal.providerId) || undefined,
    placeId: place.providerId || readString(candidate.placeId) || readString(candidateOriginal.placeId) || undefined,
    metadata,
    original: place.original
  };
}

export function toHotelOpenPayload(place: SavedPlace, destination = toMapActionPayload(place)): HotelOpenPayload | null {
  // There is no hotel detail route today; hotel favorites preserve current behavior through the map route.
  if (place.type !== "hotel" || !destination) return null;
  return null;
}

export function toStadiumOpenPayload(place: SavedPlace, destination = toMapActionPayload(place)): StadiumOpenPayload | null {
  if (place.type !== "stadium" && !hasStorageItemType(place, "stadium")) return null;
  if (!place.name) return null;
  return {
    name: place.name,
    city: place.city,
    destination: destination || destinationFromMetadata(place),
    original: place.original
  };
}

export function toFanZoneOpenPayload(place: SavedPlace, destination = toMapActionPayload(place)): FanZoneOpenPayload | null {
  if (place.type !== "fan_zone" && !hasStorageItemType(place, "fan-zone")) return null;
  if (!place.name) return null;
  return {
    name: place.name,
    city: place.city,
    destination: destination || destinationFromMetadata(place),
    original: place.original
  };
}

export function toEventOpenPayload(place: SavedPlace, destination = toMapActionPayload(place)): EventOpenPayload | null {
  void place;
  void destination;
  // FanAtlas does not currently expose a generic saved-event detail route.
  return null;
}

function toMapActionPayload(place: SavedPlace): PlaceMapDestination | null {
  if (!place.isRoutable) return null;

  const destination = placeToMapDestination(savedPlaceAsPlaceLike(place));
  return destination || destinationFromMetadata(place);
}

function secondaryActions(place: SavedPlace): SavedPlaceAction[] {
  const actions: SavedPlaceAction[] = [];
  const phone = phoneFromPlace(place);
  const website = websiteFromPlace(place);
  const search = searchHref(place);

  if (phone) {
    actions.push({
      kind: "call",
      priority: "secondary",
      labelKey: "savedPlaces.actions.call",
      href: phone
    });
  }

  if (website) {
    actions.push({
      kind: "open_website",
      priority: "secondary",
      labelKey: "savedPlaces.actions.website",
      href: website
    });
  }

  if (search) {
    actions.push({
      kind: "search_web",
      priority: "secondary",
      labelKey: "savedPlaces.actions.searchWeb",
      href: search
    });
  }

  return actions;
}

function restaurantAction(payload: RestaurantOpenPayload): SavedPlaceAction {
  return {
    kind: "open_restaurant",
    priority: "primary",
    labelKey: "savedPlaces.actions.viewRestaurant",
    payload
  };
}

function hotelAction(payload: HotelOpenPayload): SavedPlaceAction {
  return {
    kind: "open_hotel",
    priority: "primary",
    labelKey: "savedPlaces.actions.viewHotel",
    payload
  };
}

function mapAction(payload: PlaceMapDestination, priority: SavedPlaceActionPriority): SavedPlaceAction {
  return {
    kind: "open_map",
    priority,
    labelKey: "savedPlaces.actions.viewOnMap",
    payload
  };
}

function stadiumAction(payload: StadiumOpenPayload): SavedPlaceAction {
  return {
    kind: "open_stadium",
    priority: "primary",
    labelKey: "savedPlaces.actions.viewStadium",
    payload
  };
}

function fanZoneAction(payload: FanZoneOpenPayload): SavedPlaceAction {
  return {
    kind: "open_fan_zone",
    priority: "primary",
    labelKey: "savedPlaces.actions.viewFanZone",
    payload
  };
}

function eventAction(payload: EventOpenPayload): SavedPlaceAction {
  return {
    kind: "open_event",
    priority: "primary",
    labelKey: "savedPlaces.actions.viewEvent",
    payload
  };
}

function unavailableReason(place: SavedPlace): SavedPlaceActionUnavailableReason {
  if (place.trust === "destination_suggestion") return "unverified_suggestion";
  if (place.hasCoordinates && !place.isRoutable) return "limited_data";
  if (!place.hasCoordinates) return "missing_coordinates";
  if (place.type === "other") return "unsupported_type";
  return "missing_compatible_payload";
}

function savedPlaceAsPlaceLike(place: SavedPlace): PlaceLike {
  return {
    id: place.id,
    placeId: place.providerId,
    providerId: place.providerId,
    name: place.name,
    city: place.city,
    country: place.country,
    lat: place.lat,
    lng: place.lng,
    source: place.source,
    type: place.type,
    category: place.itemType || place.type,
    detail: place.detail,
    address: place.address,
    image: place.image,
    metadata: metadataRecord(place)
  };
}

function destinationFromMetadata(place: SavedPlace): PlaceMapDestination | null {
  const destination = originalRecord(metadataRecord(place).destination);
  const converted = placeToMapDestination({
    id: readString(destination.id) || place.id,
    name: readString(destination.name) || place.name,
    city: readString(destination.city) || place.city,
    country: readString(destination.country) || place.country,
    lat: readCoordinate(destination.lat, destination.latitude),
    lng: readCoordinate(destination.lng, destination.longitude),
    source: readString(destination.source) || place.source,
    type: readString(destination.type) || place.type,
    category: readString(destination.category) || place.itemType || place.type,
    detail: readString(destination.openingHours, destination.detail) || place.detail,
    address: readString(destination.address) || place.address,
    image: readString(destination.image) || place.image,
    emoji: readString(destination.emoji)
  });

  return converted;
}

function metadataRecord(place: SavedPlace): Record<string, unknown> {
  const supabaseOriginal = place.storageReferences
    .filter((reference) => reference.source === "supabase_favorite")
    .map((reference) => originalRecord(reference.original))
    .find((record) => record.metadata);
  return originalRecord(supabaseOriginal?.metadata || originalRecord(place.original).metadata);
}

function phoneFromPlace(place: SavedPlace) {
  const candidates = candidateRecords(place);
  for (const record of candidates) {
    const href = telHref(readString(record.phone, record.phoneNumber, record.telephone));
    if (href) return href;
  }
  return null;
}

function websiteFromPlace(place: SavedPlace) {
  const candidates = candidateRecords(place);
  for (const record of candidates) {
    const href = safeHttpUrl(readString(record.website, record.url, record.link));
    if (href) return href;
  }
  return null;
}

function searchHref(place: SavedPlace) {
  if (!place.name) return null;
  const query = [place.name, place.city, place.country].filter(Boolean).join(" ").trim();
  if (!query) return null;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function candidateRecords(place: SavedPlace) {
  const metadata = metadataRecord(place);
  const original = originalRecord(place.original);
  const candidateOriginal = originalRecord(original.original);
  return [metadata, original, candidateOriginal];
}

function hasStorageItemType(place: SavedPlace, itemType: string) {
  return place.itemType === itemType || place.storageReferences.some((reference) => reference.itemType === itemType);
}

function telHref(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hasLetters = /[a-z]/i.test(trimmed);
  if (hasLetters) return null;
  const normalized = trimmed.replace(/[^\d+().\-\s]/g, "");
  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 16) return null;
  return `tel:${normalized.replace(/\s+/g, "")}`;
}

function safeHttpUrl(value: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function originalRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function readCoordinate(...values: unknown[]): number | string | null | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}
