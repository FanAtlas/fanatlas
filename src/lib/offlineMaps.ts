export type OfflineMapPackStatus =
  | "not_downloaded"
  | "estimating"
  | "ready_to_download"
  | "downloading"
  | "paused"
  | "downloaded"
  | "update_available"
  | "failed"
  | "deleting"
  | "unsupported";

export type OfflineMapRegionScope = "city" | "trip" | "custom_bounds";

export type OfflineMapBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type OfflineMapRegion = {
  id: string;
  label: string;
  scope: OfflineMapRegionScope;
  bounds: OfflineMapBounds;
  destinationCount: number;
  city: string | null;
  country: string | null;
};

export type OfflineMapProviderCapability = {
  web: boolean;
  native: boolean;
  regionDownloads: boolean;
  estimateBeforeDownload: boolean;
  updateChecks: boolean;
  delete: boolean;
  vectorTiles: boolean;
  rasterTiles: boolean;
  routeOverlays: boolean;
  offlineRouting: boolean;
  turnByTurn: boolean;
};

export type OfflineMapStorageEstimate = {
  requiredBytes: number | null;
  availableBytes: number | null;
  warningThresholdBytes: number | null;
  confidence: "unknown" | "estimated" | "exact";
  pressure: "unknown" | "available" | "warning" | "full";
};

export type OfflineMapDownloadState = {
  status: OfflineMapPackStatus;
  downloadedBytes: number;
  totalBytes: number | null;
  startedAt: string | null;
  updatedAt: string | null;
  error: string | null;
};

export type OfflineMapPackIntegrity = "unknown" | "incomplete" | "complete";

export type OfflineMapPackManifest = {
  id: string;
  provider: string;
  region: OfflineMapRegion;
  contentVersion: string;
  createdAt: string;
  updatedAt: string;
  attribution: string[];
  routeOverlaySupported: boolean;
  offlineRoutingSupported: boolean;
  integrity: OfflineMapPackIntegrity;
};

export type OfflineMapPack = {
  manifest: OfflineMapPackManifest;
  status: OfflineMapPackStatus;
  storage: OfflineMapStorageEstimate;
  download: OfflineMapDownloadState;
  providerCapability: OfflineMapProviderCapability;
};

export function isValidOfflineMapBounds(bounds: OfflineMapBounds | null | undefined) {
  return Boolean(bounds) &&
    Number.isFinite(bounds.south) &&
    Number.isFinite(bounds.west) &&
    Number.isFinite(bounds.north) &&
    Number.isFinite(bounds.east) &&
    bounds.south >= -90 &&
    bounds.north <= 90 &&
    bounds.west >= -180 &&
    bounds.east <= 180 &&
    bounds.south <= bounds.north &&
    bounds.west <= bounds.east;
}

export function normalizeOfflineMapBounds(bounds: OfflineMapBounds | null | undefined): OfflineMapBounds | null {
  if (!isValidOfflineMapBounds(bounds)) return null;
  return {
    south: bounds.south,
    west: bounds.west,
    north: bounds.north,
    east: bounds.east
  };
}

export function deriveOfflineMapBounds(points: Array<{ latitude: number; longitude: number }>, paddingRatio = 0.15): OfflineMapBounds | null {
  const validPoints = points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && point.latitude >= -90 && point.latitude <= 90 && point.longitude >= -180 && point.longitude <= 180);
  if (validPoints.length === 0) return null;

  const latitudes = validPoints.map((point) => point.latitude);
  const longitudes = validPoints.map((point) => point.longitude);
  const latitudeSpan = Math.max(...latitudes) - Math.min(...latitudes);
  const longitudeSpan = Math.max(...longitudes) - Math.min(...longitudes);
  const latitudePadding = Math.max(0.02, latitudeSpan * paddingRatio);
  const longitudePadding = Math.max(0.02, longitudeSpan * paddingRatio);

  return normalizeOfflineMapBounds({
    south: clampLatitude(Math.min(...latitudes) - latitudePadding),
    west: clampLongitude(Math.min(...longitudes) - longitudePadding),
    north: clampLatitude(Math.max(...latitudes) + latitudePadding),
    east: clampLongitude(Math.max(...longitudes) + longitudePadding)
  });
}

export function buildOfflineMapRegion(input: {
  id: string;
  label: string;
  scope: OfflineMapRegionScope;
  bounds: OfflineMapBounds;
  destinationCount?: number;
  city?: string | null;
  country?: string | null;
}): OfflineMapRegion | null {
  const bounds = normalizeOfflineMapBounds(input.bounds);
  if (!bounds) return null;

  return {
    id: normalizeLabel(input.id),
    label: normalizeLabel(input.label),
    scope: input.scope,
    bounds,
    destinationCount: Math.max(0, Math.trunc(input.destinationCount || 0)),
    city: normalizeOptionalLabel(input.city),
    country: normalizeOptionalLabel(input.country)
  };
}

export function deriveTripOfflineMapRegion(input: {
  tripId: string;
  tripName: string;
  destinations: Array<{ latitude: number; longitude: number }>;
  city?: string | null;
  country?: string | null;
}) {
  const bounds = deriveOfflineMapBounds(input.destinations);
  if (!bounds) return null;

  return buildOfflineMapRegion({
    id: normalizeLabel(input.tripId),
    label: normalizeLabel(input.tripName),
    scope: "trip",
    bounds,
    destinationCount: input.destinations.length,
    city: input.city || null,
    country: input.country || null
  });
}

