import { countries } from "../data/countries";
import type { SavedPlace } from "./savedPlaces";
import {
  compareIsoDates,
  getTripDurationDays,
  getTripItineraryDayDate,
  isValidIsoDate,
  normalizeTripCompletionStatus,
  normalizeTripDraft,
  normalizeTripPlaceVisitStatus,
  type TripDraft,
  type TripDraftPlaceReference
} from "./tripDrafts";
import type {
  PassportTripCompletionState,
  TravelPassport,
  TravelPassportAchievement,
  TravelPassportAchievementMetric,
  TravelPassportCityEntry,
  TravelPassportCountryEntry,
  TravelPassportDataQuality,
  TravelPassportPlaceEntry,
  TravelPassportStamp,
  TravelPassportSummary,
  TravelPassportTimelineEntry,
  TravelPassportTripEntry,
  TravelPassportYearSummary
} from "./travelPassportTypes";

type DeriveOptions = {
  savedPlaces?: readonly SavedPlace[];
  currentDate?: string;
  generatedAt?: string;
};

type ResolvedDestination = {
  countryCode?: string;
  countryName?: string;
  cityName?: string;
};

type CountryAccumulator = TravelPassportCountryEntry & {
  tripIds: Set<string>;
  cityIds: Set<string>;
};

type CityAccumulator = TravelPassportCityEntry & {
  tripIds: Set<string>;
};

type YearAccumulator = {
  year: number;
  tripIds: Set<string>;
  countryCodes: Set<string>;
  cityIds: Set<string>;
  visitedPlaceCount: number;
  travelDayCount: number;
  memoryCount: number;
};

const COUNTRY_NAME_TO_CODE = new Map(countries.map((country) => [normalizeCountryName(country.name), country.code]));
const COUNTRY_CODE_TO_NAME = new Map(countries.map((country) => [country.code, country.name]));

const ACHIEVEMENT_DEFINITIONS: ReadonlyArray<{
  id: TravelPassportAchievement["id"];
  titleKey: string;
  descriptionKey: string;
  metric: TravelPassportAchievementMetric;
  target: number;
}> = Object.freeze([
  { id: "first_journey", titleKey: "travelPassport.achievements.firstJourney.title", descriptionKey: "travelPassport.achievements.firstJourney.description", metric: "completedTrips", target: 1 },
  { id: "country_explorer", titleKey: "travelPassport.achievements.countryExplorer.title", descriptionKey: "travelPassport.achievements.countryExplorer.description", metric: "countries", target: 3 },
  { id: "city_explorer", titleKey: "travelPassport.achievements.cityExplorer.title", descriptionKey: "travelPassport.achievements.cityExplorer.description", metric: "cities", target: 5 },
  { id: "memory_keeper", titleKey: "travelPassport.achievements.memoryKeeper.title", descriptionKey: "travelPassport.achievements.memoryKeeper.description", metric: "memories", target: 10 },
  { id: "travel_regular", titleKey: "travelPassport.achievements.travelRegular.title", descriptionKey: "travelPassport.achievements.travelRegular.description", metric: "completedTrips", target: 5 },
  { id: "world_wanderer", titleKey: "travelPassport.achievements.worldWanderer.title", descriptionKey: "travelPassport.achievements.worldWanderer.description", metric: "countries", target: 10 }
]);

