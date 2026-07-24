import { geocodeCity } from "./geocoding";
import { fetchGooglePlaces, hasGooglePlacesKey } from "./googlePlaces";

export type GlobalPlaceCategory =
  | "hotel"
  | "restaurant"
  | "attraction"
  | "hospital"
  | "police"
  | "fire_station"
  | "embassy"
  | "transport";

export type GlobalPlace = {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  category: GlobalPlaceCategory;
  detail: string;
  address?: string;
  phone?: string;
  website?: string;
  image?: string;
  source: "google_places" | "openstreetmap" | "fallback";
};

export function placeEmoji(category: GlobalPlaceCategory) {
  if (category === "hotel") return "🏨";
  if (category === "restaurant") return "🍽";
  if (category === "attraction") return "📍";
  if (category === "hospital") return "🏥";
  if (category === "police") return "👮";
  if (category === "fire_station") return "🚒";
  if (category === "embassy") return "🏛";
  return "🚆";
}

export type GlobalPlacesResult = {
  places: GlobalPlace[];
  source: "live" | "cache" | "stale-cache";
  message: string;
  latitude: number;
  longitude: number;
};

export type GlobalPlacesInput = {
  destinationCity: string;
  destinationCountry: string;
  latitude?: number;
  longitude?: number;
};

type GlobalPlacesOptions = {
  ignoreCache?: boolean;
};

const CACHE_DURATION_MS = 1000 * 60 * 60 * 24;
const CACHE_PREFIX = "fanatlas_places_";
const MAX_PLACE_DISTANCE_KM = 300;
const OVERPASS_TIMEOUT_MS = 5000;
const OLD_CACHE_KEYS = [
  "fanatlas_places",
  "fanatlas_saved_travel_content",
  "fanatlas_global_places"
];

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function globalPlacesCacheKey(city: string, country: string) {
  return `${CACHE_PREFIX}${normalizeKey(`${city}_${country}`)}`;
}

function coordinateKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(3)}_${longitude.toFixed(3)}`;
}

function scopedCacheKey(city: string, country: string, latitude: number, longitude: number) {
  return `${CACHE_PREFIX}${normalizeKey(`${city}_${country}_${coordinateKey(latitude, longitude)}`)}`;
}

export function cleanupLegacyPlacesCache() {
  OLD_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(CACHE_PREFIX)) continue;

    const suffix = key.slice(CACHE_PREFIX.length);
    const hasCoordinateSuffix = /_-?\d+_\d{3}_-?\d+_\d{3}$/.test(suffix);
    if (!hasCoordinateSuffix) {
      localStorage.removeItem(key);
    }
  }
}

function readCache(city: string, country: string, latitude: number, longitude: number) {
  cleanupLegacyPlacesCache();
  const cached = localStorage.getItem(scopedCacheKey(city, country, latitude, longitude));
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached);
    if (!Array.isArray(parsed.places)) return null;
    return {
      ...parsed,
      places: validatePlaces(parsed.places, latitude, longitude)
    } as GlobalPlacesResult & { cachedAt: number };
  } catch {
    return null;
  }
}

function readAnyScopedCache(city: string, country: string) {
  cleanupLegacyPlacesCache();
  const prefix = globalPlacesCacheKey(city, country);
  const candidates: Array<GlobalPlacesResult & { cachedAt: number }> = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;

    const cached = localStorage.getItem(key);
    if (!cached) continue;

    try {
      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed.places) || typeof parsed.latitude !== "number" || typeof parsed.longitude !== "number") continue;
      candidates.push({
        ...parsed,
        places: validatePlaces(parsed.places, parsed.latitude, parsed.longitude)
      });
    } catch {
      localStorage.removeItem(key);
    }
  }

  return candidates
    .filter((candidate) => candidate.places.length > 0)
    .sort((a, b) => b.cachedAt - a.cachedAt)[0] || null;
}

function writeCache(city: string, country: string, result: GlobalPlacesResult) {
  localStorage.setItem(scopedCacheKey(city, country, result.latitude, result.longitude), JSON.stringify({
    ...result,
    cachedAt: Date.now()
  }));
}

function distanceKm(latitude: number, longitude: number, place: { lat: number; lng: number }) {
  const earthRadiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(place.lat - latitude);
  const dLng = toRad(place.lng - longitude);
  const lat1 = toRad(latitude);
  const lat2 = toRad(place.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function validatePlaces(places: GlobalPlace[], latitude: number, longitude: number) {
  return places.filter((place) => (
    typeof place.lat === "number" &&
    typeof place.lng === "number" &&
    distanceKm(latitude, longitude, place) <= MAX_PLACE_DISTANCE_KM
  ));
}

function hasCoordinates(input: GlobalPlacesInput) {
  return typeof input.latitude === "number" &&
    typeof input.longitude === "number" &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude) &&
    (input.latitude !== 0 || input.longitude !== 0);
}

function overpassQuery(lat: number, lng: number, radius: number) {
  return `
    [out:json][timeout:25];
    (
      node["tourism"~"^(hotel|hostel|guest_house|attraction|museum)$"](around:${radius},${lat},${lng});
      way["tourism"~"^(hotel|hostel|guest_house|attraction|museum)$"](around:${radius},${lat},${lng});
      relation["tourism"~"^(hotel|hostel|guest_house|attraction|museum)$"](around:${radius},${lat},${lng});
      node["amenity"~"^(restaurant|cafe|fast_food|hospital|police|fire_station|embassy|bus_station)$"](around:${radius},${lat},${lng});
      way["amenity"~"^(restaurant|cafe|fast_food|hospital|police|fire_station|embassy|bus_station)$"](around:${radius},${lat},${lng});
      relation["amenity"~"^(restaurant|cafe|fast_food|hospital|police|fire_station|embassy|bus_station)$"](around:${radius},${lat},${lng});
      node["historic"](around:${radius},${lat},${lng});
      way["historic"](around:${radius},${lat},${lng});
      relation["historic"](around:${radius},${lat},${lng});
      node["leisure"="park"](around:${radius},${lat},${lng});
      way["leisure"="park"](around:${radius},${lat},${lng});
      relation["leisure"="park"](around:${radius},${lat},${lng});
      node["railway"="station"](around:${radius},${lat},${lng});
      way["railway"="station"](around:${radius},${lat},${lng});
      relation["railway"="station"](around:${radius},${lat},${lng});
      node["public_transport"="station"](around:${radius},${lat},${lng});
      way["public_transport"="station"](around:${radius},${lat},${lng});
      relation["public_transport"="station"](around:${radius},${lat},${lng});
    );
    out center tags 80;
  `;
}

function categoryFromTags(tags: Record<string, string>): GlobalPlaceCategory | null {
  if (["hotel", "hostel", "guest_house"].includes(tags.tourism)) return "hotel";
  if (["restaurant", "cafe", "fast_food"].includes(tags.amenity)) return "restaurant";
  if (tags.amenity === "hospital") return "hospital";
  if (tags.amenity === "police") return "police";
  if (tags.amenity === "fire_station") return "fire_station";
  if (tags.amenity === "embassy") return "embassy";
  if (tags.railway === "station" || tags.amenity === "bus_station" || tags.public_transport === "station") return "transport";
  if (tags.tourism === "attraction" || tags.tourism === "museum" || tags.historic || tags.leisure === "park") return "attraction";
  return null;
}

function detailFromTags(tags: Record<string, string>, category: GlobalPlaceCategory) {
  if (tags.tourism) return tags.tourism.replace("_", " ");
  if (tags.amenity) return tags.amenity.replace("_", " ");
  if (tags.historic) return `historic ${tags.historic.replace("_", " ")}`;
  if (tags.leisure) return tags.leisure.replace("_", " ");
  if (category === "transport") return "transport station";
  return category.replace("_", " ");
}

function mapElements(elements: any[], city: string, country: string): GlobalPlace[] {
  const seen = new Set<string>();

  return elements.flatMap((element) => {
    const tags = element.tags || {};
    const category = categoryFromTags(tags);
    const name = tags.name || tags["name:en"];
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;

    if (!category || !name || typeof lat !== "number" || typeof lng !== "number") return [];

    const key = `${category}-${name}-${lat.toFixed(4)}-${lng.toFixed(4)}`;
    if (seen.has(key)) return [];
    seen.add(key);

    return [{
      id: `${element.type}-${element.id}`,
      name,
      city,
      country,
      lat,
      lng,
      category,
      detail: detailFromTags(tags, category),
      address: [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "),
      phone: tags.phone || tags["contact:phone"],
      website: tags.website || tags["contact:website"],
      source: "openstreetmap" as const
    }];
  });
}

async function fetchOverpass(lat: number, lng: number, radius: number) {
  const params = new URLSearchParams({ data: overpassQuery(lat, lng, radius) });
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
  const response = await fetch(`https://overpass-api.de/api/interpreter?${params.toString()}`, {
    signal: controller.signal
  }).finally(() => window.clearTimeout(timeout));
  if (!response.ok) throw new Error("places_unavailable");

  const data = await response.json();
  return mapElements(data.elements || [], "", "");
}

