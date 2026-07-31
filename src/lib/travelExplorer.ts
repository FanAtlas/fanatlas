import { countries as countryOptions } from "../data/countries";
import { destinations } from "../data/destinations";
import {
  collectTripDraftPhotoReferences,
  deriveTripStory
} from "./tripJournal";
import {
  compareIsoDates,
  getTripItineraryDayDate,
  isValidIsoDate,
  normalizeTripDraft,
  normalizeTripPlaceVisitStatus,
  type TripDraft,
  type TripDraftPlaceReference
} from "./tripDrafts";
import {
  createPassportCityKey,
  determinePassportTripCompletion,
  isPassportVisitedStatus,
  normalizePassportCountryCode,
  resolvePassportDestination
} from "./travelPassport";
import type {
  DeriveTravelExplorerInput,
  ExplorerCoordinate,
  ExplorerCoordinateSource,
  ExplorerTravelStatus,
  TravelExplorer,
  TravelExplorerBounds,
  TravelExplorerCity,
  TravelExplorerCountry,
  TravelExplorerDataQuality,
  TravelExplorerLayers,
  TravelExplorerPlace,
  TravelExplorerRoute,
  TravelExplorerRoutePoint,
  TravelExplorerTrip,
  TravelExplorerYear
} from "./travelExplorerTypes";

type CountryAccumulator = Omit<TravelExplorerCountry, "tripIds" | "completedTripIds" | "plannedTripIds" | "cityIds" | "placeIds"> & {
  tripIds: Set<string>;
  completedTripIds: Set<string>;
  plannedTripIds: Set<string>;
  cityIds: Set<string>;
  placeIds: Set<string>;
};

type CityAccumulator = Omit<TravelExplorerCity, "tripIds" | "completedTripIds" | "plannedTripIds" | "placeIds"> & {
  tripIds: Set<string>;
  completedTripIds: Set<string>;
  plannedTripIds: Set<string>;
  placeIds: Set<string>;
};

type YearAccumulator = {
  year: number;
  completedTripIds: Set<string>;
  plannedTripIds: Set<string>;
  countryIds: Set<string>;
  visitedCountryIds: Set<string>;
  plannedCountryIds: Set<string>;
  cityIds: Set<string>;
  routeIds: Set<string>;
};

type RouteCandidate = {
  id: string;
  label: string;
  countryId: string | null;
  cityId: string | null;
  placeId: string | null;
  date: string | null;
  order: number;
  coordinates: ExplorerCoordinate | null;
};

type DestinationResolution = {
  countryCode: string | null;
  countryName: string | null;
  countryId: string | null;
  cityName: string | null;
  cityId: string | null;
  coordinates: ExplorerCoordinate | null;
  coordinateSource: ExplorerCoordinateSource;
};

const COUNTRY_NAME_TO_CODE = new Map(countryOptions.map((country) => [normalizeExplorerKey(country.name), country.code]));
const COUNTRY_CODE_TO_NAME = new Map(countryOptions.map((country) => [country.code, country.name]));
const DESTINATION_COORDINATES = new Map(destinations.map((destination) => [
  `${normalizeExplorerKey(destination.country)}:${normalizeExplorerKey(destination.city)}`,
  validateExplorerCoordinate(destination.latitude, destination.longitude)
]));
const COUNTRY_ALIASES = new Map<string, string>([
  ["united states of america", "US"],
  ["usa", "US"],
  ["u s a", "US"],
  ["south korea", "KR"],
  ["republic of korea", "KR"],
  ["czech republic", "CZ"],
  ["czechia", "CZ"],
  ["uk", "GB"],
  ["united kingdom", "GB"],
  ["great britain", "GB"]
]);