export function deriveTravelPassport(tripDrafts: readonly TripDraft[], options: DeriveOptions = {}): TravelPassport {
  const currentDate = isValidIsoDate(options.currentDate) ? options.currentDate : new Date().toISOString().slice(0, 10);
  const generatedAt = options.generatedAt || new Date().toISOString();
  const savedPlacesById = new Map((options.savedPlaces || []).map((place) => [place.id, place]));
  const countriesByCode = new Map<string, CountryAccumulator>();
  const citiesById = new Map<string, CityAccumulator>();
  const yearsByNumber = new Map<number, YearAccumulator>();
  const visitedPlaces: TravelPassportPlaceEntry[] = [];
  const tripEntries: TravelPassportTripEntry[] = [];
  const timeline: TravelPassportTimelineEntry[] = [];
  const seenGlobalPhotoIds = new Set<string>();
  const quality: TravelPassportDataQuality = {
    visitedReferencesProcessed: 0,
    unresolvedCountryCount: 0,
    unresolvedCityCount: 0,
    invalidDateCount: 0,
    unavailableReferenceCount: 0,
    duplicateReferenceCount: 0,
    duplicatePhotoOwnershipCount: 0
  };

  for (const sourceDraft of tripDrafts) {
    const draft = normalizeTripDraft(sourceDraft);
    if (!draft) continue;
    const validDateRange = getValidDateRange(draft);
    if (draft.travelDates && !validDateRange) quality.invalidDateCount += 1;
    const completionState = determinePassportTripCompletion(draft, currentDate);
    const qualifyingTrip = completionState === "completed" || completionState === "derived_completed";
    const seenReferencesInTrip = new Set<string>();
    const tripCountryCodes = new Set<string>();
    const tripCountryNames = new Map<string, string>();
    const tripCityIds = new Set<string>();
    const tripCityNames = new Set<string>();
    let visitedPlaceCount = 0;
    let memoryCount = 0;

    if (qualifyingTrip && draft.destination) {
      const destination = resolvePassportDestination({ trip: draft });
      addTripDestination(destination, tripCountryCodes, tripCountryNames, tripCityIds, tripCityNames);
      addAggregateDestination({
        countriesByCode,
        citiesById,
        destination,
        tripId: draft.id,
        visitDate: getTripSortDate({
          startDate: validDateRange?.startDate,
          endDate: validDateRange?.endDate,
          completedAt: draft.completedAt
        }),
        visitedPlaceCount: 0,
        memoryCount: 0
      });
    }

    for (const reference of draft.placeReferences) {
      const referenceId = getPassportPlaceReferenceId(reference);
      if (seenReferencesInTrip.has(referenceId)) {
        if (qualifyingTrip) quality.duplicateReferenceCount += 1;
        continue;
      }
      seenReferencesInTrip.add(referenceId);
      if (!qualifyingTrip || !isPassportVisitedStatus(reference.visitStatus)) continue;

      quality.visitedReferencesProcessed += 1;
      visitedPlaceCount += 1;
      const savedPlace = savedPlacesById.get(reference.logicalPlaceId) || null;
      if (!savedPlace) quality.unavailableReferenceCount += 1;
      const destination = resolvePassportDestination({ trip: draft, reference, place: savedPlace });
      const visitDate = resolveVisitDate(draft, reference);
      const normalizedPhotoIds = normalizePassportPhotoIds(reference.photoIds);
      const ownedPhotoIds = normalizedPhotoIds.filter((photoId) => {
        if (seenGlobalPhotoIds.has(photoId)) {
          quality.duplicatePhotoOwnershipCount += 1;
          return false;
        }
        seenGlobalPhotoIds.add(photoId);
        return true;
      });
      const referenceMemoryCount = ownedPhotoIds.length;
      memoryCount += referenceMemoryCount;

      if (!destination.countryCode) quality.unresolvedCountryCount += 1;
      if (!destination.cityName) quality.unresolvedCityCount += 1;
      addTripDestination(destination, tripCountryCodes, tripCountryNames, tripCityIds, tripCityNames);
      addAggregateDestination({
        countriesByCode,
        citiesById,
        destination,
        tripId: draft.id,
        visitDate,
        visitedPlaceCount: 1,
        memoryCount: referenceMemoryCount
      });

      visitedPlaces.push({
        tripDraftId: draft.id,
        placeReferenceId: referenceId,
        tripTitle: draft.name,
        displayName: savedPlace?.name || "Location unavailable",
        cityName: destination.cityName,
        countryCode: destination.countryCode,
        countryName: destination.countryName,
        category: savedPlace?.type,
        visitDate,
        memoryCount: referenceMemoryCount,
        unavailable: savedPlace === null
      });
    }

    const travelDayCount = validDateRange ? calculatePassportTravelDays(validDateRange.startDate, validDateRange.endDate) : 0;
    const tripEntry: TravelPassportTripEntry = {
      tripDraftId: draft.id,
      title: draft.name,
      completionState,
      startDate: validDateRange?.startDate,
      endDate: validDateRange?.endDate,
      completedAt: draft.completedAt,
      countryCodes: [...tripCountryCodes],
      countryNames: [...tripCountryNames.values()],
      cityKeys: [...tripCityIds],
      cityNames: [...tripCityNames],
      visitedPlaceCount,
      memoryCount,
      travelDayCount
    };
    tripEntries.push(tripEntry);
    if (qualifyingTrip) {
      const sortDate = getTripSortDate(tripEntry);
      const timelineEntry: TravelPassportTimelineEntry = {
        ...tripEntry,
        sortDate,
        year: getPassportTripYear(tripEntry)
      };
      timeline.push(timelineEntry);
      updateYearSummary(yearsByNumber, timelineEntry);
    }
  }

  const countries = [...countriesByCode.values()].map(finalizeCountry).sort(sortCountries);
  const cities = [...citiesById.values()].map(finalizeCity).sort(sortCities);
  const sortedTimeline = timeline.sort(sortTimeline);
  const summary = derivePassportSummary(sortedTimeline, countries, cities, visitedPlaces);
  const stamps = derivePassportStamps(countries, cities, sortedTimeline);
  const achievements = derivePassportAchievements(summary, sortedTimeline, countries, cities);

  return {
    summary,
    countries,
    cities,
    trips: tripEntries,
    places: visitedPlaces.sort(sortPlaces),
    timeline: sortedTimeline,
    yearlySummaries: [...yearsByNumber.values()].map(finalizeYear).sort((a, b) => b.year - a.year),
    stamps,
    achievements,
    dataQuality: quality,
    generatedAt
  };
}

