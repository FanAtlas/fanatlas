import { normalizeDestinationKey, resolveCityIdentity, resolveCountryIdentity } from "./destinationIntelligence";
import type { DestinationIdentity, DestinationReferenceInput } from "./destinationIntelligenceTypes";
import type {
  TravelDiscoveryAccessibility,
  TravelDiscoveryCoordinate,
  TravelDiscoveryError,
  TravelDiscoveryFreshness,
  TravelDiscoveryOpeningHours,
  TravelDiscoveryOpeningHoursInterval,
  TravelDiscoveryPlace,
  TravelDiscoveryPlaceCategory,
  TravelDiscoveryPlanningCandidateDraft,
  TravelDiscoveryProvider,
  TravelDiscoveryRequest,
  TravelDiscoveryResult,
  TravelDiscoverySource,
  TravelDiscoveryRating
} from "./travelDiscoveryTypes";
import { TRAVEL_DISCOVERY_SCHEMA_VERSION } from "./travelDiscoveryTypes";
import type { TravelPlanningInterest } from "./travelPlannerTypes";

const MAX_LIMIT = 50;
const MAX_RADIUS_METERS = 50_000;
const MAX_NAME_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_LABEL_LENGTH = 240;
const MAX_SOURCE_ID_LENGTH = 180;
const INTERESTS = new Set<TravelPlanningInterest>([
  "food", "coffee", "history", "culture", "museums", "architecture", "nature", "beaches", "shopping", "nightlife", "family", "photography", "sports", "wellness", "local_experiences"
]);

type RawPlace = {
  id?: unknown;
  placeId?: unknown;
  name?: unknown;
  category?: unknown;
  subcategory?: unknown;
  address?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  websiteUrl?: unknown;
  budgetStyle?: unknown;
  rating?: unknown;
  ratingScale?: unknown;
  ratingCount?: unknown;
  openingHours?: unknown;
  accessibility?: unknown;
  description?: unknown;
  imageUrl?: unknown;
};

export type DiscoveryRequestValidation = { ok: true; request: TravelDiscoveryRequest; destination: DestinationIdentity } | { ok: false; error: TravelDiscoveryError };

export function validateTravelDiscoveryRequest(input: TravelDiscoveryRequest): DiscoveryRequestValidation {
  if (!input || !input.destination) return { ok: false, error: { code: "INVALID_REQUEST", message: "A destination is required.", retryable: false } };
  const categories: TravelDiscoveryPlaceCategory[] = ["attraction", "museum", "landmark", "historic_site", "park", "nature", "restaurant", "cafe", "shopping", "market", "nightlife", "entertainment", "family", "sports", "wellness"];
  if (input.category !== undefined && !categories.includes(input.category)) return { ok: false, error: { code: "INVALID_REQUEST", message: "The discovery category is invalid.", retryable: false } };
  if (input.query !== undefined && (typeof input.query !== "string" || input.query.length > 120)) return { ok: false, error: { code: "INVALID_REQUEST", message: "The discovery search is invalid.", retryable: false } };
  if (input.mode !== undefined && input.mode !== "destination" && input.mode !== "nearby") return { ok: false, error: { code: "INVALID_REQUEST", message: "The discovery mode is invalid.", retryable: false } };
  if (input.budgetStyle !== undefined && !["budget", "moderate", "premium", "flexible"].includes(input.budgetStyle)) return { ok: false, error: { code: "INVALID_REQUEST", message: "The discovery budget is invalid.", retryable: false } };
  if (input.wheelchairAccessibilityRequired !== undefined && typeof input.wheelchairAccessibilityRequired !== "boolean") return { ok: false, error: { code: "INVALID_REQUEST", message: "The accessibility preference is invalid.", retryable: false } };
  if (input.coordinates !== undefined && !validCoordinates(input.coordinates)) return { ok: false, error: { code: "INVALID_REQUEST", message: "The discovery coordinates are invalid.", retryable: false } };
  const destination = resolveCanonicalDestination(input.destination);
  if (!destination) return { ok: false, error: { code: "INVALID_DESTINATION", message: "The destination could not be resolved.", retryable: false } };

  const mode = input.mode || "destination";
  if (mode === "nearby" && !validCoordinates(input.coordinates)) {
    return { ok: false, error: { code: "INVALID_REQUEST", message: "Nearby discovery requires explicit coordinates.", retryable: false } };
  }
  if (input.radiusMeters !== undefined && (!Number.isFinite(input.radiusMeters) || input.radiusMeters <= 0 || input.radiusMeters > MAX_RADIUS_METERS)) {
    return { ok: false, error: { code: "INVALID_REQUEST", message: "The discovery radius is invalid.", retryable: false } };
  }
  if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > MAX_LIMIT)) {
    return { ok: false, error: { code: "INVALID_REQUEST", message: "The discovery result limit is invalid.", retryable: false } };
  }

  return {
    ok: true,
    destination,
    request: {
      ...input,
      destination,
      mode,
      query: typeof input.query === "string" ? input.query.trim().slice(0, 120) || undefined : undefined,
      interests: [...new Set((input.interests || []).filter((interest): interest is TravelPlanningInterest => INTERESTS.has(interest)))],
      limit: input.limit || 20
    }
  };
}