export function deriveTravelExplorer(input: DeriveTravelExplorerInput): TravelExplorer {
  const normalizedTrips = input.trips.flatMap((trip) => {
    const normalized = normalizeTripDraft(trip);
    return normalized ? [normalized] : [];
  });
  const countries = new Map<string, CountryAccumulator>();
  const cities = new Map<string, CityAccumulator>();
  const places: TravelExplorerPlace[] = [];
  const explorerTrips: TravelExplorerTrip[] = [];
  const routes: TravelExplorerRoute[] = [];
  const years = new Map<number, YearAccumulator>();
  const quality: TravelExplorerDataQuality = {
    unresolvedCountries: input.passport.dataQuality.unresolvedCountryCount,
    unresolvedCities: input.passport.dataQuality.unresolvedCityCount,
    missingCoordinates: 0,
    invalidCoordinates: 0,
    tripsWithoutMapPoints: 0,
    partiallyMappedRoutes: 0,
    unmatchedCountryGeometry: 0,
    duplicateDestinationReferences: input.passport.dataQuality.duplicateReferenceCount,
    ambiguousCityReferences: 0
  };

  for (const trip of normalizedTrips) {
    const completion = determinePassportTripCompletion(trip, input.currentDate || todayForExplorer());
    const tripStatus = completion === "completed" || completion === "derived_completed" ? "completed" : "planned";
    const completed = tripStatus === "completed";
    const story = deriveTripStory({ tripDraft: trip });
    const journalCount = story.summary.totalEntries;
    const favoriteCount = story.summary.favoriteEntries;
    const photoRefs = collectTripDraftPhotoReferences(trip);
    const tripCountryIds = new Set<string>();
    const tripCityIds = new Set<string>();
    const tripPlaceIds = new Set<string>();
    const routeCandidates: RouteCandidate[] = [];

    const tripDestination = resolveTripDestination(trip);
    if (tripDestination.countryId) {
      const country = ensureCountry(countries, tripDestination);
      applyStatus(country, completed ? "visited" : "planned", trip.id);
      country.journalEntryCount += journalCount;
      country.photoCount += photoRefs.allPhotoIds.size;
      country.favoriteMemoryCount += favoriteCount;
      updateDates(country, completed ? trip.travelDates?.startDate : undefined, completed ? trip.travelDates?.endDate : undefined, completed ? undefined : trip.travelDates?.startDate);
      tripCountryIds.add(country.id);
    } else {
      quality.unresolvedCountries += 1;
    }
    if (tripDestination.cityId) {
      const city = ensureCity(cities, tripDestination);
      applyStatus(city, completed ? "visited" : "planned", trip.id);
      city.journalEntryCount += journalCount;
      city.photoCount += photoRefs.allPhotoIds.size;
      city.favoriteMemoryCount += favoriteCount;
      updateDates(city, completed ? trip.travelDates?.startDate : undefined, completed ? trip.travelDates?.endDate : undefined, completed ? undefined : trip.travelDates?.startDate);
      tripCityIds.add(city.id);
      if (tripDestination.countryId) countries.get(tripDestination.countryId)?.cityIds.add(city.id);
    } else if (trip.destination?.city) {
      quality.unresolvedCities += 1;
    }
    if (tripDestination.coordinates) {
      routeCandidates.push({
        id: `${trip.id}:destination`,
        label: trip.destination?.label || tripDestination.cityName || tripDestination.countryName || trip.name,
        countryId: tripDestination.countryId,
        cityId: tripDestination.cityId,
        placeId: null,
        date: trip.travelDates?.startDate || null,
        order: -1,
        coordinates: tripDestination.coordinates
      });
    }

    trip.placeReferences.forEach((reference, index) => {
      const placeStatus = normalizeTripPlaceVisitStatus(reference.visitStatus);
      if (placeStatus !== "visited" && placeStatus !== "planned") return;
      const resolution = resolveReferenceDestination(trip, reference);
      const status: ExplorerTravelStatus = completed && isPassportVisitedStatus(reference.visitStatus) ? "visited" : "planned";
      if (!resolution.countryId) quality.unresolvedCountries += 1;
      if (!resolution.cityId) quality.unresolvedCities += 1;
      if (!resolution.coordinates) quality.missingCoordinates += 1;

      if (resolution.countryId) {
        const country = ensureCountry(countries, resolution);
        applyStatus(country, status, trip.id);
        country.visitCount += status === "visited" ? 1 : 0;
        country.placeIds.add(reference.logicalPlaceId);
        country.journalEntryCount += story.entries.filter((entry) => entry.placeReferenceId === reference.logicalPlaceId).length;
        country.photoCount += new Set(reference.photoIds || []).size;
        country.favoriteMemoryCount += story.entries.filter((entry) => entry.placeReferenceId === reference.logicalPlaceId && entry.favorite).length;
        updateDates(country, status === "visited" ? resolveReferenceDate(trip, reference) : undefined, status === "visited" ? resolveReferenceDate(trip, reference) : undefined, status === "planned" ? trip.travelDates?.startDate : undefined);
        tripCountryIds.add(country.id);
      }
      if (resolution.cityId) {
        const city = ensureCity(cities, resolution);
        applyStatus(city, status, trip.id);
        city.placeIds.add(reference.logicalPlaceId);
        city.journalEntryCount += story.entries.filter((entry) => entry.placeReferenceId === reference.logicalPlaceId).length;
        city.photoCount += new Set(reference.photoIds || []).size;
        city.favoriteMemoryCount += story.entries.filter((entry) => entry.placeReferenceId === reference.logicalPlaceId && entry.favorite).length;
        updateDates(city, status === "visited" ? resolveReferenceDate(trip, reference) : undefined, status === "visited" ? resolveReferenceDate(trip, reference) : undefined, status === "planned" ? trip.travelDates?.startDate : undefined);
        tripCityIds.add(city.id);
        if (resolution.countryId) countries.get(resolution.countryId)?.cityIds.add(city.id);
      }
      tripPlaceIds.add(reference.logicalPlaceId);
      places.push({
        id: reference.logicalPlaceId,
        name: reference.logicalPlaceId,
        cityId: resolution.cityId,
        countryId: resolution.countryId,
        status,
        visitStatus: placeStatus,
        tripIds: [trip.id],
        coordinates: resolution.coordinates,
        photoCount: new Set(reference.photoIds || []).size,
        journalReferenceCount: story.entries.filter((entry) => entry.placeReferenceId === reference.logicalPlaceId).length
      });
      if (resolution.coordinates) {
        routeCandidates.push({
          id: `${trip.id}:place:${reference.logicalPlaceId}`,
          label: resolution.cityName || resolution.countryName || reference.logicalPlaceId,
          countryId: resolution.countryId,
          cityId: resolution.cityId,
          placeId: reference.logicalPlaceId,
          date: resolveReferenceDate(trip, reference) || null,
          order: routeOrder(trip, reference, index),
          coordinates: resolution.coordinates
        });
      }
    });

    const route = buildRoute(trip.id, tripStatus, routeCandidates);
    if (route.points.length > 0) routes.push(route);
    if (route.points.length === 0) quality.tripsWithoutMapPoints += 1;
    if (!route.isComplete && route.points.length > 0) quality.partiallyMappedRoutes += 1;
    const bounds = route.bounds || deriveBounds(route.points.map((point) => point.coordinates));
    const explorerTrip: TravelExplorerTrip = {
      id: trip.id,
      title: trip.name,
      status: tripStatus,
      startDate: trip.travelDates?.startDate || null,
      endDate: trip.travelDates?.endDate || null,
      year: tripYear(trip),
      countryIds: [...tripCountryIds].sort(),
      cityIds: [...tripCityIds].sort(),
      placeIds: [...tripPlaceIds].sort(),
      routePointIds: route.points.map((point) => point.id),
      routeAvailable: route.points.length > 1,
      bounds
    };
    explorerTrips.push(explorerTrip);
    updateYear(years, explorerTrip, route.id);
  }

  const finalizedCountries = [...countries.values()].map(finalizeCountry).sort(sortCountries);
  const finalizedCities = [...cities.values()].map(finalizeCity).sort(sortCities);
  const finalizedTrips = explorerTrips.sort(sortTrips);
  const finalizedRoutes = routes.sort((a, b) => a.id.localeCompare(b.id));
  const finalizedYears = [...years.values()].map(finalizeYear).sort((a, b) => b.year - a.year);
  const layers = deriveLayers(finalizedCountries, finalizedCities, finalizedRoutes);
  const allCoordinates = [
    ...finalizedCountries.flatMap((country) => country.coordinates ? [country.coordinates] : []),
    ...finalizedCities.flatMap((city) => city.coordinates ? [city.coordinates] : []),
    ...finalizedRoutes.flatMap((route) => route.points.map((point) => point.coordinates))
  ];

  return {
    summary: deriveSummary(finalizedCountries, finalizedCities, places, finalizedTrips, finalizedRoutes, finalizedYears),
    countries: finalizedCountries,
    cities: finalizedCities,
    places: places.sort((a, b) => a.id.localeCompare(b.id)),
    trips: finalizedTrips,
    routes: finalizedRoutes,
    years: finalizedYears,
    layers,
    bounds: deriveBounds(allCoordinates),
    dataQuality: quality
  };
}

