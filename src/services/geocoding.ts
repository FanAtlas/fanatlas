export type GeocodingResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

const GEOCODING_CACHE_PREFIX = "fanatlas_geocode_";
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const GEOCODING_TIMEOUT_MS = 6000;

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function cacheKey(city: string, country: string) {
  return `${GEOCODING_CACHE_PREFIX}${normalizeKey(`${city}_${country}`)}`;
}

export async function geocodeCity(city: string, country: string): Promise<GeocodingResult | null> {
  const key = cacheKey(city, country);
  const cached = localStorage.getItem(key);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.cachedAt < CACHE_DURATION_MS) {
        return parsed.result;
      }
    } catch {
      localStorage.removeItem(key);
    }
  }

  const params = new URLSearchParams({
    q: `${city}, ${country}`,
    format: "jsonv2",
    limit: "1"
  });

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), GEOCODING_TIMEOUT_MS);

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: "application/json"
    },
    signal: controller.signal
  }).finally(() => window.clearTimeout(timeout));

  if (!response.ok) return null;

  const data = await response.json();
  const first = Array.isArray(data) ? data[0] : null;
  if (!first?.lat || !first?.lon) return null;

  const result = {
    latitude: Number(first.lat),
    longitude: Number(first.lon),
    displayName: String(first.display_name || `${city}, ${country}`)
  };

  localStorage.setItem(key, JSON.stringify({
    cachedAt: Date.now(),
    result
  }));

  return result;
}