export const buildTravelPassport = deriveTravelPassport;

export function determinePassportTripCompletion(draft: TripDraft, currentDate: string): PassportTripCompletionState {
  const completionStatus = normalizeTripCompletionStatus(draft.completionStatus);
  if (completionStatus === "completed") return "completed";
  if (draft.travelDates?.endDate && isValidIsoDate(currentDate) && compareIsoDates(draft.travelDates.endDate, currentDate) < 0) {
    const hasVisitedPlace = draft.placeReferences.some((reference) => isPassportVisitedStatus(reference.visitStatus));
    if (hasVisitedPlace) return "derived_completed";
  }
  if (draft.travelDates?.startDate && isValidIsoDate(currentDate) && compareIsoDates(draft.travelDates.startDate, currentDate) > 0) {
    return "planned";
  }
  return "undetermined";
}

export function isPassportVisitedStatus(status: unknown) {
  return normalizeTripPlaceVisitStatus(status) === "visited";
}

export function normalizePassportCountryCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
}

export function createPassportCityKey(input: { countryCode?: string; cityName?: string }) {
  const city = normalizeCityForKey(input.cityName);
  if (!city) return "";
  return `${input.countryCode ? input.countryCode : "UNRESOLVED"}:${city}`;
}

export function calculatePassportTravelDays(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return 0;
  return getTripDurationDays(startDate, endDate) || 0;
}

export function buildPassportStampId(type: "country" | "city" | "trip", id: string) {
  return `${type}:${id}`;
}

export function getPassportStampRotation(id: string) {
  const total = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (total % 5) - 2;
}

export function resolvePassportDestination(input: {
  trip: TripDraft;
  reference?: TripDraftPlaceReference;
  place?: SavedPlace | null;
}): ResolvedDestination {
  const tripDestination = input.trip.destination;
  const code = normalizePassportCountryCode(tripDestination?.countryCode)
    || countryCodeFromName(input.place?.country)
    || countryCodeFromName(tripDestination?.country);
  const countryName = code ? getCountryDisplayName(code, input.place?.country || tripDestination?.country) : cleanLabel(input.place?.country || tripDestination?.country);
  const cityName = cleanLabel(input.place?.city || tripDestination?.city);
  return { countryCode: code, countryName, cityName };
}

function addTripDestination(
  destination: ResolvedDestination,
  countryCodes: Set<string>,
  countryNames: Map<string, string>,
  cityIds: Set<string>,
  cityNames: Set<string>
) {
  if (destination.countryCode) {
    countryCodes.add(destination.countryCode);
    countryNames.set(destination.countryCode, destination.countryName || getCountryDisplayName(destination.countryCode));
  }
  if (destination.cityName) {
    const cityId = createPassportCityKey({ countryCode: destination.countryCode, cityName: destination.cityName });
    if (cityId) cityIds.add(cityId);
    cityNames.add(destination.cityName);
  }
}

