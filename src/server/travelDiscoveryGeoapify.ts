import { normalizeTravelDiscoveryPlace } from "../lib/travelDiscoveryPlaces";
import type { DestinationIdentity } from "../lib/destinationIntelligenceTypes";
import type { TravelDiscoveryPlaceCategory, TravelDiscoveryProvider, TravelDiscoveryProviderRawResult, TravelDiscoveryRequest } from "../lib/travelDiscoveryTypes";
import type { TravelDiscoveryCoordinate } from "../lib/travelDiscoveryTypes";
import { stableDiscoveryCacheKey, TravelDiscoveryMemoryCache } from "./travelDiscoveryCache";

declare const process: { env: Record<string, string | undefined> };

export const GEOAPIFY_CATEGORY_MAPPING: Partial<Record<TravelDiscoveryPlaceCategory, string[]>> = {
  attraction: ["tourism.attraction"], museum: ["entertainment.museum"], landmark: ["tourism.sights"], historic_site: ["heritage"],
  park: ["leisure.park"], nature: ["natural"], restaurant: ["catering.restaurant"], cafe: ["catering.cafe"],
  shopping: ["commercial.shopping_mall", "commercial.marketplace"], market: ["commercial.marketplace"], nightlife: ["catering.bar", "entertainment.nightclub"],
  entertainment: ["entertainment"], family: ["entertainment.theme_park", "entertainment.zoo"], sports: ["sport"], wellness: ["healthcare.spa", "leisure.spa"]
};

type GeoapifyProperties = { place_id?: unknown; name?: unknown; categories?: unknown; formatted?: unknown; address_line1?: unknown; address_line2?: unknown; lat?: unknown; lon?: unknown; website?: unknown; description?: unknown };
type GeoapifyFeature = { properties?: GeoapifyProperties; geometry?: { type?: unknown; coordinates?: unknown } };
type GeoapifyCollection = { features?: unknown };
type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type GeoapifySafeDiagnostic = { upstreamStatus: number; providerCode?: string; providerMessage?: string };

export type GeoapifyProviderOptions = {
  apiKey: string;
  fetchImpl?: FetchLike;
  resolveCoordinates: (destination: DestinationIdentity) => TravelDiscoveryCoordinate | null;
  now?: () => string;
  timeoutMs?: number;
  cache?: TravelDiscoveryMemoryCache<TravelDiscoveryProviderRawResult>;
  cacheTtlMs?: number;
  onDiagnostic?: (diagnostic: GeoapifySafeDiagnostic) => void;
};

const inFlight = new Map<string, Promise<TravelDiscoveryProviderRawResult>>();

export class GeoapifyProviderError extends Error { constructor(public readonly code: "PROVIDER_UNAVAILABLE" | "RATE_LIMITED" | "AUTH_REQUIRED" | "NETWORK_ERROR" | "UNSUPPORTED_CAPABILITY", message = "The discovery source is unavailable.") { super(message); } }

export function geoapifyCategories(category?: TravelDiscoveryPlaceCategory): string[] | null {
  if (!category) return ["tourism", "heritage", "leisure", "catering", "commercial", "entertainment", "sport"];
  return GEOAPIFY_CATEGORY_MAPPING[category] || null;
}

export function buildGeoapifyPlacesUrl(request: TravelDiscoveryRequest, coordinates: TravelDiscoveryCoordinate, apiKey: string): URL {
  const categories = geoapifyCategories(request.category);
  if (!categories) throw new GeoapifyProviderError("UNSUPPORTED_CAPABILITY", "This category is not supported by the discovery source.");
  const url = new URL("https://api.geoapify.com/v2/places");
  url.searchParams.set("categories", categories.join(","));
  url.searchParams.set("filter", `circle:${coordinates.longitude},${coordinates.latitude},${Math.min(request.radiusMeters || 15000, 50000)}`);
  url.searchParams.set("limit", String(Math.min(request.limit || 20, 20)));
  url.searchParams.set("apiKey", apiKey.trim());
  return url;
}

export function createGeoapifyTravelDiscoveryProvider(options: GeoapifyProviderOptions): TravelDiscoveryProvider {
  const fetchImpl = options.fetchImpl || fetch;
  const now = options.now || (() => new Date().toISOString());
  return {
    id: "geoapify",
    name: "Geoapify",
    capabilities: { textSearch: true, nearbySearch: false, categories: true, ratings: false, hours: false, photos: false, price: false, accessibility: false, details: false },
    async searchPlaces(request): Promise<TravelDiscoveryProviderRawResult> {
      const cacheKey = stableDiscoveryCacheKey({ provider: "geoapify", destination: (request.destination as DestinationIdentity).id, category: request.category || "all", query: request.query?.trim().toLowerCase() || "", radiusMeters: request.radiusMeters || 15000, limit: Math.min(request.limit || 20, 20) });
      const cached = options.cache?.get(cacheKey);
      if (cached) return { ...cached, freshness: { class: "recent_cache", retrievedAt: cached.freshness.retrievedAt } };
      const existing = inFlight.get(cacheKey);
      if (existing) return existing;
      const pending = searchGeoapify(request, options, fetchImpl, now);
      inFlight.set(cacheKey, pending);
      try {
        const result = await pending;
        options.cache?.set(cacheKey, result, options.cacheTtlMs || 5 * 60_000);
        return result;
      } finally { inFlight.delete(cacheKey); }
    },
    normalizePlace(raw, context) {
      const properties = (raw as GeoapifyFeature)?.properties;
      if (!properties) return null;
      const categories = Array.isArray(properties.categories) ? properties.categories : [];
      const category = context.destination ? categoryFromGeoapifyCategories(categories) : null;
      const coordinates = geoapifyCoordinates(raw as GeoapifyFeature, properties);
      const normalized = normalizeTravelDiscoveryPlace({
        id: properties.place_id,
        name: properties.name,
        category: category || "attraction",
        address: properties.formatted || [properties.address_line1, properties.address_line2].filter(Boolean).join(", "),
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        websiteUrl: properties.website,
        description: properties.description
      }, { provider: "geoapify", providerName: "Geoapify", ...context });
      if (!normalized) return null;
      return { ...normalized, source: { ...normalized.source, attributionRequired: true, attributionText: "Geoapify" } };
    }
  };
}

