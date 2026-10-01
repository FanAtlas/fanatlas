import type { TravelDiscoveryProvider, TravelDiscoveryProviderRawResult, TravelDiscoveryPlace } from "./travelDiscoveryTypes";

export function createFanAtlasServerTravelDiscoveryProvider(fetchImpl: typeof fetch = fetch): TravelDiscoveryProvider {
  return {
    id: "fanatlas-server",
    name: "FanAtlas discovery",
    capabilities: { textSearch: true, nearbySearch: false, categories: true, ratings: false, hours: false, photos: false, price: false, accessibility: false, details: false },
    async searchPlaces(request): Promise<TravelDiscoveryProviderRawResult> {
      const token = readBrowserAccessToken();
      const response = await fetchImpl("/api/travel-discovery", { method: "POST", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" }, body: JSON.stringify(request) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error("Discovery request failed"), { code: body?.errors?.[0]?.code || "PROVIDER_UNAVAILABLE" });
      return { places: Array.isArray(body.places) ? body.places : [], freshness: body.freshness || { class: "unknown" } };
    },
    normalizePlace(raw) {
      return raw && typeof raw === "object" && (raw as TravelDiscoveryPlace).schemaVersion === 1 ? raw as TravelDiscoveryPlace : null;
    }
  };
}

function readBrowserAccessToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const value = JSON.parse(window.localStorage.getItem(key) || "null") as { access_token?: unknown } | null;
      if (typeof value?.access_token === "string") return value.access_token;
    }
  } catch { return undefined; }
  return undefined;
}