export async function discoverTravelPlaces(input: TravelDiscoveryRequest, provider: TravelDiscoveryProvider): Promise<TravelDiscoveryResult> {
  const validation = validateTravelDiscoveryRequest(input);
  if (validation.ok === false) {
    return {
      schemaVersion: TRAVEL_DISCOVERY_SCHEMA_VERSION,
      request: { destinationId: "unknown", category: input?.category, limit: input?.limit, mode: input?.mode, radiusMeters: input?.radiusMeters },
      places: [],
      freshness: { class: "unknown" },
      errors: [validation.error]
    };
  }
  const request = validation.request;
  if (request.mode === "nearby" && !provider.capabilities.nearbySearch) {
    return emptyDiscoveryResult(request, { code: "UNSUPPORTED_CAPABILITY", message: "This source does not support nearby discovery.", provider: provider.id, retryable: false });
  }
  if (request.mode !== "nearby" && !provider.capabilities.textSearch) {
    return emptyDiscoveryResult(request, { code: "UNSUPPORTED_CAPABILITY", message: "This source does not support destination discovery.", provider: provider.id, retryable: false });
  }
  try {
    const raw = await provider.searchPlaces(request);
    if (request.requiresCurrentInformation && raw.freshness.class === "stale_cache") {
      return emptyDiscoveryResult(request, { code: "STALE_DATA", message: "Current destination information is unavailable from this source.", provider: provider.id, retryable: true }, raw.freshness);
    }
    const places = deduplicateTravelDiscoveryPlaces(
      raw.places
        .map((item) => provider.normalizePlace(item, { destination: validation.destination, freshness: raw.freshness }))
        .filter((place): place is TravelDiscoveryPlace => Boolean(place))
        .filter((place) => !request.category || place.category === request.category)
    ).slice(0, request.limit || 20);
    return {
      schemaVersion: TRAVEL_DISCOVERY_SCHEMA_VERSION,
      request: { destinationId: validation.destination.id, category: request.category, limit: request.limit, mode: request.mode, radiusMeters: request.radiusMeters },
      places,
      freshness: raw.freshness,
      errors: places.length ? [] : [{ code: "NO_RESULTS", message: "No places matched this destination request.", provider: provider.id, retryable: false }]
    };
  } catch (error) {
    return emptyDiscoveryResult(request, mapProviderError(error, provider.id));
  }
}

