import type { TravelDiscoveryProvider, TravelDiscoveryProviderRawResult, TravelDiscoveryRequest } from "./travelDiscoveryTypes";
import { normalizeTravelDiscoveryPlace } from "./travelDiscoveryPlaces";

export type SyntheticDiscoveryProviderOptions = {
  retrievedAt?: string;
  freshnessClass?: "live" | "recent_cache" | "stale_cache" | "curated" | "unknown";
  failureCode?: "PROVIDER_UNAVAILABLE" | "RATE_LIMITED" | "AUTH_REQUIRED" | "NETWORK_ERROR";
};

const SYNTHETIC_PLACES = [
  { id: "synthetic-history-museum", name: "Synthetic History Museum", category: "museum", address: "1 Synthetic Way", latitude: 38.72, longitude: -9.14, rating: 4.6, ratingScale: 5, ratingCount: 2431, websiteUrl: "https://example.test/synthetic-history" },
  { id: "synthetic-riverside-park", name: "Synthetic Riverside Park", category: "park", address: "2 Synthetic River Road", latitude: 38.721, longitude: -9.141 },
  { id: "synthetic-local-cafe", name: "Synthetic Local Cafe", category: "cafe", address: "3 Synthetic Street", latitude: 0, longitude: 0 },
  { id: "synthetic-unsafe-url", name: "Synthetic Local Cafe Annex", category: "cafe", latitude: 38.73, longitude: -9.15, websiteUrl: "javascript:alert(1)" }
] as const;

export function createSyntheticTravelDiscoveryProvider(options: SyntheticDiscoveryProviderOptions = {}): TravelDiscoveryProvider {
  const freshness = {
    class: options.freshnessClass || "curated",
    retrievedAt: options.retrievedAt || "2026-09-09T12:00:00.000Z"
  } as const;
  return {
    id: "synthetic-fixture",
    name: "Synthetic Fixture Provider",
    capabilities: { textSearch: true, nearbySearch: true, categories: true, ratings: true, hours: false, photos: false, price: false, accessibility: false, details: true },
    async searchPlaces(request: TravelDiscoveryRequest): Promise<TravelDiscoveryProviderRawResult> {
      if (options.failureCode) throw Object.assign(new Error("synthetic provider failure"), { code: options.failureCode });
      const query = request.query?.trim().toLowerCase();
      const places = query ? SYNTHETIC_PLACES.filter((place) => `${place.name} ${place.category}`.toLowerCase().includes(query)) : SYNTHETIC_PLACES;
      return { places, freshness };
    },
    normalizePlace(raw, context) {
      return normalizeTravelDiscoveryPlace(raw, { provider: "synthetic-fixture", providerName: "Synthetic Fixture Provider", ...context });
    }
  };
}