function addAggregateDestination(input: {
  countriesByCode: Map<string, CountryAccumulator>;
  citiesById: Map<string, CityAccumulator>;
  destination: ResolvedDestination;
  tripId: string;
  visitDate?: string;
  visitedPlaceCount: number;
  memoryCount: number;
}) {
  if (input.destination.countryCode) {
    const country = ensureCountry(input.countriesByCode, input.destination.countryCode, input.destination.countryName);
    country.tripIds.add(input.tripId);
    country.visitedPlaceCount += input.visitedPlaceCount;
    country.memoryCount += input.memoryCount;
    updateEntryDates(country, input.visitDate);
  }
  if (input.destination.cityName) {
    const cityId = createPassportCityKey({ countryCode: input.destination.countryCode, cityName: input.destination.cityName });
    const city = ensureCity(input.citiesById, cityId, input.destination);
    city.tripIds.add(input.tripId);
    city.visitedPlaceCount += input.visitedPlaceCount;
    city.memoryCount += input.memoryCount;
    updateEntryDates(city, input.visitDate);
    if (input.destination.countryCode) input.countriesByCode.get(input.destination.countryCode)?.cityIds.add(cityId);
  }
}

function ensureCountry(map: Map<string, CountryAccumulator>, code: string, displayName?: string): CountryAccumulator {
  const existing = map.get(code);
  if (existing) return existing;
  const country: CountryAccumulator = {
    countryCode: code,
    displayName: displayName || getCountryDisplayName(code),
    tripCount: 0,
    cityCount: 0,
    visitedPlaceCount: 0,
    memoryCount: 0,
    tripIds: new Set(),
    cityIds: new Set()
  };
  map.set(code, country);
  return country;
}

function ensureCity(map: Map<string, CityAccumulator>, id: string, destination: ResolvedDestination): CityAccumulator {
  const existing = map.get(id);
  if (existing) return existing;
  const city: CityAccumulator = {
    id,
    cityName: destination.cityName || "Location unavailable",
    countryCode: destination.countryCode,
    countryName: destination.countryName,
    tripCount: 0,
    visitedPlaceCount: 0,
    memoryCount: 0,
    tripIds: new Set()
  };
  map.set(id, city);
  return city;
}

function finalizeCountry(country: CountryAccumulator): TravelPassportCountryEntry {
  return {
    countryCode: country.countryCode,
    displayName: country.displayName,
    firstVisitDate: country.firstVisitDate,
    latestVisitDate: country.latestVisitDate,
    tripCount: country.tripIds.size,
    cityCount: country.cityIds.size,
    visitedPlaceCount: country.visitedPlaceCount,
    memoryCount: country.memoryCount
  };
}

function finalizeCity(city: CityAccumulator): TravelPassportCityEntry {
  return {
    id: city.id,
    cityName: city.cityName,
    countryCode: city.countryCode,
    countryName: city.countryName,
    firstVisitDate: city.firstVisitDate,
    latestVisitDate: city.latestVisitDate,
    tripCount: city.tripIds.size,
    visitedPlaceCount: city.visitedPlaceCount,
    memoryCount: city.memoryCount
  };
}

function derivePassportSummary(
  timeline: readonly TravelPassportTimelineEntry[],
  countries: readonly TravelPassportCountryEntry[],
  cities: readonly TravelPassportCityEntry[],
  places: readonly TravelPassportPlaceEntry[]
): TravelPassportSummary {
  const travelDates = [
    ...timeline.flatMap((trip) => [trip.startDate, trip.endDate].filter(isValidIsoDate)),
    ...places.flatMap((place) => place.visitDate && isValidIsoDate(place.visitDate) ? [place.visitDate] : [])
  ].sort(compareIsoDates);
  return {
    totalTripsCompleted: timeline.length,
    totalCountriesVisited: countries.length,
    totalCitiesVisited: cities.filter((city) => city.countryCode).length,
    totalVisitedPlaces: places.length,
    totalTravelDays: timeline.reduce((sum, trip) => sum + trip.travelDayCount, 0),
    totalMemories: places.reduce((sum, place) => sum + place.memoryCount, 0),
    firstTravelDate: travelDates[0],
    mostRecentTravelDate: travelDates[travelDates.length - 1]
  };
}

