import type { ConnectivityStatus } from "./connectivity";
import { deriveDestinationHubView, resolveDestinationId } from "./destinationHub";
import type { DestinationIntelligence, DestinationReferenceInput } from "./destinationIntelligenceTypes";
import type { TravelHomeViewModel } from "./travelHome";
import { normalizeDestinationKey } from "./destinationIntelligence";
import { savedWorldCup2026Matches, savedWorldCup2026Stadiums } from "../data/worldCup2026Schedule";

export type TravelDiscoveryCategory =
  | "places"
  | "food"
  | "stays"
  | "transport"
  | "events"
  | "world_cup"
  | "travel_tools";

export type TravelDiscoveryAvailability = "available" | "limited" | "online_required" | "unsupported" | "unknown";
export type TravelDiscoveryDataQuality = "curated" | "static" | "current" | "live" | "affiliate" | "demo" | "unknown";

export type TravelDiscoveryAction = {
  kind: "exploreCategory" | "tab";
  category?: "Attractions" | "Restaurants" | "Stays" | "Events" | "Cafés" | "Parks" | "Museums" | "Family";
  tab?: "explore" | "transport" | "matches" | "traveltools" | "guides";
};

export type TravelDiscoveryDestination = {
  destinationId: string | null;
  destinationLabel: string | null;
  cityLabel: string | null;
  countryLabel: string | null;
  source: "trip" | "destination_reference" | "travel_location" | "unknown";
  quality: "verified" | "partial" | "unknown";
};

export type TravelDiscoverySection = {
  id: TravelDiscoveryCategory;
  labelKey: string;
  availability: TravelDiscoveryAvailability;
  quality: TravelDiscoveryDataQuality;
  sourceKey: "destination_intelligence" | "world_cup_dataset" | "fanatlas_curated" | "affiliate" | "future_current_information" | "static_local";
  action: TravelDiscoveryAction;
  visible: boolean;
};

export type TravelDiscoveryWorldCupContext = {
  eligible: boolean;
  destinationMatched: boolean;
  dateMatched: boolean;
  matchCount: number;
  stadiumCount: number;
  favoriteTeam: string | null;
};

export type TravelDiscoveryContext = {
  destination: TravelDiscoveryDestination | null;
  hasResolvedDestination: boolean;
  sections: TravelDiscoverySection[];
  worldCup: TravelDiscoveryWorldCupContext;
  connectivity: ConnectivityStatus;
};

type TravelDiscoveryInput = {
  home?: Pick<TravelHomeViewModel, "tripSummary"> | null;
  destinationId?: string | null;
  destinationReference?: DestinationReferenceInput | null;
  travelLocation?: {
    destinationCountry: string;
    destinationCity: string;
    locationSource?: "manual" | "geolocation" | "fallback";
  } | null;
  intelligence: DestinationIntelligence;
  currentDate?: Date;
  connectivity?: ConnectivityStatus;
  favoriteTeam?: string | null;
};

const WORLD_CUP_WINDOW_DAYS = 30;

export function deriveTravelDiscovery(input: TravelDiscoveryInput): TravelDiscoveryContext {
  const currentDate = normalizeCurrentDate(input.currentDate || new Date());
  const connectivity = input.connectivity || "unknown";
  const destinationId = resolveDiscoveryDestinationId(input);
  const destination = destinationId ? resolveDestinationContext(destinationId, input.intelligence, input.home?.tripSummary ? "trip" : input.destinationReference ? "destination_reference" : "travel_location") : null;
  const worldCup = deriveWorldCupContext(destination, currentDate, input.favoriteTeam || null);
  const sections = deriveSections(destination, worldCup, connectivity);

  return {
    destination,
    hasResolvedDestination: Boolean(destination?.destinationId),
    sections,
    worldCup,
    connectivity
  };
}

function resolveDiscoveryDestinationId(input: TravelDiscoveryInput) {
  const tripDestinationId = input.home?.tripSummary?.destinationId || null;
  if (tripDestinationId) return tripDestinationId;

  const explicitDestinationId = input.destinationId || null;
  if (explicitDestinationId) return explicitDestinationId;

  const referenceId = input.destinationReference ? resolveDestinationId(input.destinationReference) : null;
  if (referenceId) return referenceId;

  if (input.travelLocation?.destinationCity && input.travelLocation.destinationCountry) {
    if (input.travelLocation.locationSource === "fallback") return null;
    return resolveDestinationId({
      city: input.travelLocation.destinationCity,
      country: input.travelLocation.destinationCountry
    });
  }

  return null;
}

function resolveDestinationContext(destinationId: string, intelligence: DestinationIntelligence, source: TravelDiscoveryDestination["source"]): TravelDiscoveryDestination {
  const hub = deriveDestinationHubView({ destinationId, intelligence });
  return {
    destinationId,
    destinationLabel: hub.title || hub.subtitle || null,
    cityLabel: hub.city?.identity.cityName || null,
    countryLabel: hub.country?.identity.countryName || hub.countryCode || null,
    source,
    quality: hub.qualityStatus
  };
}

