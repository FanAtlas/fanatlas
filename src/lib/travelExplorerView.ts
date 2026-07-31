import { compareIsoDates, getTripDurationDays } from "./tripDrafts";
import type {
  ExplorerCoordinate,
  ExplorerTravelStatus,
  TravelExplorer,
  TravelExplorerCity,
  TravelExplorerCountry,
  TravelExplorerRoute,
  TravelExplorerTrip
} from "./travelExplorerTypes";

export type ExplorerStatusFilter = "all" | ExplorerTravelStatus;
export type ExplorerBrowserTab = "countries" | "cities" | "trips";
export type ExplorerMapMode = "status" | "frequency" | "travelDays" | "routes";
export type ExplorerCountrySort = "mostVisited" | "mostRecent" | "alphabetical" | "mostMemories";
export type ExplorerCitySort = "mostVisited" | "mostRecent" | "alphabetical";
export type ExplorerTripSort = "newest" | "oldest" | "longest" | "shortest";

export type ExplorerSelection =
  | { type: "country"; id: string }
  | { type: "city"; id: string }
  | { type: "trip"; id: string }
  | { type: "route"; id: string }
  | null;

export type TravelExplorerViewFilters = {
  search: string;
  status: ExplorerStatusFilter;
  year: number | null;
};

export type TravelExplorerFilteredView = {
  countries: TravelExplorerCountry[];
  cities: TravelExplorerCity[];
  trips: TravelExplorerTrip[];
  routes: TravelExplorerRoute[];
};

export type TravelExplorerReplayStep = {
  id: string;
  order: number;
  tripId: string;
  routeId: string | null;
  countryIds: string[];
  cityIds: string[];
  label: string;
  date: string | null;
};

export type ExplorerProjectedPoint = {
  x: number;
  y: number;
};

export function filterTravelExplorer(explorer: TravelExplorer, filters: TravelExplorerViewFilters): TravelExplorerFilteredView {
  const query = normalizeSearch(filters.search);
  const tripIdsForYear = filters.year ? tripIdsForExplorerYear(explorer, filters.year) : null;
  const trips = explorer.trips.filter((trip) => {
    if (tripIdsForYear && !tripIdsForYear.has(trip.id)) return false;
    if (filters.status !== "all" && !tripMatchesStatus(trip, filters.status)) return false;
    if (!query) return true;
    return tripMatchesQuery(explorer, trip, query);
  });
  const visibleTripIds = new Set(trips.map((trip) => trip.id));
  const countries = explorer.countries.filter((country) => {
    if (filters.status !== "all" && country.status !== filters.status) return false;
    if (tripIdsForYear && !country.tripIds.some((tripId) => tripIdsForYear.has(tripId))) return false;
    if (!query) return country.tripIds.some((tripId) => visibleTripIds.has(tripId)) || !tripIdsForYear;
    return countryMatchesQuery(explorer, country, query);
  });
  const countryIds = new Set(countries.map((country) => country.id));
  const cities = explorer.cities.filter((city) => {
    if (filters.status !== "all" && city.status !== filters.status) return false;
    if (tripIdsForYear && !city.tripIds.some((tripId) => tripIdsForYear.has(tripId))) return false;
    if (countryIds.size > 0 && city.countryId && !countryIds.has(city.countryId) && !query) return false;
    if (!query) return city.tripIds.some((tripId) => visibleTripIds.has(tripId)) || !tripIdsForYear;
    return cityMatchesQuery(explorer, city, query);
  });
  const routes = explorer.routes.filter((route) => visibleTripIds.has(route.tripId));
  return { countries, cities, trips, routes };
}