function derivePassportStamps(
  countries: readonly TravelPassportCountryEntry[],
  cities: readonly TravelPassportCityEntry[],
  timeline: readonly TravelPassportTimelineEntry[]
): TravelPassportStamp[] {
  return [
    ...countries.map((country) => ({
      id: buildPassportStampId("country", country.countryCode),
      type: "country" as const,
      countryCode: country.countryCode,
      displayName: country.displayName,
      earnedAt: country.firstVisitDate
    })),
    ...cities.map((city) => ({
      id: buildPassportStampId("city", city.id),
      type: "city" as const,
      cityId: city.id,
      countryCode: city.countryCode,
      displayName: city.countryName ? `${city.cityName}, ${city.countryName}` : city.cityName,
      earnedAt: city.firstVisitDate
    })),
    ...timeline.map((trip) => ({
      id: buildPassportStampId("trip", trip.tripDraftId),
      type: "trip" as const,
      tripDraftId: trip.tripDraftId,
      displayName: trip.title,
      earnedAt: getTripSortDate(trip)
    }))
  ].sort(sortStamps);
}

function derivePassportAchievements(
  summary: TravelPassportSummary,
  timeline: readonly TravelPassportTimelineEntry[],
  countries: readonly TravelPassportCountryEntry[],
  cities: readonly TravelPassportCityEntry[]
): TravelPassportAchievement[] {
  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const current = metricValue(summary, definition.metric);
    const target = Math.max(1, definition.target);
    return {
      ...definition,
      current,
      target,
      completed: current >= target,
      earnedAt: current >= target ? deriveAchievementEarnedAt(definition.metric, target, timeline, countries, cities) : undefined,
      progressPercent: Math.min(100, Math.max(0, (current / target) * 100))
    };
  });
}

function metricValue(summary: TravelPassportSummary, metric: TravelPassportAchievementMetric) {
  if (metric === "completedTrips") return summary.totalTripsCompleted;
  if (metric === "countries") return summary.totalCountriesVisited;
  if (metric === "cities") return summary.totalCitiesVisited;
  if (metric === "visitedPlaces") return summary.totalVisitedPlaces;
  if (metric === "memories") return summary.totalMemories;
  return 0;
}

function deriveAchievementEarnedAt(
  metric: TravelPassportAchievementMetric,
  target: number,
  timeline: readonly TravelPassportTimelineEntry[],
  countries: readonly TravelPassportCountryEntry[],
  cities: readonly TravelPassportCityEntry[]
) {
  if (metric === "completedTrips") return nthDate(timeline.map(getTripSortDate), target);
  if (metric === "countries") return nthDate(countries.map((country) => country.firstVisitDate), target);
  if (metric === "cities") return nthDate(cities.map((city) => city.firstVisitDate), target);
  return undefined;
}

function nthDate(values: Array<string | undefined>, target: number) {
  const dates = values.filter(isValidIsoDate).sort(compareIsoDates);
  return dates[target - 1];
}

function updateYearSummary(map: Map<number, YearAccumulator>, trip: TravelPassportTimelineEntry) {
  const year = getPassportTripYear(trip);
  if (!year) return;
  const current = map.get(year) || {
    year,
    tripIds: new Set<string>(),
    countryCodes: new Set<string>(),
    cityIds: new Set<string>(),
    visitedPlaceCount: 0,
    travelDayCount: 0,
    memoryCount: 0
  };
  current.tripIds.add(trip.tripDraftId);
  trip.countryCodes.forEach((code) => current.countryCodes.add(code));
  trip.cityKeys.forEach((key) => current.cityIds.add(key));
  current.visitedPlaceCount += trip.visitedPlaceCount;
  current.travelDayCount += trip.travelDayCount;
  current.memoryCount += trip.memoryCount;
  map.set(year, current);
}

function finalizeYear(year: YearAccumulator): TravelPassportYearSummary {
  return {
    year: year.year,
    completedTripCount: year.tripIds.size,
    countryCount: year.countryCodes.size,
    cityCount: year.cityIds.size,
    visitedPlaceCount: year.visitedPlaceCount,
    travelDayCount: year.travelDayCount,
    memoryCount: year.memoryCount
  };
}

function getValidDateRange(draft: TripDraft) {
  const startDate = draft.travelDates?.startDate;
  const endDate = draft.travelDates?.endDate;
  if (!startDate || !isValidIsoDate(startDate)) return undefined;
  if (!endDate || !isValidIsoDate(endDate) || compareIsoDates(endDate, startDate) < 0) return { startDate };
  return { startDate, endDate };
}

