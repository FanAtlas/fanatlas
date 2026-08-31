import type { MapDestination } from "../mapDestinations";
import type {
  NavigationCoordinate,
  NavigationCoordinateProvenance,
  NavigationDataQuality,
  NavigationDestination,
  NavigationDestinationInput,
  NavigationDestinationLike,
  NavigationMode,
  NavigationModeCapability,
  NavigationOrigin,
  NavigationOriginSource,
  NavigationRequest,
  NavigationRequestInput,
  NavigationRoute,
  NavigationRouteResponse,
  NavigationRouteFreshnessState,
  NavigationSource
} from "./navigationTypes";

export type {
  NavigationCoordinate,
  NavigationCoordinateProvenance,
  NavigationDataQuality,
  NavigationDestination,
  NavigationDestinationInput,
  NavigationDestinationLike,
  NavigationMode,
  NavigationModeCapability,
  NavigationOrigin,
  NavigationOriginSource,
  NavigationRequest,
  NavigationRequestInput,
  NavigationRoute,
  NavigationRouteResponse,
  NavigationRouteFreshnessState,
  NavigationSource
} from "./navigationTypes";

const SUPPORTED_MODES: Record<NavigationMode, NavigationModeCapability> = {
  driving: {
    supported: true,
    label: "Driving",
    profile: "car"
  },
  walking: {
    supported: true,
    label: "Walking",
    profile: "foot"
  },
  cycling: {
    supported: false,
    label: "Cycling",
    profile: null,
    reason: "Cycling routing is not supported by the current route provider"
  },
  transit: {
    supported: false,
    label: "Transit",
    profile: null,
    reason: "Transit routing is not supported by the current route provider"
  }
};

const NAVIGATION_SOURCES: Set<NavigationSource> = new Set([
  "trip_day",
  "trip_draft",
  "destination_hub",
  "explore",
  "stadium",
  "restaurant",
  "hotel",
  "sos",
  "manual"
]);

export function isNavigationSource(value: unknown): value is NavigationSource {
  return typeof value === "string" && NAVIGATION_SOURCES.has(value as NavigationSource);
}

export function normalizeNavigationSource(value: unknown, fallback: NavigationSource = "manual"): NavigationSource {
  return isNavigationSource(value) ? value : fallback;
}

export function navigationModeCapability(mode: NavigationMode): NavigationModeCapability {
  return SUPPORTED_MODES[mode];
}

export function navigationModeSupported(mode: NavigationMode) {
  return navigationModeCapability(mode).supported;
}

export function supportedNavigationModes() {
  return (Object.keys(SUPPORTED_MODES) as NavigationMode[]).filter((mode) => SUPPORTED_MODES[mode].supported);
}

export function trustedNavigationCoordinate(input: { latitude: number; longitude: number }, provenance: NavigationCoordinateProvenance, trusted = true): NavigationCoordinate | null {
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) return null;
  if (input.latitude < -90 || input.latitude > 90) return null;
  if (input.longitude < -180 || input.longitude > 180) return null;
  return {
    latitude: input.latitude,
    longitude: input.longitude,
    trusted,
    provenance
  };
}

export function hasTrustedNavigationCoordinates(value: NavigationCoordinate | null | undefined) {
  return Boolean(value && value.trusted && isValidNavigationCoordinate(value.latitude, value.longitude));
}

export function isValidNavigationCoordinate(latitude: number, longitude: number) {
  return Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;
}

export function navigationCoordinateQuality(value: NavigationCoordinate | null | undefined): NavigationDataQuality {
  if (!value) return "unavailable";
  return value.trusted ? "trusted" : "partial";
}

