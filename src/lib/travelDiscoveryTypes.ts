import type { DestinationIdentity, DestinationReferenceInput } from "./destinationIntelligenceTypes";
import type { TravelPlanningBudgetStyle, TravelPlanningCandidate, TravelPlanningInterest } from "./travelPlannerTypes";

export const TRAVEL_DISCOVERY_SCHEMA_VERSION = 1 as const;

export type TravelDiscoveryPlaceCategory =
  | "attraction"
  | "museum"
  | "landmark"
  | "historic_site"
  | "park"
  | "nature"
  | "restaurant"
  | "cafe"
  | "shopping"
  | "market"
  | "nightlife"
  | "entertainment"
  | "family"
  | "sports"
  | "wellness";

export type TravelDiscoveryFreshnessClass = "live" | "recent_cache" | "stale_cache" | "curated" | "unknown";

export type TravelDiscoveryFreshness = {
  class: TravelDiscoveryFreshnessClass;
  retrievedAt?: string;
  expiresAt?: string;
};

export type TravelDiscoveryCoordinate = {
  latitude: number;
  longitude: number;
};

export type TravelDiscoveryLocation = {
  label?: string;
  coordinates?: TravelDiscoveryCoordinate;
};

export type TravelDiscoveryRating = {
  value: number;
  scale: number;
  count?: number;
};

export type TravelDiscoveryOpeningHoursStatus = "known" | "temporarily_closed" | "permanently_closed" | "unknown";

export type TravelDiscoveryOpeningHoursInterval = {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  start: string;
  end: string;
};

export type TravelDiscoveryOpeningHours = {
  status: TravelDiscoveryOpeningHoursStatus;
  intervals?: TravelDiscoveryOpeningHoursInterval[];
  freshness: TravelDiscoveryFreshness;
};

export type TravelDiscoveryAccessibility = {
  wheelchair?: "yes" | "no" | "partial" | "unknown";
  sourceBacked: true;
};

export type TravelDiscoverySource = {
  provider: string;
  providerName?: string;
  sourcePlaceId?: string;
  retrievedAt?: string;
  dataClasses: string[];
  attributionRequired?: boolean;
  attributionText?: string;
};

export type TravelDiscoveryPlace = {
  schemaVersion: typeof TRAVEL_DISCOVERY_SCHEMA_VERSION;
  logicalId: string;
  name: string;
  category: TravelDiscoveryPlaceCategory;
  subcategory?: string;
  destination: DestinationIdentity;
  location?: TravelDiscoveryLocation;
  source: TravelDiscoverySource;
  freshness: TravelDiscoveryFreshness;
  websiteUrl?: string;
  budgetStyle?: Exclude<TravelPlanningBudgetStyle, "flexible">;
  rating?: TravelDiscoveryRating;
  openingHours?: TravelDiscoveryOpeningHours;
  accessibility?: TravelDiscoveryAccessibility;
  description?: string;
  image?: { url: string; alt?: string };
};

export type TravelDiscoveryRequest = {
  destination: DestinationReferenceInput | DestinationIdentity;
  query?: string;
  category?: TravelDiscoveryPlaceCategory;
  interests?: TravelPlanningInterest[];
  coordinates?: TravelDiscoveryCoordinate;
  radiusMeters?: number;
  budgetStyle?: TravelPlanningBudgetStyle;
  wheelchairAccessibilityRequired?: boolean;
  limit?: number;
  mode?: "destination" | "nearby";
  requiresCurrentInformation?: boolean;
};

export type TravelDiscoveryErrorCode =
  | "INVALID_DESTINATION"
  | "INVALID_REQUEST"
  | "PROVIDER_UNAVAILABLE"
  | "RATE_LIMITED"
  | "AUTH_REQUIRED"
  | "NETWORK_ERROR"
  | "NO_RESULTS"
  | "STALE_DATA"
  | "UNSUPPORTED_CAPABILITY";

export type TravelDiscoveryError = {
  code: TravelDiscoveryErrorCode;
  message: string;
  provider?: string;
  retryable?: boolean;
};

export type TravelDiscoveryResult = {
  schemaVersion: typeof TRAVEL_DISCOVERY_SCHEMA_VERSION;
  request: Pick<TravelDiscoveryRequest, "category" | "limit" | "mode" | "radiusMeters"> & { destinationId: string };
  places: TravelDiscoveryPlace[];
  freshness: TravelDiscoveryFreshness;
  errors: TravelDiscoveryError[];
};

export type TravelDiscoveryProviderCapabilities = {
  textSearch: boolean;
  nearbySearch: boolean;
  categories: boolean;
  ratings: boolean;
  hours: boolean;
  photos: boolean;
  price: boolean;
  accessibility: boolean;
  details: boolean;
};

export type TravelDiscoveryProviderRawResult = {
  places: readonly unknown[];
  freshness: TravelDiscoveryFreshness;
};

export type TravelDiscoveryProvider = {
  id: string;
  name: string;
  capabilities: TravelDiscoveryProviderCapabilities;
  searchPlaces: (request: TravelDiscoveryRequest) => Promise<TravelDiscoveryProviderRawResult>;
  normalizePlace: (raw: unknown, context: { destination: DestinationIdentity; freshness: TravelDiscoveryFreshness }) => TravelDiscoveryPlace | null;
};

export type TravelDiscoveryPlanningCandidateDraft = Omit<TravelPlanningCandidate, "estimatedDurationMinutes"> & {
  estimatedDurationMinutes?: number;
};