function resolveVisitDate(draft: TripDraft, reference: TripDraftPlaceReference) {
  const day = draft.itineraryDays.find((item) => item.id === reference.dayId);
  const itineraryDate = day ? getTripItineraryDayDate(draft, day) : null;
  if (itineraryDate && isValidIsoDate(itineraryDate)) return itineraryDate;
  if (draft.travelDates?.startDate && isValidIsoDate(draft.travelDates.startDate)) return draft.travelDates.startDate;
  return undefined;
}

function getPassportTripYear(trip: TravelPassportTripEntry) {
  const source = trip.endDate || trip.startDate;
  return source && isValidIsoDate(source) ? Number(source.slice(0, 4)) : undefined;
}

function getTripSortDate(trip: Pick<TravelPassportTripEntry, "startDate" | "endDate" | "completedAt">) {
  if (trip.startDate && isValidIsoDate(trip.startDate)) return trip.startDate;
  if (trip.endDate && isValidIsoDate(trip.endDate)) return trip.endDate;
  return trip.completedAt && trip.completedAt.length >= 10 && isValidIsoDate(trip.completedAt.slice(0, 10))
    ? trip.completedAt.slice(0, 10)
    : undefined;
}

function updateEntryDates(entry: { firstVisitDate?: string; latestVisitDate?: string }, date?: string) {
  if (!date || !isValidIsoDate(date)) return;
  if (!entry.firstVisitDate || compareIsoDates(date, entry.firstVisitDate) < 0) entry.firstVisitDate = date;
  if (!entry.latestVisitDate || compareIsoDates(date, entry.latestVisitDate) > 0) entry.latestVisitDate = date;
}

function normalizePassportPhotoIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item) => {
    const id = typeof item === "string" ? item.trim() : "";
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [id];
  });
}

function getPassportPlaceReferenceId(reference: TripDraftPlaceReference) {
  return reference.logicalPlaceId;
}

function countryCodeFromName(value: unknown) {
  const name = cleanLabel(value);
  return name ? COUNTRY_NAME_TO_CODE.get(normalizeCountryName(name)) : undefined;
}

function getCountryDisplayName(code: string, fallback?: string) {
  return COUNTRY_CODE_TO_NAME.get(code) || cleanLabel(fallback) || code;
}

function normalizeCountryName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function cleanLabel(value: unknown) {
  return typeof value === "string" ? value.normalize("NFKC").trim().replace(/\s+/g, " ") || undefined : undefined;
}

function normalizeCityForKey(value: unknown) {
  const cleaned = cleanLabel(value);
  if (!cleaned) return "";
  return cleaned
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function sortCountries(a: TravelPassportCountryEntry, b: TravelPassportCountryEntry) {
  return a.displayName.localeCompare(b.displayName) || a.countryCode.localeCompare(b.countryCode);
}

function sortCities(a: TravelPassportCityEntry, b: TravelPassportCityEntry) {
  return a.cityName.localeCompare(b.cityName) || (a.countryCode || "").localeCompare(b.countryCode || "");
}

function sortTimeline(a: TravelPassportTimelineEntry, b: TravelPassportTimelineEntry) {
  if (!a.sortDate && !b.sortDate) return a.title.localeCompare(b.title);
  if (!a.sortDate) return 1;
  if (!b.sortDate) return -1;
  return compareIsoDates(b.sortDate, a.sortDate) || a.title.localeCompare(b.title);
}

function sortPlaces(a: TravelPassportPlaceEntry, b: TravelPassportPlaceEntry) {
  if (!a.visitDate && !b.visitDate) return a.displayName.localeCompare(b.displayName);
  if (!a.visitDate) return 1;
  if (!b.visitDate) return -1;
  return compareIsoDates(b.visitDate, a.visitDate) || a.displayName.localeCompare(b.displayName);
}

function sortStamps(a: TravelPassportStamp, b: TravelPassportStamp) {
  if (!a.earnedAt && !b.earnedAt) return a.displayName.localeCompare(b.displayName);
  if (!a.earnedAt) return 1;
  if (!b.earnedAt) return -1;
  return compareIsoDates(b.earnedAt, a.earnedAt) || a.displayName.localeCompare(b.displayName);
}
