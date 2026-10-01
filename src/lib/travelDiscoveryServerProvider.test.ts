import { describe, expect, it, vi } from "vitest";
import { createFanAtlasServerTravelDiscoveryProvider } from "./travelDiscoveryServerProvider";
import { resolveCityIdentity } from "./destinationIntelligence";

describe("FanAtlas server discovery provider", () => {
  it("calls only the FanAtlas endpoint and returns safe normalized places", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ places: [{ schemaVersion: 1, logicalId: "geo:1", name: "Museum", category: "museum", destination: resolveCityIdentity({ countryCode: "PT", city: "Lisbon" }), source: { provider: "geoapify", dataClasses: ["name"] }, freshness: { class: "live" } }], freshness: { class: "live" } }), { status: 200 }));
    const provider = createFanAtlasServerTravelDiscoveryProvider(fetchImpl);
    const result = await provider.searchPlaces({ destination: resolveCityIdentity({ countryCode: "PT", city: "Lisbon" })!, category: "museum" });
    expect(fetchImpl).toHaveBeenCalledWith("/api/travel-discovery", expect.objectContaining({ method: "POST" }));
    expect(result.places).toHaveLength(1);
    expect(provider.normalizePlace(result.places[0], { destination: resolveCityIdentity({ countryCode: "PT", city: "Lisbon" })!, freshness: { class: "live" } })?.name).toBe("Museum");
  });
});
