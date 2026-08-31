import { describe, expect, it } from "vitest";
import { buildOfflineMapDownloadState, buildOfflineMapPack, buildOfflineMapPackManifest, buildOfflineMapProviderCapability, buildOfflineMapRegion, buildOfflineMapStorageEstimate, deriveOfflineMapBounds, deriveTripOfflineMapRegion, isValidOfflineMapBounds, offlineMapPackIsDownloaded, offlineMapPackIsUpdateAvailable, offlineMapPackIsUsable, summarizeOfflineMapPack } from "./offlineMaps";

describe("offlineMaps", () => {
  it("validates and derives offline map bounds from trip destinations", () => {
    expect(isValidOfflineMapBounds({ south: 38.7, west: -9.2, north: 38.8, east: -9.1 })).toBe(true);
    expect(isValidOfflineMapBounds({ south: 38.8, west: -9.2, north: 38.7, east: -9.1 })).toBe(false);
    expect(isValidOfflineMapBounds({ south: 0, west: 0, north: 0, east: 0 })).toBe(true);

    const derived = deriveOfflineMapBounds([
      { latitude: 38.7223, longitude: -9.1393 },
      { latitude: 38.7167, longitude: -9.1399 }
    ]);

    expect(derived).not.toBeNull();
    expect(derived?.south).toBeLessThanOrEqual(38.7167);
    expect(derived?.north).toBeGreaterThanOrEqual(38.7223);
  });

  it("builds a trip region and keeps the source immutable", () => {
    const destinations = [
      { latitude: 38.7223, longitude: -9.1393 },
      { latitude: 38.7167, longitude: -9.1399 }
    ];
    const before = structuredClone(destinations);
    const region = deriveTripOfflineMapRegion({
      tripId: "trip-1",
      tripName: "Lisbon",
      destinations,
      city: "Lisbon",
      country: "Portugal"
    });

    expect(region?.scope).toBe("trip");
    expect(region?.destinationCount).toBe(2);
    expect(destinations).toEqual(before);

    const cityRegion = buildOfflineMapRegion({
      id: "city-lisbon",
      label: "Lisbon",
      scope: "city",
      bounds: { south: 38.6, west: -9.3, north: 38.8, east: -9.0 },
      destinationCount: 4,
      city: "Lisbon",
      country: "Portugal"
    });

    expect(cityRegion?.scope).toBe("city");
    expect(cityRegion?.city).toBe("Lisbon");
  });

  it("models storage pressure, download states, and privacy-safe summaries", () => {
    const region = buildOfflineMapRegion({
      id: "trip-lisbon",
      label: "Lisbon trip",
      scope: "trip",
      bounds: { south: 38.6, west: -9.3, north: 38.8, east: -9.0 },
      destinationCount: 4,
      city: "Lisbon",
      country: "Portugal"
    });

    expect(region).not.toBeNull();

    const manifest = buildOfflineMapPackManifest({
      id: "pack-1",
      provider: "pmtiles",
      region: region!,
      contentVersion: "2026.08",
      createdAt: "2026-08-30T10:00:00.000Z",
      updatedAt: "2026-08-30T10:00:00.000Z",
      attribution: ["© OpenStreetMap contributors"],
      routeOverlaySupported: true,
      offlineRoutingSupported: false,
      integrity: "complete"
    });

    const storage = buildOfflineMapStorageEstimate({
      requiredBytes: 42_000_000,
      availableBytes: 100_000_000,
      warningThresholdBytes: 50_000_000,
      confidence: "estimated"
    });
    expect(storage.pressure).toBe("available");

    const download = buildOfflineMapDownloadState({
      status: "downloaded",
      downloadedBytes: 42_000_000,
      totalBytes: 42_000_000,
      startedAt: "2026-08-30T10:00:00.000Z",
      updatedAt: "2026-08-30T10:15:00.000Z"
    });
    const capability = buildOfflineMapProviderCapability({
      web: true,
      native: true,
      regionDownloads: true,
      estimateBeforeDownload: true,
      updateChecks: true,
      delete: true,
      vectorTiles: true,
      rasterTiles: false,
      routeOverlays: true,
      offlineRouting: false,
      turnByTurn: false
    });
    const pack = buildOfflineMapPack({ manifest, storage, download, providerCapability: capability });

    expect(offlineMapPackIsDownloaded(pack)).toBe(true);
    expect(offlineMapPackIsUsable(pack)).toBe(true);
    expect(offlineMapPackIsUpdateAvailable(pack)).toBe(false);

    const summary = summarizeOfflineMapPack(pack);
    expect(summary).toMatchObject({
      id: "pack-1",
      regionLabel: "Lisbon trip",
      status: "downloaded",
      usable: true
    });

    const cloned = structuredClone(pack);
    cloned.manifest.region.label = "Changed";
    expect(pack.manifest.region.label).toBe("Lisbon trip");
  });

  it("represents update and failure states without pretending partial data is complete", () => {
    const region = buildOfflineMapRegion({
      id: "trip-madrid",
      label: "Madrid trip",
      scope: "trip",
      bounds: { south: 40.2, west: -3.9, north: 40.6, east: -3.4 },
      destinationCount: 3,
      city: "Madrid",
      country: "Spain"
    });

    const manifest = buildOfflineMapPackManifest({
      id: "pack-2",
      provider: "pmtiles",
      region: region!,
      contentVersion: "2026.08",
      createdAt: "2026-08-30T10:00:00.000Z",
      updatedAt: "2026-08-30T10:00:00.000Z",
      integrity: "incomplete"
    });

    const pack = buildOfflineMapPack({
      manifest,
      status: "update_available",
      storage: buildOfflineMapStorageEstimate({
        requiredBytes: 80_000_000,
        availableBytes: 25_000_000,
        warningThresholdBytes: 40_000_000
      }),
      download: buildOfflineMapDownloadState({
        status: "failed",
        downloadedBytes: 12_000_000,
        totalBytes: 80_000_000,
        error: "Storage full"
      }),
      providerCapability: buildOfflineMapProviderCapability({
        web: true,
        native: false,
        regionDownloads: true
      })
    });

    expect(pack.storage.pressure).toBe("full");
    expect(pack.status).toBe("update_available");
    expect(offlineMapPackIsUpdateAvailable(pack)).toBe(true);
    expect(offlineMapPackIsDownloaded(pack)).toBe(false);
    expect(offlineMapPackIsUsable(pack)).toBe(false);
  });
});
