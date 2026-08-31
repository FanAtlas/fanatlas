import type {
  CityIntelligence,
  CountryIntelligence,
  DestinationField,
  DestinationIdentity,
  DestinationIntelligence,
  DestinationReferenceInput
} from "./destinationIntelligenceTypes";
import { normalizeDestinationKey, resolveCityIdentity, resolveCountryIdentity } from "./destinationIntelligence";
import type { TravelExplorer } from "./travelExplorerTypes";
import type { TravelPassport } from "./travelPassportTypes";
import type { TripDraft } from "./tripDrafts";

export type DestinationHubPersonalContext = {
  status: "visited" | "planned" | "not_visited";
  tripCount: number;
  completedTripCount: number;
  plannedTripCount: number;
  citiesVisited: number;
  visitedPlaces: number;
  memoryCount: number;
  journalEntryCount: number;
};

export type DestinationHubSearchResult = {
  id: string;
  type: "country" | "city";
  label: string;
  description: string;
};

export type DestinationHubView = {
  identity: DestinationIdentity | null;
  type: "country" | "city" | "unknown";
  country: CountryIntelligence | null;
  city: CityIntelligence | null;
  title: string;
  subtitle: string;
  countryCode: string | null;
  qualityStatus: "verified" | "partial" | "unknown";
  personal: DestinationHubPersonalContext;
  searchResults: DestinationHubSearchResult[];
};

export function destinationPath(destinationId: string) {
  return `/destination/${encodeURIComponent(destinationId)}`;
}