function geoapifyCoordinates(feature: GeoapifyFeature, properties: GeoapifyProperties): TravelDiscoveryCoordinate | undefined {
  const propertyCoordinates = validGeoapifyCoordinates(properties.lat, properties.lon);
  if (propertyCoordinates) return propertyCoordinates;
  const geometry = feature.geometry;
  if (geometry?.type !== "Point" || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) return undefined;
  return validGeoapifyCoordinates(geometry.coordinates[1], geometry.coordinates[0]);
}

function validGeoapifyCoordinates(latitude: unknown, longitude: unknown): TravelDiscoveryCoordinate | undefined {
  return typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
    ? { latitude, longitude }
    : undefined;
}

async function searchGeoapify(request: TravelDiscoveryRequest, options: GeoapifyProviderOptions, fetchImpl: FetchLike, now: () => string): Promise<TravelDiscoveryProviderRawResult> {
      const coordinates = request.mode === "nearby" ? request.coordinates : options.resolveCoordinates(request.destination as DestinationIdentity);
      if (!coordinates) throw new GeoapifyProviderError("PROVIDER_UNAVAILABLE", "Destination geography is unavailable.");
      const url = buildGeoapifyPlacesUrl(request, coordinates, options.apiKey);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs || 8000);
      let response: Response;
      try { response = await fetchImpl(url, { signal: controller.signal }); }
      catch { throw new GeoapifyProviderError("NETWORK_ERROR", "The discovery source could not be reached."); }
      finally { clearTimeout(timer); }
      if (!response.ok) {
        if (process.env.NODE_ENV !== "production" && process.env.FANATLAS_TRAVEL_DISCOVERY_DIAGNOSTICS === "true") {
          options.onDiagnostic?.(await safeGeoapifyDiagnostic(response));
        }
        if (response.status === 401 || response.status === 403) throw new GeoapifyProviderError("AUTH_REQUIRED");
        if (response.status === 429) throw new GeoapifyProviderError("RATE_LIMITED");
        throw new GeoapifyProviderError("PROVIDER_UNAVAILABLE");
      }
      let payload: GeoapifyCollection;
      try { payload = await response.json() as GeoapifyCollection; } catch { throw new GeoapifyProviderError("PROVIDER_UNAVAILABLE"); }
      const query = request.query?.trim().toLocaleLowerCase();
      const features = Array.isArray(payload.features) ? payload.features.filter((item): item is GeoapifyFeature => Boolean(item && typeof item === "object")) : [];
      const filtered = query ? features.filter((feature) => String(feature.properties?.name || "").toLocaleLowerCase().includes(query)) : features;
      return { places: filtered, freshness: { class: "live", retrievedAt: now() } };
}

async function safeGeoapifyDiagnostic(response: Response): Promise<GeoapifySafeDiagnostic> {
  const diagnostic: GeoapifySafeDiagnostic = { upstreamStatus: response.status };
  try {
    const body = await response.clone().json() as Record<string, unknown>;
    const code = safeDiagnosticText(body.code ?? body.errorCode);
    const message = safeDiagnosticText(body.message ?? body.error);
    if (code) diagnostic.providerCode = code;
    if (message) diagnostic.providerMessage = message;
  } catch { /* An upstream body is intentionally never surfaced. */ }
  return diagnostic;
}

function safeDiagnosticText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const sanitized = value
    .replace(/(api[_-]?key|key|token|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/https?:\/\/\S+/gi, "[REDACTED_URL]")
    .trim()
    .slice(0, 160);
  return sanitized || undefined;
}

function categoryFromGeoapify(value: string): TravelDiscoveryPlaceCategory | null {
  const entry = Object.entries(GEOAPIFY_CATEGORY_MAPPING).find(([, values]) => values?.some((item) => value === item || value.startsWith(`${item}.`)));
  return (entry?.[0] as TravelDiscoveryPlaceCategory | undefined) || null;
}

function categoryFromGeoapifyCategories(values: unknown[]): TravelDiscoveryPlaceCategory | null {
  return values
    .filter((value): value is string => typeof value === "string")
    .sort((a, b) => b.length - a.length)
    .map(categoryFromGeoapify)
    .find((category): category is TravelDiscoveryPlaceCategory => Boolean(category)) || null;
}