export const buildTravelExplorer = deriveTravelExplorer;

export function validateExplorerCoordinate(latitude: unknown, longitude: unknown): ExplorerCoordinate | null {
  const lat = typeof latitude === "number" ? latitude : typeof latitude === "string" && latitude.trim() ? Number(latitude) : NaN;
  const lng = typeof longitude === "number" ? longitude : typeof longitude === "string" && longitude.trim() ? Number(longitude) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude: lat, longitude: lng };
}

export function deriveBounds(coordinates: readonly ExplorerCoordinate[]): TravelExplorerBounds | null {
  if (coordinates.length === 0) return null;
  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudes = coordinates.map((coordinate) => coordinate.longitude);
  const north = Math.max(...latitudes);
  const south = Math.min(...latitudes);
  let east = Math.max(...longitudes);
  let west = Math.min(...longitudes);
  if (east - west > 180) {
    const shifted = longitudes.map((longitude) => longitude < 0 ? longitude + 360 : longitude).sort((a, b) => a - b);
    west = shifted[0] > 180 ? shifted[0] - 360 : shifted[0];
    east = shifted[shifted.length - 1] > 180 ? shifted[shifted.length - 1] - 360 : shifted[shifted.length - 1];
  }
  if (north === south && east === west) {
    return {
      north: Math.min(90, north + 2),
      south: Math.max(-90, south - 2),
      east: Math.min(180, east + 2),
      west: Math.max(-180, west - 2)
    };
  }
  return { north, south, east, west };
}

