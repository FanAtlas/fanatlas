export type OfflineCapabilityStatus = "available" | "partially_available" | "online_required" | "stale" | "unavailable";

export type OfflineFreshness = "current" | "local" | "cached" | "stale" | "unknown";

export type OfflineDataCategory =
  | "trip_essentials"
  | "destination_intelligence"
  | "verified_emergency_info"
  | "travel_preparation"
  | "passport"
  | "journal"
  | "explorer"
  | "weather"
  | "currency"
  | "official_updates"
  | "routing"
  | "map_tiles"
  | "translator"
  | "discoveries";

export type OfflineCapability = {
  category: OfflineDataCategory;
  status: OfflineCapabilityStatus;
  offlineSafe: boolean;
  source: "local" | "cached" | "online" | "unknown";
  freshness: OfflineFreshness;
  note: string;
};

export type OfflineTripSnapshot = {
  tripId: string | null;
  tripName: string | null;
  destinationLabel: string | null;
  startDate: string | null;
  endDate: string | null;
  selectedDayId: string | null;
  selectedDayLabel: string | null;
  nextPlaceLabel: string | null;
  progress: {
    total: number;
    visited: number;
    skipped: number;
    remaining: number;
    completionPercent: number;
  };
  preparation: {
    readiness: string;
    completionPercent: number;
  } | null;
  capabilities: OfflineCapability[];
};

const ONLINE_ONLY: ReadonlySet<OfflineDataCategory> = new Set([
  "weather",
  "currency",
  "official_updates",
  "routing",
  "map_tiles",
  "discoveries"
]);

const OFFLINE_SAFE: ReadonlySet<OfflineDataCategory> = new Set([
  "trip_essentials",
  "destination_intelligence",
  "verified_emergency_info",
  "travel_preparation",
  "passport",
  "journal",
  "explorer"
]);

export function classifyOfflineCapability(input: {
  category: OfflineDataCategory;
  hasLocalData?: boolean;
  hasCachedData?: boolean;
  hasCurrentData?: boolean;
}): OfflineCapability {
  if (input.hasCurrentData) {
    return {
      category: input.category,
      status: "available",
      offlineSafe: OFFLINE_SAFE.has(input.category),
      source: "online",
      freshness: "current",
      note: "Current data is available."
    };
  }

  if (input.hasCachedData) {
    return {
      category: input.category,
      status: "stale",
      offlineSafe: OFFLINE_SAFE.has(input.category),
      source: "cached",
      freshness: "cached",
      note: "Previously retrieved data is available, but it may be stale."
    };
  }

  if (OFFLINE_SAFE.has(input.category) && input.hasLocalData !== false) {
    return {
      category: input.category,
      status: "available",
      offlineSafe: true,
      source: "local",
      freshness: "local",
      note: "Local travel data is available offline."
    };
  }

  if (input.category === "translator") {
    return input.hasLocalData
      ? {
          category: input.category,
          status: "partially_available",
          offlineSafe: false,
          source: "local",
          freshness: "local",
          note: "Local phrasebook data is available, but full translation requires a connection."
        }
      : {
          category: input.category,
          status: "online_required",
          offlineSafe: false,
          source: "online",
          freshness: "unknown",
          note: "Translation requires a connection."
        };
  }

  if (ONLINE_ONLY.has(input.category)) {
    return {
      category: input.category,
      status: "online_required",
      offlineSafe: false,
      source: "online",
      freshness: "unknown",
      note: "This feature requires a connection."
    };
  }

  return {
    category: input.category,
    status: input.hasLocalData ? "partially_available" : "unavailable",
    offlineSafe: Boolean(input.hasLocalData),
    source: input.hasLocalData ? "local" : "unknown",
    freshness: input.hasLocalData ? "local" : "unknown",
    note: input.hasLocalData ? "Some offline data is available." : "Offline data is unavailable."
  };
}

export function offlineConnectivityMessage(status: "online" | "offline" | "unknown") {
  if (status === "offline") return "Offline — trip essentials are still available.";
  if (status === "unknown") return "Connectivity is unknown.";
  return "";
}

export function buildOfflineTripSnapshot(input: {
  tripId: string | null;
  tripName: string | null;
  destinationLabel: string | null;
  startDate: string | null;
  endDate: string | null;
  selectedDayId: string | null;
  selectedDayLabel: string | null;
  nextPlaceLabel: string | null;
  progress: OfflineTripSnapshot["progress"];
  preparation: OfflineTripSnapshot["preparation"];
  capabilities: OfflineCapability[];
}): OfflineTripSnapshot {
  return {
    tripId: input.tripId,
    tripName: input.tripName,
    destinationLabel: input.destinationLabel,
    startDate: input.startDate,
    endDate: input.endDate,
    selectedDayId: input.selectedDayId,
    selectedDayLabel: input.selectedDayLabel,
    nextPlaceLabel: input.nextPlaceLabel,
    progress: { ...input.progress },
    preparation: input.preparation ? { ...input.preparation } : null,
    capabilities: input.capabilities.map((capability) => ({ ...capability }))
  };
}