export function sortExplorerCountries(countries: readonly TravelExplorerCountry[], sort: ExplorerCountrySort): TravelExplorerCountry[] {
  return [...countries].sort((a, b) => {
    if (sort === "mostVisited") {
      return b.completedTripIds.length - a.completedTripIds.length
        || b.visitCount - a.visitCount
        || compareCountryNames(a, b);
    }
    if (sort === "mostRecent") {
      return compareDateDesc(a.latestVisitDate, b.latestVisitDate) || compareCountryNames(a, b);
    }
    if (sort === "mostMemories") {
      return memoryCount(b) - memoryCount(a) || compareCountryNames(a, b);
    }
    return compareCountryNames(a, b);
  });
}

export function sortExplorerCities(cities: readonly TravelExplorerCity[], sort: ExplorerCitySort): TravelExplorerCity[] {
  return [...cities].sort((a, b) => {
    if (sort === "mostVisited") {
      return b.completedTripIds.length - a.completedTripIds.length
        || b.placeIds.length - a.placeIds.length
        || compareCityNames(a, b);
    }
    if (sort === "mostRecent") {
      return compareDateDesc(a.latestVisitDate, b.latestVisitDate) || compareCityNames(a, b);
    }
    return compareCityNames(a, b);
  });
}

export function sortExplorerTrips(trips: readonly TravelExplorerTrip[], sort: ExplorerTripSort): TravelExplorerTrip[] {
  return [...trips].sort((a, b) => {
    if (sort === "oldest") return compareDateAsc(a.startDate, b.startDate) || compareTripNames(a, b);
    if (sort === "longest") return tripDuration(b) - tripDuration(a) || compareDateDesc(a.startDate, b.startDate) || compareTripNames(a, b);
    if (sort === "shortest") return compareShortestTrip(a, b) || compareDateDesc(a.startDate, b.startDate) || compareTripNames(a, b);
    return compareDateDesc(a.startDate, b.startDate) || compareTripNames(a, b);
  });
}

export function buildTravelReplaySteps(explorer: TravelExplorer, year: number | null): TravelExplorerReplayStep[] {
  return sortExplorerTrips(
    explorer.trips.filter((trip) => !year || trip.year === year),
    "oldest"
  ).map((trip, index) => {
    const route = explorer.routes.find((candidate) => candidate.tripId === trip.id) || null;
    return {
      id: `replay:${trip.id}`,
      order: index,
      tripId: trip.id,
      routeId: route?.id || null,
      countryIds: [...trip.countryIds],
      cityIds: [...trip.cityIds],
      label: trip.title,
      date: trip.startDate,
    };
  });
}

export function getTripTravelDays(trip: TravelExplorerTrip): number {
  if (!trip.startDate || !trip.endDate) return 0;
  return Math.max(0, getTripDurationDays(trip.startDate, trip.endDate) || 0);
}

export function getCountryTravelDays(country: TravelExplorerCountry, trips: readonly TravelExplorerTrip[]): number {
  return trips
    .filter((trip) => trip.status === "completed" && country.completedTripIds.includes(trip.id))
    .reduce((total, trip) => total + getTripTravelDays(trip), 0);
}

export function getCityTravelDays(city: TravelExplorerCity, trips: readonly TravelExplorerTrip[]): number {
  return trips
    .filter((trip) => trip.status === "completed" && city.completedTripIds.includes(trip.id))
    .reduce((total, trip) => total + getTripTravelDays(trip), 0);
}

export function getTravelYearsForTripIds(tripIds: readonly string[], trips: readonly TravelExplorerTrip[]): number[] {
  const ids = new Set(tripIds);
  return [...new Set(trips.filter((trip) => ids.has(trip.id) && trip.year).map((trip) => trip.year as number))].sort((a, b) => a - b);
}

export function getFrequencyLevel(value: number): "none" | "one" | "some" | "many" | "frequent" {
  if (value <= 0) return "none";
  if (value === 1) return "one";
  if (value <= 3) return "some";
  if (value <= 6) return "many";
  return "frequent";
}

