import type { MapDestination } from "../mapDestinations";

export type NavigationSource =
  | "trip_day"
  | "trip_draft"
  | "destination_hub"
  | "explore"
  | "stadium"
  | "restaurant"
  | "hotel"
  | "sos"
  | "manual";

export type NavigationMode = "driving" | "walking" | "cycling" | "transit";

export type NavigationModeCapability = {
  supported: boolean;
  label: string;
  profile: string | null;
  reason?: string;
};

export type NavigationRouteFreshnessState = "fresh" | "stale" | "unavailable";

export type NavigationCoordinateProvenance =
  | "trip_draft_place"
  | "destination_intelligence"
  | "curated_seed"
  | "user_selected_map_point"
  | "existing_place_dataset"
  | "sos_location"
  | "manual";

export type NavigationCoordinate = {
  latitude: number;
  longitude: number;
  trusted: boolean;
  provenance: NavigationCoordinateProvenance;
};

export type NavigationDestination = {
  id: string | null;
  label: string;
  name: string;
  city: string;
  country: string | null;
  address: string | null;
  type: string | null;
  source: NavigationSource;
  coordinates: NavigationCoordinate | null;
  destinationLabel: string;
};

export type NavigationOriginSource = "user_location" | "trip_day" | "map" | "manual" | "unknown";

export type NavigationOrigin = {
  source: NavigationOriginSource;
  coordinates: NavigationCoordinate | null;
  requestedAt: string | null;
};

export type NavigationRequest = {
  destination: NavigationDestination;
  origin: NavigationOrigin | null;
  mode: NavigationMode;
  source: NavigationSource;
  requestedAt: string;
};

export type NavigationRouteStatus = "idle" | "loading" | "success" | "partial" | "unavailable" | "error";

export type NavigationRouteFreshness = {
  class: "live" | "recent" | "dated" | "unknown" | "expired";
  retrievedAt: string;
  staleAt?: string;
  expiresAt?: string;
  state?: NavigationRouteFreshnessState;
};

export type NavigationRoute = {
  request: NavigationRequest;
  status: NavigationRouteStatus;
  distanceMeters: number | null;
  durationSeconds: number | null;
  geometry: Array<[number, number]>;
  retrievedAt: string | null;
  freshness: NavigationRouteFreshness | null;
  source: string | null;
  sourceQuality: string | null;
  unavailableReason?: string;
};

export type NavigationDataQuality = "trusted" | "partial" | "unavailable";

export type NavigationDestinationInput = {
  id?: string | null;
  name: string;
  city: string;
  country?: string | null;
  address?: string | null;
  type?: string | null;
  source: NavigationSource;
  coordinates?: NavigationCoordinate | null;
  label?: string | null;
};

export type NavigationRequestInput = {
  destination: NavigationDestinationInput;
  mode?: NavigationMode;
  origin?: NavigationOrigin | null;
  source?: NavigationSource;
  requestedAt?: string;
};

export type NavigationSearchParams = {
  lat?: number;
  lng?: number;
  label?: string;
  name?: string;
  city?: string;
  country?: string;
  mode?: NavigationMode;
  source?: NavigationSource;
  id?: string;
};

export type NavigationRouteCandidate = {
  request: NavigationRequest;
  distanceMeters: number;
  durationSeconds: number;
  geometry: Array<[number, number]>;
  source: string;
  sourceQuality: string;
  freshness: NavigationRouteFreshness | null;
};

export type NavigationRouteResponse = {
  routes?: Array<{
    distance?: unknown;
    duration?: unknown;
    geometry?: {
      coordinates?: unknown;
    };
  }>;
};

export type NavigationDestinationSummary = Pick<NavigationDestination, "id" | "label" | "name" | "city" | "country" | "address" | "type" | "source" | "destinationLabel"> & {
  coordinates: NavigationCoordinate | null;
};

export type NavigationRouteFormatOptions = {
  locale?: string;
  maximumFractionDigits?: number;
};

export type NavigationRequestQuery = {
  lat?: string;
  lng?: string;
  label?: string;
  name?: string;
  city?: string;
  country?: string;
  mode?: string;
  source?: string;
  id?: string;
};

export type NavigationRouteQuery = {
  lat?: string;
  lng?: string;
  label?: string;
  name?: string;
  city?: string;
  country?: string;
  mode?: string;
  source?: string;
  id?: string;
};

export type NavigationDestinationLike = MapDestination & {
  id?: string | null;
  country?: string | null;
  source?: NavigationSource | string;
};