export function normalizeExplorerKey(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim()
    : "";
}

function todayForExplorer() {
  return "2026-07-31";
}

function resolveTripDestination(trip: TripDraft): DestinationResolution {
  const passportDestination = resolvePassportDestination({ trip });
  return resolveDestination({
    countryCode: passportDestination.countryCode || trip.destination?.countryCode,
    countryName: passportDestination.countryName || trip.destination?.country,
    cityName: passportDestination.cityName || trip.destination?.city
  });
}

function resolveReferenceDestination(trip: TripDraft, reference: TripDraftPlaceReference): DestinationResolution {
  const passportDestination = resolvePassportDestination({ trip, reference });
  return resolveDestination({
    countryCode: passportDestination.countryCode || trip.destination?.countryCode,
    countryName: passportDestination.countryName || trip.destination?.country,
    cityName: passportDestination.cityName || trip.destination?.city
  });
}

function resolveDestination(input: { countryCode?: string | null; countryName?: string | null; cityName?: string | null }): DestinationResolution {
  const countryCode = normalizePassportCountryCode(input.countryCode) || countryCodeFromName(input.countryName);
  const countryName = countryCode ? COUNTRY_CODE_TO_NAME.get(countryCode) || input.countryName || countryCode : clean(input.countryName);
  const countryId = countryCode ? `country:${countryCode}` : countryName ? `country:unresolved:${normalizeExplorerKey(countryName)}` : null;
  const cityName = clean(input.cityName);
  const cityId = cityName ? `city:${createPassportCityKey({ countryCode: countryCode || undefined, cityName })}` : null;
  const coordinateKey = countryName && cityName ? `${normalizeExplorerKey(countryName)}:${normalizeExplorerKey(cityName)}` : "";
  const coordinates = coordinateKey ? DESTINATION_COORDINATES.get(coordinateKey) || null : null;
  return {
    countryCode: countryCode || null,
    countryName: countryName || null,
    countryId,
    cityName: cityName || null,
    cityId,
    coordinates,
    coordinateSource: coordinates ? "destination" : "none"
  };
}