async function fetchPlacesWithAutoRetry(latitude: number, longitude: number) {
  const firstPass = await fetchOverpass(latitude, longitude, 8000);
  if (firstPass.length > 0) return firstPass;

  return fetchOverpass(latitude, longitude, 20000);
}

export function getCachedGlobalPlaces(input: GlobalPlacesInput): GlobalPlacesResult | null {
  cleanupLegacyPlacesCache();

  if (hasCoordinates(input)) {
    const cached = readCache(input.destinationCity, input.destinationCountry, input.latitude!, input.longitude!);
    if (cached && cached.places.length > 0 && Date.now() - cached.cachedAt < CACHE_DURATION_MS) {
      return {
        ...cached,
        source: "cache",
        message: "Using saved travel content."
      };
    }
  }

  const cached = readAnyScopedCache(input.destinationCity, input.destinationCountry);
  if (cached && Date.now() - cached.cachedAt < CACHE_DURATION_MS) {
    return {
      ...cached,
      source: "cache",
      message: "Using saved travel content."
    };
  }

  return null;
}

export async function getGlobalPlaces(input: GlobalPlacesInput, options: GlobalPlacesOptions = {}): Promise<GlobalPlacesResult> {
  cleanupLegacyPlacesCache();
  const initialCachedCoordinates = hasCoordinates(input)
    ? { latitude: input.latitude!, longitude: input.longitude! }
    : null;
  const cached = initialCachedCoordinates
    ? readCache(input.destinationCity, input.destinationCountry, initialCachedCoordinates.latitude, initialCachedCoordinates.longitude)
    : null;
  if (!options.ignoreCache && cached && cached.places.length > 0 && Date.now() - cached.cachedAt < CACHE_DURATION_MS) {
    return {
      ...cached,
      source: "cache",
      message: "Using saved travel content."
    };
  }

  try {
    const geocoded = hasCoordinates(input)
      ? null
      : await geocodeCity(input.destinationCity, input.destinationCountry);
    const latitude = hasCoordinates(input) ? input.latitude! : geocoded?.latitude;
    const longitude = hasCoordinates(input) ? input.longitude! : geocoded?.longitude;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      throw new Error("geocoding_unavailable");
    }

    const coordinateScopedCache = readCache(input.destinationCity, input.destinationCountry, latitude, longitude);
    if (!options.ignoreCache && coordinateScopedCache && coordinateScopedCache.places.length > 0 && Date.now() - coordinateScopedCache.cachedAt < CACHE_DURATION_MS) {
      return {
        ...coordinateScopedCache,
        source: "cache",
        message: "Using saved travel content."
      };
    }

    const googlePlaces = hasGooglePlacesKey()
      ? await fetchGooglePlaces({
        ...input,
        latitude,
        longitude
      }).catch(() => null)
      : null;
    const places = googlePlaces?.places.length ? googlePlaces.places : await fetchPlacesWithAutoRetry(latitude, longitude);

    const normalizedPlaces = validatePlaces(
      places.map((place) => ({
        ...place,
        city: input.destinationCity,
        country: input.destinationCountry
      })),
      latitude,
      longitude
    );

    const result: GlobalPlacesResult = {
      places: normalizedPlaces,
      source: "live",
      message: googlePlaces?.places.length ? "Finding places and photos..." : "Finding nearby places...",
      latitude,
      longitude
    };

    writeCache(input.destinationCity, input.destinationCountry, result);
    return result;
  } catch {
    if (cached && cached.places.length > 0) {
      return {
        ...cached,
        source: "stale-cache",
        message: "Showing saved places while we refresh this destination."
      };
    }

    return {
      places: [],
      source: "live",
      message: `Finding live places near ${input.destinationCity}...`,
      latitude: input.latitude || 0,
      longitude: input.longitude || 0
    };
  }
}