export function parseDestinationIdFromPath(pathname: string) {
  if (!pathname.startsWith("/destination/")) return null;
  const raw = pathname.slice("/destination/".length);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

export function resolveDestinationId(reference: DestinationReferenceInput) {
  const city = resolveCityIdentity(reference);
  if (city?.type === "city") return city.id;
  const country = resolveCountryIdentity(reference);
  return country?.type === "country" ? country.id : null;
}

export function deriveDestinationHubView(input: {
  destinationId: string | null;
  intelligence: DestinationIntelligence;
  passport?: TravelPassport;
  explorer?: TravelExplorer;
  drafts?: readonly TripDraft[];
  searchQuery?: string;
}): DestinationHubView {
  const countryByCode = new Map(input.intelligence.countries.map((country) => [country.identity.countryCode, country]));
  const cityById = new Map(input.intelligence.cities.map((city) => [city.identity.id, city]));
  const countryById = new Map(input.intelligence.countries.map((country) => [country.identity.id, country]));
  const city = input.destinationId ? cityById.get(input.destinationId) || null : null;
  const country = city?.country.countryCode
    ? countryByCode.get(city.country.countryCode) || null
    : input.destinationId
      ? countryById.get(input.destinationId) || null
      : null;
  const identity = city?.identity || country?.identity || null;
  const personal = derivePersonalContext(identity, input.passport, input.explorer, input.drafts);

  return {
    identity,
    type: city ? "city" : country ? "country" : "unknown",
    country,
    city,
    title: city?.identity.cityName || country?.identity.countryName || "",
    subtitle: city?.country.countryName || (country ? country.identity.countryCode || "" : ""),
    countryCode: city?.country.countryCode || country?.identity.countryCode || null,
    qualityStatus: qualityStatus(country, city),
    personal,
    searchResults: searchDestinations(input.intelligence, input.searchQuery || "")
  };
}

export function searchDestinations(intelligence: DestinationIntelligence, query: string): DestinationHubSearchResult[] {
  const normalized = normalizeDestinationKey(query);
  if (!normalized) return [];
  const results: DestinationHubSearchResult[] = [];
  for (const country of intelligence.countries) {
    const code = country.identity.countryCode || "";
    const name = country.identity.countryName || "";
    if (matches(normalized, [code, name])) {
      results.push({
        id: country.identity.id,
        type: "country",
        label: name || code,
        description: code
      });
    }
  }
  for (const city of intelligence.cities) {
    const name = city.identity.cityName || "";
    const countryName = city.country.countryName || "";
    const countryCode = city.country.countryCode || "";
    if (matches(normalized, [name, countryName, countryCode, `${name} ${countryName}`])) {
      results.push({
        id: city.identity.id,
        type: "city",
        label: name,
        description: [countryName, countryCode].filter(Boolean).join(" · ")
      });
    }
  }
  return results.slice(0, 12);
}

export function fieldDisplayState<T>(field: DestinationField<T>) {
  if (field.status !== "available") {
    if (field.informationClass === "CURRENT_INFORMATION" || field.informationClass === "HIGH_STAKES_CURRENT_INFORMATION") return "current_required";
    return "not_available";
  }
  if (
    (field.informationClass === "CURRENT_INFORMATION" || field.informationClass === "HIGH_STAKES_CURRENT_INFORMATION") &&
    field.sources.some((source) => source.type === "future_current_information")
  ) {
    return "current_required";
  }
  if (field.quality === "unknown" || field.quality === "stale" || field.quality === "conflicting") return "not_verified";
  return "available";
}

function matches(normalizedQuery: string, values: string[]) {
  return values.some((value) => normalizeDestinationKey(value).includes(normalizedQuery));
}

function qualityStatus(country: CountryIntelligence | null, city: CityIntelligence | null): DestinationHubView["qualityStatus"] {
  const fields = [
    country?.currencies,
    country?.languages,
    country?.emergency,
    city?.coordinates,
    city?.time
  ].filter(Boolean) as DestinationField<unknown>[];
  if (fields.length === 0) return "unknown";
  if (fields.some((field) => field.status !== "available" || field.quality === "unknown" || field.quality === "stale")) return "partial";
  return "verified";
}

function derivePersonalContext(
  identity: DestinationIdentity | null,
  passport?: TravelPassport,
  explorer?: TravelExplorer,
  drafts?: readonly TripDraft[]
): DestinationHubPersonalContext {
  const empty: DestinationHubPersonalContext = {
    status: "not_visited",
    tripCount: 0,
    completedTripCount: 0,
    plannedTripCount: 0,
    citiesVisited: 0,
    visitedPlaces: 0,
    memoryCount: 0,
    journalEntryCount: 0
  };
  if (!identity) return empty;

  if (identity.type === "country" && identity.countryCode) {
    const explorerCountry = explorer?.countries.find((country) => country.countryCode === identity.countryCode);
    const passportCountry = passport?.countries.find((country) => country.countryCode === identity.countryCode);
    const plannedTripIds = new Set(explorerCountry?.plannedTripIds || []);
    return {
      status: explorerCountry?.hasCompletedTrips || passportCountry ? "visited" : plannedTripIds.size > 0 ? "planned" : "not_visited",
      tripCount: explorerCountry?.tripIds.length || passportCountry?.tripCount || 0,
      completedTripCount: explorerCountry?.completedTripIds.length || passportCountry?.tripCount || 0,
      plannedTripCount: plannedTripIds.size || countDraftsForCountry(drafts, identity.countryCode),
      citiesVisited: passportCountry?.cityCount || explorerCountry?.cityIds.length || 0,
      visitedPlaces: passportCountry?.visitedPlaceCount || explorerCountry?.placeIds.length || 0,
      memoryCount: passportCountry?.memoryCount || explorerCountry?.photoCount || 0,
      journalEntryCount: explorerCountry?.journalEntryCount || 0
    };
  }

  if (identity.type === "city" && identity.cityKey) {
    const explorerCity = explorer?.cities.find((city) => city.normalizedCityKey === identity.normalizedKey || city.id === identity.cityKey || city.cityName === identity.cityName);
    const passportCity = passport?.cities.find((city) => city.id === identity.cityKey || (city.cityName === identity.cityName && city.countryCode === identity.countryCode));
    const plannedTripIds = new Set(explorerCity?.plannedTripIds || []);
    return {
      status: explorerCity?.hasCompletedTrips || passportCity ? "visited" : plannedTripIds.size > 0 ? "planned" : "not_visited",
      tripCount: explorerCity?.tripIds.length || passportCity?.tripCount || 0,
      completedTripCount: explorerCity?.completedTripIds.length || passportCity?.tripCount || 0,
      plannedTripCount: plannedTripIds.size || countDraftsForCity(drafts, identity),
      citiesVisited: passportCity ? 1 : 0,
      visitedPlaces: passportCity?.visitedPlaceCount || explorerCity?.placeIds.length || 0,
      memoryCount: passportCity?.memoryCount || explorerCity?.photoCount || 0,
      journalEntryCount: explorerCity?.journalEntryCount || 0
    };
  }

  return empty;
}

function countDraftsForCountry(drafts: readonly TripDraft[] | undefined, countryCode: string) {
  return (drafts || []).filter((draft) => resolveCountryIdentity(draft.destination || {})?.countryCode === countryCode && draft.completionStatus !== "completed").length;
}

function countDraftsForCity(drafts: readonly TripDraft[] | undefined, identity: DestinationIdentity) {
  return (drafts || []).filter((draft) => {
    const city = resolveCityIdentity(draft.destination || {});
    return city?.cityKey === identity.cityKey && draft.completionStatus !== "completed";
  }).length;
}