export function buildNavigationDestination(input: NavigationDestinationInput): NavigationDestination {
  const name = normalizeDisplayText(input.name) || "Unknown destination";
  const city = normalizeDisplayText(input.city);
  const country = normalizeDisplayText(input.country || "");
  const coordinates = input.coordinates && isValidNavigationCoordinate(input.coordinates.latitude, input.coordinates.longitude)
    ? {
        latitude: input.coordinates.latitude,
        longitude: input.coordinates.longitude,
        trusted: input.coordinates.trusted !== false,
        provenance: input.coordinates.provenance
      }
    : null;

  return {
    id: input.id && normalizeDisplayText(input.id) ? normalizeDisplayText(input.id) : null,
    label: normalizeDisplayText(input.label) || [name, city].filter(Boolean).join(", "),
    name,
    city,
    country: country || null,
    address: normalizeDisplayText(input.address || ""),
    type: normalizeDisplayText(input.type || ""),
    source: input.source,
    coordinates,
    destinationLabel: [name, city, country].filter(Boolean).join(", ")
  };
}

export function buildNavigationDestinationFromMapDestination(
  destination: NavigationDestinationLike,
  source: NavigationSource,
  provenance: NavigationCoordinateProvenance = "existing_place_dataset"
): NavigationDestination {
  return buildNavigationDestination({
    id: destination.id || null,
    name: destination.name,
    city: destination.city,
    country: destination.country || null,
    address: destination.address || null,
    type: destination.type || null,
    source,
    coordinates: isValidNavigationCoordinate(destination.lat, destination.lng)
      ? trustedNavigationCoordinate({ latitude: destination.lat, longitude: destination.lng }, provenance)
      : null,
    label: [destination.name, destination.city].filter(Boolean).join(", ")
  });
}

export function buildNavigationOrigin(
  input: { latitude: number; longitude: number } | null,
  source: NavigationOriginSource,
  provenance: NavigationCoordinateProvenance = "user_selected_map_point"
): NavigationOrigin {
  return {
    source,
    coordinates: input && isValidNavigationCoordinate(input.latitude, input.longitude)
      ? trustedNavigationCoordinate(input, provenance)
      : null,
    requestedAt: new Date().toISOString()
  };
}

export function buildNavigationRequest(input: NavigationRequestInput): NavigationRequest {
  const source = normalizeNavigationSource(input.source || input.destination.source || "manual");
  const mode = normalizeNavigationMode(input.mode || "driving");
  return {
    destination: buildNavigationDestination(input.destination),
    origin: input.origin ? normalizeNavigationOrigin(input.origin) : null,
    mode,
    source,
    requestedAt: input.requestedAt || new Date().toISOString()
  };
}

export function buildNavigationRequestFromMapDestination(
  destination: NavigationDestinationLike,
  source: NavigationSource,
  options: { mode?: NavigationMode; origin?: NavigationOrigin | null; provenance?: NavigationCoordinateProvenance; requestedAt?: string } = {}
): NavigationRequest {
  return buildNavigationRequest({
    destination: {
      ...destination,
      source,
      coordinates: isValidNavigationCoordinate(destination.lat, destination.lng)
        ? trustedNavigationCoordinate({ latitude: destination.lat, longitude: destination.lng }, options.provenance || "existing_place_dataset")
        : null
    },
    mode: options.mode || "driving",
    origin: options.origin || null,
    source,
    requestedAt: options.requestedAt
  });
}

export function normalizeNavigationMode(value: unknown): NavigationMode {
  if (value === "walking" || value === "cycling" || value === "transit") return value;
  return "driving";
}

export function normalizeNavigationOrigin(origin: NavigationOrigin): NavigationOrigin {
  return {
    source: origin.source,
    coordinates: origin.coordinates && isValidNavigationCoordinate(origin.coordinates.latitude, origin.coordinates.longitude)
      ? {
          latitude: origin.coordinates.latitude,
          longitude: origin.coordinates.longitude,
          trusted: origin.coordinates.trusted !== false,
          provenance: origin.coordinates.provenance
        }
      : null,
    requestedAt: origin.requestedAt || null
  };
}

export function navigationRequestKey(request: NavigationRequest) {
  const origin = request.origin?.coordinates ? `${request.origin.coordinates.latitude},${request.origin.coordinates.longitude}` : request.origin?.source || "";
  const destination = request.destination.coordinates
    ? `${request.destination.coordinates.latitude},${request.destination.coordinates.longitude}`
    : `${request.destination.label}:${request.destination.city}:${request.destination.country || ""}`;
  return [request.source, request.mode, origin, destination].join("|");
}