export function buildOfflineMapPackManifest(input: {
  id: string;
  provider: string;
  region: OfflineMapRegion;
  contentVersion: string;
  createdAt: string;
  updatedAt: string;
  attribution?: string[];
  routeOverlaySupported?: boolean;
  offlineRoutingSupported?: boolean;
  integrity?: OfflineMapPackIntegrity;
}): OfflineMapPackManifest {
  return {
    id: normalizeLabel(input.id),
    provider: normalizeLabel(input.provider),
    region: {
      ...input.region,
      bounds: { ...input.region.bounds }
    },
    contentVersion: normalizeLabel(input.contentVersion),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    attribution: [...(input.attribution || [])],
    routeOverlaySupported: input.routeOverlaySupported !== false,
    offlineRoutingSupported: Boolean(input.offlineRoutingSupported),
    integrity: input.integrity || "unknown"
  };
}

export function buildOfflineMapStorageEstimate(input: {
  requiredBytes: number | null;
  availableBytes: number | null;
  warningThresholdBytes?: number | null;
  confidence?: OfflineMapStorageEstimate["confidence"];
}): OfflineMapStorageEstimate {
  const estimate = {
    requiredBytes: normalizeOptionalNumber(input.requiredBytes),
    availableBytes: normalizeOptionalNumber(input.availableBytes),
    warningThresholdBytes: normalizeOptionalNumber(input.warningThresholdBytes ?? null),
    confidence: input.confidence || "unknown"
  };

  return {
    ...estimate,
    pressure: classifyOfflineMapStoragePressure(estimate)
  };
}

export function classifyOfflineMapStoragePressure(input: {
  requiredBytes: number | null;
  availableBytes: number | null;
  warningThresholdBytes: number | null;
}): OfflineMapStorageEstimate["pressure"] {
  if (!Number.isFinite(input.requiredBytes ?? NaN) || !Number.isFinite(input.availableBytes ?? NaN)) return "unknown";
  if ((input.availableBytes || 0) < (input.requiredBytes || 0)) return "full";
  if (Number.isFinite(input.warningThresholdBytes ?? NaN) && (input.availableBytes || 0) <= (input.warningThresholdBytes || 0)) return "warning";
  return "available";
}

export function buildOfflineMapDownloadState(input: {
  status: OfflineMapPackStatus;
  downloadedBytes?: number;
  totalBytes?: number | null;
  startedAt?: string | null;
  updatedAt?: string | null;
  error?: string | null;
}): OfflineMapDownloadState {
  return {
    status: input.status,
    downloadedBytes: Math.max(0, Math.trunc(input.downloadedBytes || 0)),
    totalBytes: normalizeOptionalNumber(input.totalBytes ?? null),
    startedAt: input.startedAt || null,
    updatedAt: input.updatedAt || null,
    error: normalizeOptionalLabel(input.error)
  };
}

export function buildOfflineMapProviderCapability(input: Partial<OfflineMapProviderCapability>): OfflineMapProviderCapability {
  return {
    web: Boolean(input.web),
    native: Boolean(input.native),
    regionDownloads: Boolean(input.regionDownloads),
    estimateBeforeDownload: Boolean(input.estimateBeforeDownload),
    updateChecks: Boolean(input.updateChecks),
    delete: Boolean(input.delete),
    vectorTiles: Boolean(input.vectorTiles),
    rasterTiles: Boolean(input.rasterTiles),
    routeOverlays: Boolean(input.routeOverlays),
    offlineRouting: Boolean(input.offlineRouting),
    turnByTurn: Boolean(input.turnByTurn)
  };
}

export function buildOfflineMapPack(input: {
  manifest: OfflineMapPackManifest;
  status?: OfflineMapPackStatus;
  storage: OfflineMapStorageEstimate;
  download: OfflineMapDownloadState;
  providerCapability: OfflineMapProviderCapability;
}): OfflineMapPack {
  return {
    manifest: {
      ...input.manifest,
      region: {
        ...input.manifest.region,
        bounds: { ...input.manifest.region.bounds }
      },
      attribution: [...input.manifest.attribution]
    },
    status: input.status || input.download.status,
    storage: { ...input.storage },
    download: { ...input.download },
    providerCapability: { ...input.providerCapability }
  };
}

export function offlineMapPackCanDownload(pack: OfflineMapPack) {
  return ["not_downloaded", "estimating", "ready_to_download", "paused", "failed", "update_available"].includes(pack.status);
}

export function offlineMapPackIsDownloaded(pack: OfflineMapPack) {
  return pack.status === "downloaded" && pack.manifest.integrity === "complete";
}

export function offlineMapPackIsUsable(pack: OfflineMapPack) {
  return offlineMapPackIsDownloaded(pack) && !pack.download.error;
}

export function offlineMapPackIsUpdateAvailable(pack: OfflineMapPack) {
  return pack.status === "update_available";
}

export function summarizeOfflineMapPack(pack: OfflineMapPack) {
  return {
    id: pack.manifest.id,
    regionLabel: pack.manifest.region.label,
    scope: pack.manifest.region.scope,
    status: pack.status,
    downloadStatus: pack.download.status,
    estimatedBytes: pack.storage.requiredBytes,
    pressure: pack.storage.pressure,
    provider: pack.manifest.provider,
    updateAvailable: offlineMapPackIsUpdateAvailable(pack),
    usable: offlineMapPackIsUsable(pack)
  };
}

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeOptionalLabel(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || null;
}

function normalizeOptionalNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function clampLatitude(value: number) {
  return Math.min(90, Math.max(-90, value));
}

function clampLongitude(value: number) {
  return Math.min(180, Math.max(-180, value));
}
