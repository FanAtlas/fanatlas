import {
  classifyPlaceTrust,
  getCoordinates,
  normalizePlaceType,
  stablePlaceId,
  type NormalizedPlaceType,
  type PlaceLike,
  type PlaceTrust
} from "./placeUtils";
import type { GlobalPlace } from "../services/globalPlaces";

export type ExploreCandidateKind =
  | "verified"
  | "suggestion"
  | "editorial"
  | "archived"
  | "unknown";

export type ExploreCandidate = {
  id: string;
  logicalId: string;
  sourceId?: string;
  providerId?: string;
  name: string;
  type: NormalizedPlaceType;
  category: string;
  trust: PlaceTrust;
  kind: ExploreCandidateKind;
  source?: string;
  city?: string;
  country?: string;
  address?: string;
  lat?: number;
  lng?: number;
  hasCoordinates: boolean;
  isRoutable: boolean;
  image?: string;
  detail?: string;
  original: unknown;
};

export type ExploreCandidateGroups = {
  candidates: ExploreCandidate[];
  verified: ExploreCandidate[];
  suggestions: ExploreCandidate[];
};

type BuildExploreCandidatesInput = {
  attractions?: readonly unknown[];
  restaurants?: readonly unknown[];
  hotels?: readonly unknown[];
  suggestions?: readonly unknown[];
};

export function buildExploreCandidate(place: unknown, categoryHint?: string): ExploreCandidate | null {
  const record = asRecord(place);
  if (!record) return null;

  const name = firstString(record.name, record.title);
  const sourceId = firstString(record.id, record.sourceId);
  const persistedId = sourceId || firstString(record.providerId, record.placeId);
  if (!name || !persistedId) return null;

  const placeLike: PlaceLike = {
    id: sourceId,
    providerId: firstString(record.providerId, record.placeId, record.googlePlaceId),
    placeId: firstString(record.placeId, record.googlePlaceId),
    name,
    city: firstString(record.city),
    country: firstString(record.country),
    lat: firstCoordinateValue(record.lat, record.latitude),
    lng: firstCoordinateValue(record.lng, record.longitude),
    latitude: firstCoordinateValue(record.latitude),
    longitude: firstCoordinateValue(record.longitude),
    source: firstString(record.source),
    type: firstString(record.type, categoryHint),
    category: firstString(record.category, categoryHint),
    detail: firstString(record.detail, record.description),
    address: firstString(record.address),
    image: firstString(record.image),
    metadata: record.metadata
  };
  const coordinates = getCoordinates(placeLike);
  const trust = classifyPlaceTrust(placeLike);
  const type = normalizePlaceType(placeLike);

  return {
    // Explore saves use the existing card ID. Do not replace it with stablePlaceId.
    id: persistedId,
    logicalId: stablePlaceId(placeLike),
    sourceId: sourceId || undefined,
    providerId: firstString(placeLike.providerId, placeLike.placeId) || undefined,
    name,
    type,
    category: exploreCategoryForType(type, firstString(record.category, categoryHint)),
    trust,
    kind: candidateKind(trust),
    source: firstString(record.source) || undefined,
    city: firstString(record.city) || undefined,
    country: firstString(record.country) || undefined,
    address: firstString(record.address) || undefined,
    lat: coordinates?.lat,
    lng: coordinates?.lng,
    hasCoordinates: coordinates !== null,
    isRoutable: coordinates !== null && trust === "verified_provider",
    image: firstString(record.image) || undefined,
    detail: firstString(record.detail, record.description) || undefined,
    original: place
  };
}

export function buildExploreCandidates(input: BuildExploreCandidatesInput): ExploreCandidateGroups {
  const candidates = [
    ...(input.attractions || []).map((place) => buildExploreCandidate(place, "attraction")),
    ...(input.restaurants || []).map((place) => buildExploreCandidate(place, "restaurant")),
    ...(input.hotels || []).map((place) => buildExploreCandidate(place, "hotel")),
    ...(input.suggestions || []).map((place) => buildExploreCandidate(place))
  ].filter((candidate): candidate is ExploreCandidate => Boolean(candidate));

  const deduped = dedupeByCandidateId(candidates);

  return {
    candidates: deduped,
    verified: deduped.filter((candidate) => candidate.kind === "verified"),
    suggestions: deduped.filter((candidate) => candidate.kind !== "verified")
  };
}

export function candidateOriginalPlace(candidate: ExploreCandidate): GlobalPlace | null {
  const record = asRecord(candidate.original);
  if (!record || !record.category) return null;
  return candidate.original as GlobalPlace;
}

function dedupeByCandidateId(candidates: ExploreCandidate[]) {
  const byId = new Map<string, ExploreCandidate>();
  candidates.forEach((candidate) => {
    const existing = byId.get(candidate.id);
    byId.set(candidate.id, existing ? richerCandidate(existing, candidate) : candidate);
  });
  return [...byId.values()];
}

function richerCandidate(left: ExploreCandidate, right: ExploreCandidate) {
  const score = (candidate: ExploreCandidate) =>
    (candidate.kind === "verified" ? 4 : 0) +
    (candidate.hasCoordinates ? 3 : 0) +
    (candidate.image ? 1 : 0) +
    (candidate.address ? 1 : 0);
  return score(right) > score(left) ? right : left;
}

function candidateKind(trust: PlaceTrust): ExploreCandidateKind {
  if (trust === "verified_provider") return "verified";
  if (trust === "destination_suggestion") return "suggestion";
  if (trust === "static_editorial") return "editorial";
  if (trust === "archived_event") return "archived";
  return "unknown";
}

function exploreCategoryForType(type: NormalizedPlaceType, categoryHint: string) {
  // Keep Explore's current sections: cafes/parks/museums/family remain detail filters within these base categories.
  if (categoryHint === "restaurant" || categoryHint === "hotel" || categoryHint === "attraction") return categoryHint;
  if (type === "restaurant" || type === "cafe") return "restaurant";
  if (type === "hotel") return "hotel";
  if (type === "event" || type === "stadium" || type === "fan_zone") return "event";
  return "attraction";
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function firstCoordinateValue(...values: unknown[]): string | number | null | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}