export function navigationSearchParams(request: NavigationRequest): URLSearchParams {
  const params = new URLSearchParams();
  if (request.destination.coordinates) {
    params.set("lat", String(request.destination.coordinates.latitude));
    params.set("lng", String(request.destination.coordinates.longitude));
  }
  if (request.destination.id) params.set("id", request.destination.id);
  if (request.destination.label) params.set("label", request.destination.label);
  if (request.destination.name && request.destination.name !== request.destination.label) params.set("name", request.destination.name);
  if (request.destination.city) params.set("city", request.destination.city);
  if (request.destination.country) params.set("country", request.destination.country);
  params.set("mode", request.mode);
  params.set("source", request.source);
  return params;
}

export function parseNavigationRequestQuery(query: string): NavigationRequest | null {
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  const lat = parseCoordinate(params.get("lat"));
  const lng = parseCoordinate(params.get("lng"));
  const label = normalizeDisplayText(params.get("label") || "");
  const name = normalizeDisplayText(params.get("name") || label);
  const city = normalizeDisplayText(params.get("city") || "");
  const country = normalizeDisplayText(params.get("country") || "");
  const source = normalizeNavigationSource(params.get("source"), "manual");
  const mode = normalizeNavigationMode(params.get("mode"));
  const id = normalizeDisplayText(params.get("id") || "");

  if (lat === null || lng === null) return null;
  const coordinates = lat !== null && lng !== null
    ? trustedNavigationCoordinate({ latitude: lat, longitude: lng }, "user_selected_map_point")
    : null;

  return buildNavigationRequest({
    destination: {
      id: id || null,
      name: name || label || city || "Selected destination",
      city,
      country: country || null,
      address: null,
      type: null,
      source,
      coordinates,
      label: label || [name, city].filter(Boolean).join(", ") || "Selected destination"
    },
    mode,
    source
  });
}

export function parseNavigationRequestFromLocation(location: { search: string }): NavigationRequest | null {
  return parseNavigationRequestQuery(location.search || "");
}

export function buildNavigationRoute(input: {
  request: NavigationRequest;
  distanceMeters: number;
  durationSeconds: number;
  geometry: Array<[number, number]>;
  retrievedAt: string;
  source: string;
  sourceQuality: string;
  freshness?: NavigationRoute["freshness"];
}): NavigationRoute {
  return {
    request: input.request,
    status: "success",
    distanceMeters: input.distanceMeters,
    durationSeconds: input.durationSeconds,
    geometry: input.geometry,
    retrievedAt: input.retrievedAt,
    freshness: input.freshness
      ? normalizeNavigationRouteFreshness(input.freshness)
      : {
          class: "live",
          retrievedAt: input.retrievedAt,
          state: "fresh"
        },
    source: input.source,
    sourceQuality: input.sourceQuality
  };
}

export function normalizeNavigationRouteResponse(payload: NavigationRouteResponse, request: NavigationRequest): NavigationRoute | null {
  const route = payload.routes?.[0];
  if (!route) return null;
  const retrievedAt = new Date().toISOString();

  const distanceMeters = typeof route.distance === "number" && Number.isFinite(route.distance) && route.distance >= 0 ? route.distance : null;
  const durationSeconds = typeof route.duration === "number" && Number.isFinite(route.duration) && route.duration >= 0 ? route.duration : null;
  const geometry = normalizeRouteGeometry(route.geometry?.coordinates);

  if (distanceMeters === null || durationSeconds === null || geometry.length < 2) return null;

  return buildNavigationRoute({
    request,
    distanceMeters,
    durationSeconds,
    geometry,
    retrievedAt,
    source: "OSRM",
    sourceQuality: "public_route",
    freshness: {
      class: "live",
      retrievedAt,
      state: "fresh"
    }
  });
}

export function navigationRouteMatchesRequest(route: NavigationRoute | null | undefined, request: NavigationRequest | null | undefined) {
  if (!route || !request) return false;
  return navigationRequestKey(route.request) === navigationRequestKey(request);
}