export function projectExplorerCoordinate(coordinate: ExplorerCoordinate): ExplorerProjectedPoint {
  return {
    x: ((coordinate.longitude + 180) / 360) * 720,
    y: ((90 - coordinate.latitude) / 180) * 360
  };
}

function tripIdsForExplorerYear(explorer: TravelExplorer, year: number) {
  const match = explorer.years.find((entry) => entry.year === year);
  return new Set(match ? [...match.completedTripIds, ...match.plannedTripIds] : []);
}

function tripMatchesStatus(trip: TravelExplorerTrip, status: ExplorerTravelStatus) {
  if (status === "visited") return trip.status === "completed";
  if (status === "planned") return trip.status === "planned";
  return false;
}

function countryMatchesQuery(explorer: TravelExplorer, country: TravelExplorerCountry, query: string) {
  return normalizeSearch(country.countryName).includes(query)
    || country.normalizedCountryKey.includes(query)
    || explorer.cities.some((city) => country.cityIds.includes(city.id) && normalizeSearch(city.cityName).includes(query))
    || explorer.trips.some((trip) => country.tripIds.includes(trip.id) && normalizeSearch(trip.title).includes(query))
    || explorer.places.some((place) => place.countryId === country.id && normalizeSearch(place.name).includes(query));
}

function cityMatchesQuery(explorer: TravelExplorer, city: TravelExplorerCity, query: string) {
  return normalizeSearch(city.cityName).includes(query)
    || normalizeSearch(city.countryName || "").includes(query)
    || explorer.trips.some((trip) => city.tripIds.includes(trip.id) && normalizeSearch(trip.title).includes(query))
    || explorer.places.some((place) => place.cityId === city.id && normalizeSearch(place.name).includes(query));
}

function tripMatchesQuery(explorer: TravelExplorer, trip: TravelExplorerTrip, query: string) {
  return normalizeSearch(trip.title).includes(query)
    || explorer.countries.some((country) => trip.countryIds.includes(country.id) && normalizeSearch(country.countryName).includes(query))
    || explorer.cities.some((city) => trip.cityIds.includes(city.id) && normalizeSearch(city.cityName).includes(query))
    || explorer.places.some((place) => trip.placeIds.includes(place.id) && normalizeSearch(place.name).includes(query));
}

function normalizeSearch(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    : "";
}

function memoryCount(entry: Pick<TravelExplorerCountry | TravelExplorerCity, "photoCount" | "journalEntryCount" | "favoriteMemoryCount">) {
  return entry.photoCount + entry.journalEntryCount + entry.favoriteMemoryCount;
}

function compareCountryNames(a: TravelExplorerCountry, b: TravelExplorerCountry) {
  return a.countryName.localeCompare(b.countryName) || a.id.localeCompare(b.id);
}

function compareCityNames(a: TravelExplorerCity, b: TravelExplorerCity) {
  return (a.countryName || "").localeCompare(b.countryName || "")
    || a.cityName.localeCompare(b.cityName)
    || a.id.localeCompare(b.id);
}

function compareTripNames(a: TravelExplorerTrip, b: TravelExplorerTrip) {
  return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
}

function compareDateDesc(a: string | null, b: string | null) {
  if (a && b) return compareIsoDates(b, a);
  if (a) return -1;
  if (b) return 1;
  return 0;
}

function compareDateAsc(a: string | null, b: string | null) {
  if (a && b) return compareIsoDates(a, b);
  if (a) return -1;
  if (b) return 1;
  return 0;
}

function tripDuration(trip: TravelExplorerTrip) {
  return getTripTravelDays(trip);
}

function compareShortestTrip(a: TravelExplorerTrip, b: TravelExplorerTrip) {
  const aDuration = tripDuration(a);
  const bDuration = tripDuration(b);
  if (aDuration > 0 && bDuration > 0) return aDuration - bDuration;
  if (aDuration > 0) return -1;
  if (bDuration > 0) return 1;
  return 0;
}