export function normalizeTravelDiscoveryPlace(raw: unknown, input: { provider: string; providerName?: string; destination: DestinationIdentity; freshness: TravelDiscoveryFreshness }): TravelDiscoveryPlace | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as RawPlace;
  const name = boundedText(value.name, MAX_NAME_LENGTH);
  const category = normalizeDiscoveryCategory(value.category);
  if (!name || !category) return null;
  const sourcePlaceId = boundedText(value.placeId ?? value.id, MAX_SOURCE_ID_LENGTH);
  const coordinates = readCoordinates(value.latitude, value.longitude);
  const source: TravelDiscoverySource = {
    provider: boundedText(input.provider, 80) || "unknown",
    providerName: boundedText(input.providerName, 120) || undefined,
    sourcePlaceId: sourcePlaceId || undefined,
    retrievedAt: input.freshness.retrievedAt,
    dataClasses: dataClassesForRaw(value),
    attributionRequired: true
  };
  const place: TravelDiscoveryPlace = {
    schemaVersion: TRAVEL_DISCOVERY_SCHEMA_VERSION,
    logicalId: stableDiscoveryPlaceId(source.provider, sourcePlaceId, name, input.destination.id),
    name,
    category,
    subcategory: boundedText(value.subcategory, 80) || undefined,
    destination: { ...input.destination },
    location: coordinates || boundedText(value.address, MAX_LABEL_LENGTH) ? {
      label: boundedText(value.address, MAX_LABEL_LENGTH) || undefined,
      coordinates: coordinates || undefined
    } : undefined,
    source,
    freshness: { ...input.freshness },
    websiteUrl: safeHttpUrl(value.websiteUrl),
    budgetStyle: normalizeBudget(value.budgetStyle),
    rating: normalizeRating(value.rating, value.ratingScale, value.ratingCount),
    openingHours: normalizeOpeningHours(value.openingHours, input.freshness),
    accessibility: normalizeAccessibility(value.accessibility),
    description: boundedText(value.description, MAX_DESCRIPTION_LENGTH) || undefined,
    image: safeHttpUrl(value.imageUrl) ? { url: safeHttpUrl(value.imageUrl) as string, alt: name } : undefined
  };
  return stripUndefined(place);
}

export function deduplicateTravelDiscoveryPlaces(places: readonly TravelDiscoveryPlace[]): TravelDiscoveryPlace[] {
  const sorted = [...places].sort((a, b) => a.name.localeCompare(b.name) || a.source.provider.localeCompare(b.source.provider) || a.logicalId.localeCompare(b.logicalId));
  const seen = new Set<string>();
  const result: TravelDiscoveryPlace[] = [];
  for (const place of sorted) {
    const providerKey = place.source.sourcePlaceId ? `${place.source.provider}:${place.source.sourcePlaceId}` : "";
    const fallbackKey = `${place.destination.id}:${normalizeDestinationKey(place.name)}:${coordinateKey(place.location?.coordinates)}`;
    if (seen.has(providerKey || fallbackKey)) continue;
    if (!providerKey && result.some((candidate) => sameConservativePlace(candidate, place))) continue;
    seen.add(providerKey || fallbackKey);
    result.push(place);
  }
  return result;
}

export function travelDiscoveryPlaceToPlanningCandidate(place: TravelDiscoveryPlace, options: { durationMinutes?: number; priority?: number } = {}): TravelDiscoveryPlanningCandidateDraft {
  const candidate: TravelDiscoveryPlanningCandidateDraft = {
    id: `discovery:${place.source.provider}:${place.source.sourcePlaceId || place.logicalId}`.slice(0, 160),
    title: place.name,
    category: place.category,
    preferredTimeOfDay: "any",
    interestTags: interestsForCategory(place.category),
    source: "destination_data",
    destinationId: place.destination.id,
    priority: options.priority ?? 0
  };
  if (options.durationMinutes !== undefined && Number.isFinite(options.durationMinutes) && options.durationMinutes > 0) {
    candidate.estimatedDurationMinutes = options.durationMinutes;
  }
  if (place.budgetStyle) candidate.costLevel = place.budgetStyle;
  if (place.location?.coordinates) candidate.location = { ...place.location.coordinates, label: place.location.label };
  return candidate;
}