export function navigationRouteFreshnessState(
  route: NavigationRoute | null | undefined,
  input: { currentRequest?: NavigationRequest | null; isOnline: boolean; now?: Date | number | string } = { isOnline: true }
): NavigationRouteFreshnessState {
  if (!route || route.status === "idle" || route.status === "loading" || route.status === "error" || route.status === "unavailable") {
    return "unavailable";
  }

  if (!navigationRouteMatchesRequest(route, input.currentRequest || route.request)) {
    return "stale";
  }

  if (!input.isOnline) {
    return "stale";
  }

  const freshness = route.freshness;
  if (!freshness) return "fresh";

  const nowMs = input.now instanceof Date ? input.now.getTime() : typeof input.now === "string" ? new Date(input.now).getTime() : typeof input.now === "number" ? input.now : Date.now();
  if (freshness.state === "stale") return "stale";
  if (freshness.expiresAt && Date.parse(freshness.expiresAt) <= nowMs) return "stale";
  if (freshness.staleAt && Date.parse(freshness.staleAt) <= nowMs) return "stale";

  return freshness.state || "fresh";
}

export function navigationRouteFreshnessLabel(
  route: NavigationRoute | null | undefined,
  input: { currentRequest?: NavigationRequest | null; isOnline: boolean; now?: Date | number | string } = { isOnline: true }
) {
  const freshness = navigationRouteFreshnessState(route, input);
  if (freshness === "stale") {
    return input.isOnline ? "Route retrieved earlier." : "Route retrieved earlier. Routing requires a connection.";
  }
  if (freshness === "unavailable") {
    return "Route unavailable.";
  }
  return "";
}

function normalizeNavigationRouteFreshness(freshness: NonNullable<NavigationRoute["freshness"]>): NonNullable<NavigationRoute["freshness"]> {
  return {
    ...freshness,
    state: freshness.state || "fresh"
  };
}

export function normalizeRouteGeometry(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  const coordinates: Array<[number, number]> = [];

  for (const point of value) {
    if (!Array.isArray(point) || point.length < 2) return [];
    const lng = Number(point[0]);
    const lat = Number(point[1]);
    if (!isValidNavigationCoordinate(lat, lng)) return [];
    coordinates.push([lat, lng]);
  }

  return coordinates;
}

export function formatNavigationDistance(distanceMeters: number, locale = "en", maximumFractionDigits = 1) {
  const kilometers = distanceMeters / 1000;
  if (kilometers < 1) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.max(1, Math.round(distanceMeters)))} m`;
  }
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: kilometers >= 10 ? 0 : 1, maximumFractionDigits }).format(kilometers)} km`;
}

export function formatNavigationDuration(durationSeconds: number, locale = "en") {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(minutes)} min`;
}

export function formatNavigationCoordinate(value: number, locale = "en") {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(value);
}

export function buildNavigationMapLinks(destination: NavigationDestination) {
  if (!destination.coordinates) return null;
  const encodedLatLng = encodeURIComponent(`${destination.coordinates.latitude},${destination.coordinates.longitude}`);
  return {
    apple: `https://maps.apple.com/?daddr=${encodedLatLng}`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${encodedLatLng}`,
    waze: `https://waze.com/ul?ll=${encodedLatLng}&navigate=yes`
  };
}

export function destinationFromMapDestination(destination: MapDestination): NavigationDestination {
  return buildNavigationDestinationFromMapDestination(destination, "manual");
}

export function normalizeNavigationLabel(destination: NavigationDestination) {
  return destination.destinationLabel || destination.label || destination.name;
}

function parseCoordinate(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDisplayText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function navigationRequestToDestination(request: NavigationRequest): MapDestination | null {
  const coordinates = request.destination.coordinates;
  if (!coordinates) return null;
  return {
    name: request.destination.name,
    city: request.destination.city,
    lat: coordinates.latitude,
    lng: coordinates.longitude,
    emoji: "📍",
    type: "place",
    address: request.destination.address || undefined
  };
}