function deriveSections(
  destination: TravelDiscoveryDestination | null,
  worldCup: TravelDiscoveryWorldCupContext,
  connectivity: ConnectivityStatus
): TravelDiscoverySection[] {
  const hasDestination = Boolean(destination?.destinationId || destination?.destinationLabel);
  const resolvedQuality: TravelDiscoveryDataQuality = destination?.quality === "verified"
    ? "curated"
    : destination?.quality === "partial"
      ? "static"
      : hasDestination
        ? "static"
        : "unknown";

  const sections: TravelDiscoverySection[] = [
    {
      id: "places",
      labelKey: "attractions",
      availability: hasDestination ? "available" : "limited",
      quality: resolvedQuality,
      sourceKey: "destination_intelligence",
      action: { kind: "exploreCategory", category: "Attractions" },
      visible: true
    },
    {
      id: "food",
      labelKey: "restaurants",
      availability: hasDestination ? "available" : "limited",
      quality: resolvedQuality,
      sourceKey: "fanatlas_curated",
      action: { kind: "exploreCategory", category: "Restaurants" },
      visible: true
    },
    {
      id: "stays",
      labelKey: "stays",
      availability: hasDestination ? "available" : "limited",
      quality: "affiliate",
      sourceKey: "affiliate",
      action: { kind: "exploreCategory", category: "Stays" },
      visible: true
    },
    {
      id: "transport",
      labelKey: "transportation",
      availability: hasDestination ? "available" : "limited",
      quality: resolvedQuality,
      sourceKey: "destination_intelligence",
      action: { kind: "tab", tab: "transport" },
      visible: true
    },
    {
      id: "events",
      labelKey: "events",
      availability: "online_required",
      quality: "current",
      sourceKey: "future_current_information",
      action: { kind: "tab", tab: "matches" },
      visible: true
    },
    {
      id: "travel_tools",
      labelKey: "travelTools",
      availability: "available",
      quality: "static",
      sourceKey: "static_local",
      action: { kind: "tab", tab: "traveltools" },
      visible: true
    }
  ];

  if (worldCup.eligible) {
    sections.push({
      id: "world_cup",
      labelKey: "worldCup2026Mode",
      availability: "available",
      quality: "demo",
      sourceKey: "world_cup_dataset",
      action: { kind: "tab", tab: "matches" },
      visible: true
    });
  }

  return sections;
}

function deriveWorldCupContext(
  destination: TravelDiscoveryDestination | null,
  currentDate: string,
  favoriteTeam: string | null
): TravelDiscoveryWorldCupContext {
  const destinationMatched = matchesWorldCupDestination(destination);
  const dateMatched = destinationMatched ? matchesWorldCupWindow(currentDate) : false;
  const eligible = destinationMatched && dateMatched;

  return {
    eligible,
    destinationMatched,
    dateMatched,
    matchCount: eligible ? savedWorldCup2026Matches.length : 0,
    stadiumCount: eligible ? savedWorldCup2026Stadiums.length : 0,
    favoriteTeam
  };
}

function matchesWorldCupDestination(destination: TravelDiscoveryDestination | null) {
  if (!destination) return false;
  const city = normalizeDestinationKey(destination.cityLabel || destination.destinationLabel || parseDestinationIdPart(destination.destinationId, "city") || "");
  const country = normalizeDestinationKey(destination.countryLabel || parseDestinationIdPart(destination.destinationId, "country") || "");
  return savedWorldCup2026Matches.some((match) => {
    const matchCity = normalizeDestinationKey(match.city);
    const matchCountry = normalizeDestinationKey(match.country);
    const stadium = savedWorldCup2026Stadiums.find((item) => normalizeDestinationKey(item.city) === matchCity || normalizeDestinationKey(item.name) === normalizeDestinationKey(match.stadium));
    const stadiumCity = stadium ? normalizeDestinationKey(stadium.city) : "";
    const cityMatches =
      city !== "" &&
      (matchCity === city ||
        matchCity.includes(city) ||
        city.includes(matchCity) ||
        (stadiumCity !== "" && (stadiumCity.includes(city) || city.includes(stadiumCity))));
    const countryMatches = country !== "" && matchCountry.includes(country);
    return cityMatches || countryMatches;
  });
}

function parseDestinationIdPart(destinationId: string | null, part: "city" | "country") {
  if (!destinationId) return null;
  const segments = destinationId.split(":").filter(Boolean);
  if (segments.length < 2) return null;
  if (part === "country" && segments[0] === "country") return segments[1] || null;
  if (part === "city" && segments[0] === "city") return segments[2] || null;
  return null;
}

function matchesWorldCupWindow(currentDate: string) {
  const parsed = Date.parse(`${currentDate}T00:00:00.000Z`);
  if (!Number.isFinite(parsed)) return false;
  const dates = savedWorldCup2026Matches
    .map((match) => Date.parse(match.date))
    .filter((value) => Number.isFinite(value));
  if (dates.length === 0) return false;

  const minDate = Math.min(...dates) - WORLD_CUP_WINDOW_DAYS * 86_400_000;
  const maxDate = Math.max(...dates) + WORLD_CUP_WINDOW_DAYS * 86_400_000;
  return parsed >= minDate && parsed <= maxDate;
}

function normalizeCurrentDate(date: Date) {
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}