export function resolveCanonicalDestination(input: DestinationReferenceInput | DestinationIdentity): DestinationIdentity | null {
  if ("id" in input && typeof input.id === "string" && input.type !== "unknown") return { ...input };
  const reference = input as DestinationReferenceInput;
  const city = resolveCityIdentity(reference);
  if (city?.type === "city") return city;
  const country = resolveCountryIdentity(reference);
  return country?.type === "country" ? country : null;
}

function emptyDiscoveryResult(request: TravelDiscoveryRequest, error: TravelDiscoveryError, freshness: TravelDiscoveryFreshness = { class: "unknown" }): TravelDiscoveryResult {
  const destination = resolveCanonicalDestination(request.destination);
  return {
    schemaVersion: TRAVEL_DISCOVERY_SCHEMA_VERSION,
    request: { destinationId: destination?.id || "unknown", category: request.category, limit: request.limit, mode: request.mode, radiusMeters: request.radiusMeters },
    places: [],
    freshness,
    errors: [error]
  };
}

function mapProviderError(error: unknown, provider: string): TravelDiscoveryError {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "PROVIDER_UNAVAILABLE";
  const allowed: TravelDiscoveryError["code"][] = ["PROVIDER_UNAVAILABLE", "RATE_LIMITED", "AUTH_REQUIRED", "NETWORK_ERROR", "UNSUPPORTED_CAPABILITY", "NO_RESULTS", "STALE_DATA"];
  const normalized = allowed.includes(code as TravelDiscoveryError["code"]) ? code as TravelDiscoveryError["code"] : "PROVIDER_UNAVAILABLE";
  return { code: normalized, message: normalized === "RATE_LIMITED" ? "The discovery source is rate limited." : "The discovery source is unavailable.", provider, retryable: normalized !== "AUTH_REQUIRED" && normalized !== "UNSUPPORTED_CAPABILITY" };
}

function normalizeDiscoveryCategory(value: unknown): TravelDiscoveryPlaceCategory | null {
  const token = normalizeToken(value);
  const mapping: Record<string, TravelDiscoveryPlaceCategory> = {
    attraction: "attraction", attractions: "attraction", museum: "museum", museums: "museum", landmark: "landmark", historic: "historic_site", historic_site: "historic_site", history: "historic_site", park: "park", parks: "park", nature: "nature", garden: "nature", restaurant: "restaurant", restaurants: "restaurant", dining: "restaurant", food: "restaurant", cafe: "cafe", coffee: "cafe", shopping: "shopping", shop: "shopping", market: "market", nightlife: "nightlife", bar: "nightlife", entertainment: "entertainment", theater: "entertainment", family: "family", kids: "family", sports: "sports", stadium: "sports", wellness: "wellness", spa: "wellness"
  };
  return mapping[token] || null;
}

function interestsForCategory(category: TravelDiscoveryPlaceCategory): TravelPlanningInterest[] {
  const mapping: Partial<Record<TravelDiscoveryPlaceCategory, TravelPlanningInterest[]>> = {
    restaurant: ["food"], cafe: ["coffee"], museum: ["museums", "culture"], landmark: ["architecture", "photography"], historic_site: ["history", "culture"], park: ["nature"], nature: ["nature"], shopping: ["shopping"], market: ["food", "shopping", "local_experiences"], nightlife: ["nightlife"], entertainment: ["culture"], family: ["family"], sports: ["sports"], wellness: ["wellness"]
  };
  return mapping[category] ? [...mapping[category]!] : ["local_experiences"];
}

function normalizeBudget(value: unknown): "budget" | "moderate" | "premium" | undefined {
  return value === "budget" || value === "moderate" || value === "premium" ? value : undefined;
}