function countryCodeFromName(value: unknown) {
  const key = normalizeExplorerKey(value);
  if (!key) return undefined;
  return COUNTRY_ALIASES.get(key) || COUNTRY_NAME_TO_CODE.get(key);
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function ensureCountry(map: Map<string, CountryAccumulator>, resolution: DestinationResolution): CountryAccumulator {
  const id = resolution.countryId || "country:unresolved";
  const existing = map.get(id);
  if (existing) {
    if (!existing.coordinates && resolution.coordinates) {
      existing.coordinates = resolution.coordinates;
      existing.coordinateSource = resolution.coordinateSource;
    }
    return existing;
  }
  const country: CountryAccumulator = {
    id,
    countryCode: resolution.countryCode,
    countryName: resolution.countryName || "Unknown country",
    normalizedCountryKey: normalizeExplorerKey(resolution.countryName || resolution.countryCode || id),
    status: "planned",
    hasCompletedTrips: false,
    hasPlannedTrips: false,
    hasWishlistReferences: false,
    isReturnDestination: false,
    tripIds: new Set(),
    completedTripIds: new Set(),
    plannedTripIds: new Set(),
    cityIds: new Set(),
    placeIds: new Set(),
    journalEntryCount: 0,
    photoCount: 0,
    favoriteMemoryCount: 0,
    visitCount: 0,
    firstVisitDate: null,
    latestVisitDate: null,
    nextPlannedDate: null,
    coordinates: resolution.coordinates,
    coordinateSource: resolution.coordinateSource
  };
  map.set(id, country);
  return country;
}

function ensureCity(map: Map<string, CityAccumulator>, resolution: DestinationResolution): CityAccumulator {
  const id = resolution.cityId || "city:unresolved";
  const existing = map.get(id);
  if (existing) return existing;
  const city: CityAccumulator = {
    id,
    cityName: resolution.cityName || "Unknown city",
    normalizedCityKey: normalizeExplorerKey(`${resolution.countryCode || "UNRESOLVED"} ${resolution.cityName || id}`),
    countryId: resolution.countryId,
    countryCode: resolution.countryCode,
    countryName: resolution.countryName,
    status: "planned",
    hasCompletedTrips: false,
    hasPlannedTrips: false,
    hasWishlistReferences: false,
    isReturnDestination: false,
    tripIds: new Set(),
    completedTripIds: new Set(),
    plannedTripIds: new Set(),
    placeIds: new Set(),
    journalEntryCount: 0,
    photoCount: 0,
    favoriteMemoryCount: 0,
    firstVisitDate: null,
    latestVisitDate: null,
    nextPlannedDate: null,
    coordinates: resolution.coordinates,
    coordinateSource: resolution.coordinateSource
  };
  map.set(id, city);
  return city;
}

function applyStatus(entry: CountryAccumulator | CityAccumulator, status: ExplorerTravelStatus, tripId: string) {
  entry.tripIds.add(tripId);
  if (status === "visited") {
    entry.hasCompletedTrips = true;
    entry.completedTripIds.add(tripId);
    entry.status = "visited";
  } else if (status === "planned") {
    entry.hasPlannedTrips = true;
    entry.plannedTripIds.add(tripId);
    if (entry.status !== "visited") entry.status = "planned";
  }
  entry.isReturnDestination = entry.completedTripIds.size > 1 || (entry.completedTripIds.size > 0 && entry.plannedTripIds.size > 0);
}

function updateDates(entry: { firstVisitDate: string | null; latestVisitDate: string | null; nextPlannedDate: string | null }, first?: string, latest?: string, planned?: string) {
  if (first && isValidIsoDate(first) && (!entry.firstVisitDate || compareIsoDates(first, entry.firstVisitDate) < 0)) entry.firstVisitDate = first;
  if (latest && isValidIsoDate(latest) && (!entry.latestVisitDate || compareIsoDates(latest, entry.latestVisitDate) > 0)) entry.latestVisitDate = latest;
  if (planned && isValidIsoDate(planned) && (!entry.nextPlannedDate || compareIsoDates(planned, entry.nextPlannedDate) < 0)) entry.nextPlannedDate = planned;
}

function finalizeCountry(country: CountryAccumulator): TravelExplorerCountry {
  return {
    ...country,
    tripIds: [...country.tripIds].sort(),
    completedTripIds: [...country.completedTripIds].sort(),
    plannedTripIds: [...country.plannedTripIds].sort(),
    cityIds: [...country.cityIds].sort(),
    placeIds: [...country.placeIds].sort()
  };
}

function finalizeCity(city: CityAccumulator): TravelExplorerCity {
  return {
    ...city,
    tripIds: [...city.tripIds].sort(),
    completedTripIds: [...city.completedTripIds].sort(),
    plannedTripIds: [...city.plannedTripIds].sort(),
    placeIds: [...city.placeIds].sort()
  };
}

function buildRoute(tripId: string, status: "completed" | "planned", candidates: RouteCandidate[]): TravelExplorerRoute {
  const sorted = [...candidates].sort((a, b) => a.order - b.order || compareNullableDates(a.date, b.date) || a.id.localeCompare(b.id));
  const points: TravelExplorerRoutePoint[] = [];
  let unresolvedRoutePoints = 0;
  for (const candidate of sorted) {
    if (!candidate.coordinates) {
      unresolvedRoutePoints += 1;
      continue;
    }
    const previous = points[points.length - 1];
    if (previous && sameCoordinate(previous.coordinates, candidate.coordinates)) continue;
    points.push({
      id: candidate.id,
      order: points.length,
      label: candidate.label,
      countryId: candidate.countryId,
      cityId: candidate.cityId,
      placeId: candidate.placeId,
      date: candidate.date,
      coordinates: candidate.coordinates
    });
  }
  return {
    id: `route:${tripId}`,
    tripId,
    status,
    points,
    segmentCount: Math.max(0, points.length - 1),
    isComplete: unresolvedRoutePoints === 0 && points.length === sorted.length,
    bounds: deriveBounds(points.map((point) => point.coordinates)),
    unresolvedRoutePoints,
    crossesAntimeridian: points.some((point, index) => index > 0 && Math.abs(point.coordinates.longitude - points[index - 1].coordinates.longitude) > 180)
  };
}

function routeOrder(trip: TripDraft, reference: TripDraftPlaceReference, index: number) {
  const day = trip.itineraryDays.find((candidate) => candidate.id === reference.dayId);
  const dayOrder = day?.order ?? 999;
  const timeOrder = reference.timeBlock === "morning" ? 0 : reference.timeBlock === "afternoon" ? 1 : reference.timeBlock === "evening" ? 2 : 3;
  return dayOrder * 1000 + timeOrder * 100 + reference.order + index / 1000;
}

function resolveReferenceDate(trip: TripDraft, reference: TripDraftPlaceReference) {
  const day = trip.itineraryDays.find((candidate) => candidate.id === reference.dayId);
  return (day ? getTripItineraryDayDate(trip, day) : null) || trip.travelDates?.startDate;
}

function sameCoordinate(a: ExplorerCoordinate, b: ExplorerCoordinate) {
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

function compareNullableDates(a: string | null, b: string | null) {
  if (a && b) return compareIsoDates(a, b);
  if (a) return -1;
  if (b) return 1;
  return 0;
}

function tripYear(trip: TripDraft) {
  const date = trip.travelDates?.startDate || trip.travelDates?.endDate;
  return date && isValidIsoDate(date) ? Number(date.slice(0, 4)) : null;
}

function updateYear(map: Map<number, YearAccumulator>, trip: TravelExplorerTrip, routeId: string) {
  if (!trip.year) return;
  const current = map.get(trip.year) || {
    year: trip.year,
    completedTripIds: new Set<string>(),
    plannedTripIds: new Set<string>(),
    countryIds: new Set<string>(),
    visitedCountryIds: new Set<string>(),
    plannedCountryIds: new Set<string>(),
    cityIds: new Set<string>(),
    routeIds: new Set<string>()
  };
  if (trip.status === "completed") current.completedTripIds.add(trip.id);
  else current.plannedTripIds.add(trip.id);
  trip.countryIds.forEach((id) => {
    current.countryIds.add(id);
    if (trip.status === "completed") current.visitedCountryIds.add(id);
    else current.plannedCountryIds.add(id);
  });
  trip.cityIds.forEach((id) => current.cityIds.add(id));
  if (trip.routeAvailable) current.routeIds.add(routeId);
  map.set(trip.year, current);
}

function finalizeYear(year: YearAccumulator): TravelExplorerYear {
  return {
    year: year.year,
    completedTripIds: [...year.completedTripIds].sort(),
    plannedTripIds: [...year.plannedTripIds].sort(),
    countryIds: [...year.countryIds].sort(),
    cityIds: [...year.cityIds].sort(),
    routeIds: [...year.routeIds].sort(),
    visitedCountryCount: year.visitedCountryIds.size,
    plannedCountryCount: year.plannedCountryIds.size
  };
}

function deriveLayers(
  countries: readonly TravelExplorerCountry[],
  cities: readonly TravelExplorerCity[],
  routes: readonly TravelExplorerRoute[]
): TravelExplorerLayers {
  return {
    visitedCountryIds: countries.filter((country) => country.status === "visited").map((country) => country.id),
    plannedCountryIds: countries.filter((country) => country.status === "planned").map((country) => country.id),
    wishlistCountryIds: countries.filter((country) => country.status === "wishlist").map((country) => country.id),
    visitedCityIds: cities.filter((city) => city.status === "visited").map((city) => city.id),
    plannedCityIds: cities.filter((city) => city.status === "planned").map((city) => city.id),
    wishlistCityIds: cities.filter((city) => city.status === "wishlist").map((city) => city.id),
    completedRouteIds: routes.filter((route) => route.status === "completed").map((route) => route.id),
    plannedRouteIds: routes.filter((route) => route.status === "planned").map((route) => route.id)
  };
}

function deriveSummary(
  countries: readonly TravelExplorerCountry[],
  cities: readonly TravelExplorerCity[],
  places: readonly TravelExplorerPlace[],
  trips: readonly TravelExplorerTrip[],
  routes: readonly TravelExplorerRoute[],
  years: readonly TravelExplorerYear[]
) {
  const yearNumbers = years.map((year) => year.year).sort((a, b) => a - b);
  return {
    totalCountries: countries.length,
    visitedCountries: countries.filter((country) => country.status === "visited").length,
    plannedCountries: countries.filter((country) => country.status === "planned").length,
    wishlistCountries: countries.filter((country) => country.status === "wishlist").length,
    totalCities: cities.length,
    visitedCities: cities.filter((city) => city.status === "visited").length,
    plannedCities: cities.filter((city) => city.status === "planned").length,
    totalMappedPlaces: places.filter((place) => place.coordinates).length,
    visitedPlaces: places.filter((place) => place.status === "visited").length,
    plannedPlaces: places.filter((place) => place.status === "planned").length,
    tripsWithCoordinates: trips.filter((trip) => trip.bounds).length,
    routesAvailable: routes.filter((route) => route.points.length > 1).length,
    earliestTravelYear: yearNumbers[0] || null,
    latestTravelYear: yearNumbers[yearNumbers.length - 1] || null
  };
}

function sortCountries(a: TravelExplorerCountry, b: TravelExplorerCountry) {
  return statusRank(a.status) - statusRank(b.status)
    || a.countryName.localeCompare(b.countryName)
    || a.id.localeCompare(b.id);
}

function sortCities(a: TravelExplorerCity, b: TravelExplorerCity) {
  return statusRank(a.status) - statusRank(b.status)
    || (a.countryName || "").localeCompare(b.countryName || "")
    || a.cityName.localeCompare(b.cityName)
    || a.id.localeCompare(b.id);
}

function sortTrips(a: TravelExplorerTrip, b: TravelExplorerTrip) {
  return compareNullableDates(b.startDate, a.startDate)
    || compareNullableDates(b.endDate, a.endDate)
    || a.title.localeCompare(b.title)
    || a.id.localeCompare(b.id);
}

function statusRank(status: ExplorerTravelStatus) {
  return status === "visited" ? 0 : status === "planned" ? 1 : 2;
}