function normalizeRating(value: unknown, scale: unknown, count: unknown): TravelDiscoveryRating | undefined {
  const rating = finiteNumber(value);
  const ratingScale = finiteNumber(scale);
  if (rating === null || ratingScale === null || rating <= 0 || ratingScale <= 0 || rating > ratingScale) return undefined;
  const ratingCount = finiteNumber(count);
  return { value: rating, scale: ratingScale, count: ratingCount !== null && ratingCount >= 0 ? Math.floor(ratingCount) : undefined };
}

function normalizeOpeningHours(value: unknown, freshness: TravelDiscoveryFreshness): TravelDiscoveryOpeningHours | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as { status?: unknown; intervals?: unknown };
  const status = source.status === "known" || source.status === "temporarily_closed" || source.status === "permanently_closed" ? source.status : "unknown";
  const intervals = Array.isArray(source.intervals) ? source.intervals.map(normalizeHoursInterval).filter((item): item is TravelDiscoveryOpeningHoursInterval => Boolean(item)) : [];
  return { status, intervals: intervals.length ? intervals : undefined, freshness: { ...freshness } };
}

function normalizeHoursInterval(value: unknown): TravelDiscoveryOpeningHoursInterval | null {
  if (!value || typeof value !== "object") return null;
  const item = value as { day?: unknown; start?: unknown; end?: unknown };
  const day = Number(item.day);
  const start = strictTime(item.start);
  const end = strictTime(item.end);
  if (!Number.isInteger(day) || day < 0 || day > 6 || !start || !end) return null;
  return { day: day as TravelDiscoveryOpeningHoursInterval["day"], start, end };
}

function normalizeAccessibility(value: unknown): TravelDiscoveryAccessibility | undefined {
  if (!value || typeof value !== "object") return undefined;
  const wheelchair = (value as { wheelchair?: unknown }).wheelchair;
  if (wheelchair !== "yes" && wheelchair !== "no" && wheelchair !== "partial") return { wheelchair: "unknown", sourceBacked: true };
  return { wheelchair, sourceBacked: true };
}

function dataClassesForRaw(value: RawPlace): string[] {
  return [
    value.name ? "name" : "",
    value.category ? "category" : "",
    value.latitude !== undefined && value.longitude !== undefined ? "coordinates" : "",
    value.rating !== undefined ? "rating" : "",
    value.openingHours !== undefined ? "opening_hours" : "",
    value.accessibility !== undefined ? "accessibility" : ""
  ].filter(Boolean);
}

function readCoordinates(latitude: unknown, longitude: unknown): TravelDiscoveryCoordinate | undefined {
  const lat = finiteNumber(latitude);
  const lng = finiteNumber(longitude);
  return lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { latitude: lat, longitude: lng } : undefined;
}

function validCoordinates(coordinates: TravelDiscoveryCoordinate | undefined): coordinates is TravelDiscoveryCoordinate {
  return Boolean(coordinates && readCoordinates(coordinates.latitude, coordinates.longitude));
}

function strictTime(value: unknown): string | null {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  return value;
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function safeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2_000) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function boundedText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function normalizeToken(value: unknown): string {
  return boundedText(value, 100).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function stableDiscoveryPlaceId(provider: string, sourcePlaceId: string, name: string, destinationId: string): string {
  const base = sourcePlaceId || `${destinationId}:${normalizeDestinationKey(name)}`;
  return `discovery:${provider}:${base}`.slice(0, 180);
}

function coordinateKey(coordinates: TravelDiscoveryCoordinate | undefined): string {
  return coordinates ? `${coordinates.latitude.toFixed(4)}:${coordinates.longitude.toFixed(4)}` : "unknown";
}

function sameConservativePlace(a: TravelDiscoveryPlace, b: TravelDiscoveryPlace): boolean {
  if (a.destination.id !== b.destination.id || normalizeDestinationKey(a.name) !== normalizeDestinationKey(b.name)) return false;
  const left = a.location?.coordinates;
  const right = b.location?.coordinates;
  return Boolean(left && right && Math.abs(left.latitude - right.latitude) <= 0.0005 && Math.abs(left.longitude - right.longitude) <= 0.0005);
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}
