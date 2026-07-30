import { collectTripDraftPhotoReferences, deriveTripStory } from "./tripJournal";
import {
  compareIsoDates,
  getTripDurationDays,
  isValidIsoDate,
  normalizeTripDraft,
  type TripDraft
} from "./tripDrafts";
import { deriveTravelPassport } from "./travelPassport";
import type { TravelPassportTripEntry } from "./travelPassportTypes";
import type {
  TravelInsightSeason,
  TravelInsights,
  TravelInsightsCity,
  TravelInsightsCountry,
  TravelInsightsDataQuality,
  TravelInsightsFavoriteDestination,
  TravelInsightsJournalInsights,
  TravelInsightsMonthEntry,
  TravelInsightsSeasonEntry,
  TravelInsightsStreaks,
  TravelInsightsSummary,
  TravelInsightsTimeline,
  TravelInsightsTrip,
  TravelInsightsYearEntry
} from "./travelInsightsTypes";

type DeriveTravelInsightsOptions = {
  currentDate?: string;
  generatedAt?: string;
};

type DraftJournalStats = {
  totalEntries: number;
  completedEntries: number;
  draftEntries: number;
  favoriteEntries: number;
  totalPhotoReferences: number;
  longestEntry?: {
    entryId: string;
    characterCount: number;
  };
  favoritePhotoIds: Set<string>;
};

type YearAccumulator = TravelInsightsYearEntry & {
  countryCodes: Set<string>;
  cityKeys: Set<string>;
};

const MONTH_NUMBERS = Array.from({ length: 12 }, (_, index) => index + 1);
const SEASONS: readonly TravelInsightSeason[] = ["spring", "summer", "autumn", "winter"];

export function deriveTravelInsights(tripDrafts: readonly TripDraft[], options: DeriveTravelInsightsOptions = {}): TravelInsights {
  const normalizedDrafts = tripDrafts.flatMap((draft) => {
    const normalized = normalizeTripDraft(draft);
    return normalized ? [normalized] : [];
  });
  const malformedTripCount = tripDrafts.length - normalizedDrafts.length;
  const passport = deriveTravelPassport(normalizedDrafts, {
    currentDate: options.currentDate,
    generatedAt: options.generatedAt || "derived"
  });
  const draftById = new Map(normalizedDrafts.map((draft) => [draft.id, draft]));
  const storyByTripId = new Map(normalizedDrafts.map((draft) => [draft.id, deriveTripStory({ tripDraft: draft })]));
  const journalStatsByTripId = new Map<string, DraftJournalStats>();
  const uniquePhotoIds = new Set<string>();
  const yearMap = new Map<number, YearAccumulator>();

  for (const draft of normalizedDrafts) {
    const references = collectTripDraftPhotoReferences(draft);
    references.allPhotoIds.forEach((photoId) => uniquePhotoIds.add(photoId));
    const story = storyByTripId.get(draft.id);
    const favoritePhotoIds = new Set<string>();
    let longestEntry: DraftJournalStats["longestEntry"];
    for (const entry of story?.entries || []) {
      if (entry.favorite) entry.photoIds.forEach((photoId) => favoritePhotoIds.add(photoId));
      const characterCount = entry.body.length;
      if (!longestEntry || characterCount > longestEntry.characterCount || (characterCount === longestEntry.characterCount && entry.id < longestEntry.entryId)) {
        longestEntry = { entryId: entry.id, characterCount };
      }
    }
    journalStatsByTripId.set(draft.id, {
      totalEntries: story?.summary.totalEntries || 0,
      completedEntries: story?.summary.completedEntries || 0,
      draftEntries: story?.summary.draftEntries || 0,
      favoriteEntries: story?.summary.favoriteEntries || 0,
      totalPhotoReferences: story?.summary.totalPhotoReferences || 0,
      longestEntry,
      favoritePhotoIds
    });
  }

  const completedTrips = passport.timeline.map((trip) => buildTripInsight(trip, draftById.get(trip.tripDraftId), journalStatsByTripId.get(trip.tripDraftId)));
  completedTrips.forEach((trip) => updateYearActivity(yearMap, trip));
  const yearlyActivity = [...yearMap.values()].map(finalizeYear).sort(sortYearsDescending);
  const countryInsights = passport.countries.map((country): TravelInsightsCountry => {
    const relatedTrips = completedTrips.filter((trip) => trip.countryCodes.includes(country.countryCode));
    const journalEntryCount = sum(relatedTrips.map((trip) => trip.journalEntryCount));
    const favoriteEntryCount = sum(relatedTrips.map((trip) => trip.favoriteEntryCount));
    const travelDayCount = sum(relatedTrips.map((trip) => trip.durationDays));
    const photoCount = uniqueDestinationPhotoCount(relatedTrips);
    return {
      countryCode: country.countryCode,
      displayName: country.displayName,
      tripCount: country.tripCount,
      returnVisits: Math.max(country.tripCount - 1, 0),
      cityCount: country.cityCount,
      visitedPlaceCount: country.visitedPlaceCount,
      photoCount,
      journalEntryCount,
      favoriteEntryCount,
      travelDayCount,
      firstVisitDate: country.firstVisitDate,
      latestVisitDate: country.latestVisitDate,
      tripIds: relatedTrips.map((trip) => trip.tripDraftId).sort()
    };
  }).sort(sortCountriesByTrips);

  const cityInsights = passport.cities.map((city): TravelInsightsCity => {
    const relatedTrips = completedTrips.filter((trip) => trip.cityKeys.includes(city.id));
    return {
      id: city.id,
      cityName: city.cityName,
      countryCode: city.countryCode,
      countryName: city.countryName,
      tripCount: city.tripCount,
      visitedPlaceCount: city.visitedPlaceCount,
      photoCount: uniqueDestinationPhotoCount(relatedTrips),
      journalEntryCount: sum(relatedTrips.map((trip) => trip.journalEntryCount)),
      favoriteEntryCount: sum(relatedTrips.map((trip) => trip.favoriteEntryCount)),
      travelDayCount: sum(relatedTrips.map((trip) => trip.durationDays)),
      firstVisitDate: city.firstVisitDate,
      latestVisitDate: city.latestVisitDate,
      tripIds: relatedTrips.map((trip) => trip.tripDraftId).sort()
    };
  }).sort(sortCitiesByTrips);

  const summary = deriveSummary(normalizedDrafts, completedTrips, passport, uniquePhotoIds.size);
  const seasonInsights = deriveSeasonInsights(completedTrips);
  const monthInsights = deriveMonthInsights(completedTrips);
  const timelineInsights = deriveTimelineInsights(completedTrips, yearlyActivity);
  const streaks = deriveStreaks(yearlyActivity, countryInsights, cityInsights);
  const favoriteDestinations = deriveFavoriteDestinations(countryInsights, cityInsights);
  const photoInsights = derivePhotoInsights(completedTrips, countryInsights, cityInsights, uniquePhotoIds.size, journalStatsByTripId);
  const journalInsights = deriveJournalInsights(normalizedDrafts, completedTrips, journalStatsByTripId, countryInsights);
  const dataQuality: TravelInsightsDataQuality = {
    unknownCountryCount: passport.dataQuality.unresolvedCountryCount,
    unknownCityCount: passport.dataQuality.unresolvedCityCount,
    missingDateCount: completedTrips.filter((trip) => !trip.startDate && !trip.endDate).length,
    invalidDateRangeCount: normalizedDrafts.filter((draft) => draft.travelDates && !validTripDuration(draft.travelDates.startDate, draft.travelDates.endDate)).length,
    unavailablePlaceCount: passport.dataQuality.unavailableReferenceCount,
    duplicateReferenceCount: passport.dataQuality.duplicateReferenceCount,
    duplicatePhotoReferenceCount: passport.dataQuality.duplicatePhotoOwnershipCount,
    brokenJournalLinkCount: [...storyByTripId.values()].reduce((count, story) => count + story.entries.filter((entry) => entry.unavailableDay || entry.unavailablePlace).length, 0),
    malformedTripCount
  };

  return {
    summary,
    travelPatterns: {
      seasons: seasonInsights,
      months: monthInsights,
      mostActiveSeason: pickMostActiveSeason(seasonInsights),
      mostActiveMonth: pickMostActiveMonth(monthInsights),
      quietestRecordedMonth: pickQuietestRecordedMonth(monthInsights),
      favoriteDestinations,
      streaks
    },
    countryInsights,
    cityInsights,
    tripInsights: completedTrips.sort(sortTripsMostRecent),
    photoInsights,
    journalInsights,
    seasonInsights,
    monthInsights,
    timelineInsights,
    yearlyActivity,
    dataQuality
  };
}

export const buildTravelInsights = deriveTravelInsights;

function buildTripInsight(trip: TravelPassportTripEntry, draft: TripDraft | undefined, journal?: DraftJournalStats): TravelInsightsTrip {
  const durationDays = trip.travelDayCount || calculateDuration(trip.startDate, trip.endDate);
  const startMonth = trip.startDate ? monthFromDate(trip.startDate) : undefined;
  return {
    tripDraftId: trip.tripDraftId,
    title: trip.title,
    completionState: trip.completionState,
    startDate: trip.startDate,
    endDate: trip.endDate,
    durationDays,
    countryCodes: [...trip.countryCodes],
    countryNames: [...trip.countryNames],
    cityKeys: [...trip.cityKeys],
    cityNames: [...trip.cityNames],
    visitedPlaceCount: trip.visitedPlaceCount,
    photoCount: draft ? collectTripDraftPhotoReferences(draft).allPhotoIds.size : trip.memoryCount,
    journalEntryCount: journal?.totalEntries || 0,
    favoriteEntryCount: journal?.favoriteEntries || 0,
    season: startMonth ? seasonForMonth(startMonth) : undefined,
    year: trip.endDate ? Number(trip.endDate.slice(0, 4)) : trip.startDate ? Number(trip.startDate.slice(0, 4)) : undefined
  };
}

function deriveSummary(
  drafts: readonly TripDraft[],
  completedTrips: readonly TravelInsightsTrip[],
  passport: ReturnType<typeof deriveTravelPassport>,
  totalPhotos: number
): TravelInsightsSummary {
  const durations = completedTrips.map((trip) => trip.durationDays).filter((days) => days > 0);
  const activeYears = new Set(completedTrips.flatMap((trip) => trip.year ? [trip.year] : []));
  return {
    totalTrips: drafts.length,
    completedTrips: passport.summary.totalTripsCompleted,
    plannedTrips: passport.trips.filter((trip) => trip.completionState === "planned").length,
    countriesVisited: passport.summary.totalCountriesVisited,
    citiesVisited: passport.summary.totalCitiesVisited,
    visitedPlaces: passport.summary.totalVisitedPlaces,
    travelDays: passport.summary.totalTravelDays,
    journalEntries: drafts.reduce((count, draft) => count + (draft.journalEntries?.length || 0), 0),
    favoriteMoments: drafts.reduce((count, draft) => count + (draft.journalEntries || []).filter((entry) => entry.favorite).length, 0),
    photos: totalPhotos,
    averageTripLength: durations.length ? roundOne(sum(durations) / durations.length) : 0,
    longestTripDays: durations.length ? Math.max(...durations) : 0,
    shortestTripDays: durations.length ? Math.min(...durations) : 0,
    yearsTraveling: activeYears.size
  };
}

function derivePhotoInsights(
  completedTrips: readonly TravelInsightsTrip[],
  countries: readonly TravelInsightsCountry[],
  cities: readonly TravelInsightsCity[],
  totalPhotos: number,
  journals: ReadonlyMap<string, DraftJournalStats>
) {
  const tripsWithPhotos = completedTrips.filter((trip) => trip.photoCount > 0);
  const travelDays = sum(completedTrips.map((trip) => trip.durationDays));
  return {
    totalPhotos,
    tripsWithPhotos: tripsWithPhotos.length,
    averagePhotosPerCompletedTrip: completedTrips.length ? roundOne(totalPhotos / completedTrips.length) : 0,
    averagePhotosPerTravelDay: travelDays ? roundOne(totalPhotos / travelDays) : 0,
    tripWithMostPhotos: maxBy(completedTrips, (trip) => trip.photoCount, (trip) => trip.title),
    countryWithMostPhotos: maxBy(countries, (country) => country.photoCount, (country) => country.displayName),
    cityWithMostPhotos: maxBy(cities, (city) => city.photoCount, (city) => city.cityName),
    favoriteEntryPhotoCount: new Set([...journals.values()].flatMap((journal) => [...journal.favoritePhotoIds])).size
  };
}

function deriveJournalInsights(
  drafts: readonly TripDraft[],
  completedTrips: readonly TravelInsightsTrip[],
  journals: ReadonlyMap<string, DraftJournalStats>,
  countries: readonly TravelInsightsCountry[]
): TravelInsightsJournalInsights {
  const journalValues = [...journals.values()];
  const tripsWithJournals = [...journals.entries()].filter(([, journal]) => journal.totalEntries > 0);
  const totalEntries = sum(journalValues.map((journal) => journal.totalEntries));
  const longest = [...journals.entries()].flatMap(([tripDraftId, journal]) => {
    const draft = drafts.find((item) => item.id === tripDraftId);
    return journal.longestEntry && draft ? [{ tripDraftId, tripTitle: draft.name, ...journal.longestEntry }] : [];
  }).sort((a, b) => b.characterCount - a.characterCount || a.tripTitle.localeCompare(b.tripTitle))[0];
  const tripWithMostEntries = tripsWithJournals
    .map(([tripDraftId, journal]) => ({ tripDraftId, tripTitle: drafts.find((draft) => draft.id === tripDraftId)?.name || "Untitled trip", entryCount: journal.totalEntries }))
    .sort((a, b) => b.entryCount - a.entryCount || a.tripTitle.localeCompare(b.tripTitle))[0];
  const completedTripIdsWithJournals = new Set(completedTrips.filter((trip) => (journals.get(trip.tripDraftId)?.totalEntries || 0) > 0).map((trip) => trip.tripDraftId));
  return {
    totalEntries,
    draftEntries: sum(journalValues.map((journal) => journal.draftEntries)),
    completedEntries: sum(journalValues.map((journal) => journal.completedEntries)),
    favoriteEntries: sum(journalValues.map((journal) => journal.favoriteEntries)),
    tripsWithJournals: tripsWithJournals.length,
    completedTripsWithoutJournals: completedTrips.filter((trip) => !completedTripIdsWithJournals.has(trip.tripDraftId)).length,
    averageEntriesPerJournaledTrip: tripsWithJournals.length ? roundOne(totalEntries / tripsWithJournals.length) : 0,
    averageEntryLength: totalEntries ? roundOne(sum(drafts.flatMap((draft) => (draft.journalEntries || []).map((entry) => entry.body.length))) / totalEntries) : 0,
    longestEntry: longest,
    tripWithMostEntries,
    countriesWithoutJournals: countries.filter((country) => !country.tripIds.some((tripId) => completedTripIdsWithJournals.has(tripId))).length
  };
}

function deriveSeasonInsights(trips: readonly TravelInsightsTrip[]): TravelInsightsSeasonEntry[] {
  const eligibleTrips = trips.filter((trip) => trip.season);
  return SEASONS.map((season) => {
    const related = eligibleTrips.filter((trip) => trip.season === season);
    return {
      season,
      tripCount: related.length,
      travelDayCount: sum(related.map((trip) => trip.durationDays)),
      shareOfTrips: eligibleTrips.length ? roundOne(related.length / eligibleTrips.length) : 0
    };
  });
}

function deriveMonthInsights(trips: readonly TravelInsightsTrip[]): TravelInsightsMonthEntry[] {
  return MONTH_NUMBERS.map((month) => {
    const related = trips.filter((trip) => trip.startDate && monthFromDate(trip.startDate) === month);
    return {
      month,
      tripCount: related.length,
      travelDayCount: sum(related.map((trip) => trip.durationDays)),
      visitedPlaceCount: sum(related.map((trip) => trip.visitedPlaceCount))
    };
  });
}

function deriveTimelineInsights(trips: readonly TravelInsightsTrip[], yearlyActivity: readonly TravelInsightsYearEntry[]): TravelInsightsTimeline {
  const datedTrips = trips.filter((trip) => trip.startDate || trip.endDate).sort(sortTripsOldest);
  return {
    firstTrip: datedTrips[0],
    latestTrip: [...datedTrips].sort(sortTripsMostRecent)[0],
    longestGapDays: longestGapDays(datedTrips),
    mostActiveYear: [...yearlyActivity].sort(sortMostActiveYear)[0],
    tripsPerYear: [...yearlyActivity],
    countriesPerYear: [...yearlyActivity],
    citiesPerYear: [...yearlyActivity]
  };
}

function deriveStreaks(years: readonly TravelInsightsYearEntry[], countries: readonly TravelInsightsCountry[], cities: readonly TravelInsightsCity[]): TravelInsightsStreaks {
  const activeYears = years.map((year) => year.year).sort((a, b) => a - b);
  return {
    activeYears,
    longestConsecutiveYearStreak: longestConsecutiveStreak(activeYears),
    currentConsecutiveYearStreak: trailingConsecutiveStreak(activeYears),
    countriesRevisited: countries.filter((country) => country.returnVisits > 0).length,
    citiesRevisited: cities.filter((city) => city.tripCount > 1).length
  };
}

function deriveFavoriteDestinations(countries: readonly TravelInsightsCountry[], cities: readonly TravelInsightsCity[]): TravelInsightsFavoriteDestination[] {
  const countryEntries = countries.map((country): TravelInsightsFavoriteDestination => ({
    id: country.countryCode,
    type: "country",
    displayName: country.displayName,
    tripCount: country.tripCount,
    returnVisits: country.returnVisits,
    favoriteEntryCount: country.favoriteEntryCount,
    photoCount: country.photoCount,
    visitedPlaceCount: country.visitedPlaceCount
  }));
  const cityEntries = cities.map((city): TravelInsightsFavoriteDestination => ({
    id: city.id,
    type: "city",
    displayName: city.countryName ? `${city.cityName}, ${city.countryName}` : city.cityName,
    tripCount: city.tripCount,
    returnVisits: Math.max(city.tripCount - 1, 0),
    favoriteEntryCount: city.favoriteEntryCount,
    photoCount: city.photoCount,
    visitedPlaceCount: city.visitedPlaceCount
  }));
  return [...countryEntries, ...cityEntries]
    .filter((item) => item.returnVisits > 0 || item.favoriteEntryCount > 0 || item.photoCount > 0 || item.visitedPlaceCount > 0)
    .sort((a, b) => favoriteDestinationWeight(b) - favoriteDestinationWeight(a) || a.displayName.localeCompare(b.displayName))
    .slice(0, 8);
}

function updateYearActivity(yearMap: Map<number, YearAccumulator>, trip: TravelInsightsTrip) {
  if (!trip.year) return;
  const year = yearMap.get(trip.year) || {
    year: trip.year,
    tripCount: 0,
    countryCount: 0,
    cityCount: 0,
    visitedPlaceCount: 0,
    travelDayCount: 0,
    photoCount: 0,
    journalEntryCount: 0,
    favoriteEntryCount: 0,
    countryCodes: new Set<string>(),
    cityKeys: new Set<string>()
  };
  year.tripCount += 1;
  trip.countryCodes.forEach((countryCode) => year.countryCodes.add(countryCode));
  trip.cityKeys.forEach((cityKey) => year.cityKeys.add(cityKey));
  year.visitedPlaceCount += trip.visitedPlaceCount;
  year.travelDayCount += trip.durationDays;
  year.photoCount += trip.photoCount;
  year.journalEntryCount += trip.journalEntryCount;
  year.favoriteEntryCount += trip.favoriteEntryCount;
  yearMap.set(trip.year, year);
}

function finalizeYear(year: YearAccumulator): TravelInsightsYearEntry {
  return {
    year: year.year,
    tripCount: year.tripCount,
    countryCount: year.countryCodes.size,
    cityCount: year.cityKeys.size,
    visitedPlaceCount: year.visitedPlaceCount,
    travelDayCount: year.travelDayCount,
    photoCount: year.photoCount,
    journalEntryCount: year.journalEntryCount,
    favoriteEntryCount: year.favoriteEntryCount
  };
}

function seasonForMonth(month: number): TravelInsightSeason {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

function monthFromDate(value: string) {
  return Number(value.slice(5, 7));
}

function calculateDuration(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return 0;
  return getTripDurationDays(startDate, endDate) || 0;
}

function validTripDuration(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return false;
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) return false;
  return calculateDuration(startDate, endDate) > 0;
}

function longestGapDays(trips: readonly TravelInsightsTrip[]) {
  if (trips.length < 2) return undefined;
  let longest = 0;
  for (let index = 1; index < trips.length; index += 1) {
    const previous = trips[index - 1].endDate || trips[index - 1].startDate;
    const next = trips[index].startDate || trips[index].endDate;
    if (!previous || !next) continue;
    const gap = dateDayNumber(next) - dateDayNumber(previous);
    if (gap > longest) longest = gap;
  }
  return longest || undefined;
}

function dateDayNumber(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function longestConsecutiveStreak(years: readonly number[]) {
  let best = 0;
  let current = 0;
  let previous: number | undefined;
  for (const year of years) {
    current = previous === undefined || year === previous + 1 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = year;
  }
  return best;
}

function trailingConsecutiveStreak(years: readonly number[]) {
  if (years.length === 0) return 0;
  let streak = 1;
  for (let index = years.length - 1; index > 0; index -= 1) {
    if (years[index] !== years[index - 1] + 1) break;
    streak += 1;
  }
  return streak;
}

function uniqueDestinationPhotoCount(trips: readonly TravelInsightsTrip[]) {
  return sum(trips.map((trip) => trip.photoCount));
}

function pickMostActiveSeason(seasons: readonly TravelInsightsSeasonEntry[]) {
  return [...seasons].filter((season) => season.tripCount > 0).sort((a, b) => b.tripCount - a.tripCount || b.travelDayCount - a.travelDayCount || SEASONS.indexOf(a.season) - SEASONS.indexOf(b.season))[0];
}

function pickMostActiveMonth(months: readonly TravelInsightsMonthEntry[]) {
  return [...months].filter((month) => month.tripCount > 0).sort((a, b) => b.tripCount - a.tripCount || b.travelDayCount - a.travelDayCount || a.month - b.month)[0];
}

function pickQuietestRecordedMonth(months: readonly TravelInsightsMonthEntry[]) {
  const active = months.filter((month) => month.tripCount > 0);
  return active.length > 1 ? active.sort((a, b) => a.tripCount - b.tripCount || a.travelDayCount - b.travelDayCount || a.month - b.month)[0] : undefined;
}

function maxBy<T>(items: readonly T[], metric: (item: T) => number, tie: (item: T) => string): T | undefined {
  return [...items].filter((item) => metric(item) > 0).sort((a, b) => metric(b) - metric(a) || tie(a).localeCompare(tie(b)))[0];
}

function favoriteDestinationWeight(destination: TravelInsightsFavoriteDestination) {
  return destination.returnVisits * 4 + destination.favoriteEntryCount * 3 + destination.photoCount + destination.visitedPlaceCount;
}

function sortCountriesByTrips(left: TravelInsightsCountry, right: TravelInsightsCountry) {
  return right.tripCount - left.tripCount || right.travelDayCount - left.travelDayCount || left.displayName.localeCompare(right.displayName);
}

function sortCitiesByTrips(left: TravelInsightsCity, right: TravelInsightsCity) {
  return right.tripCount - left.tripCount || right.travelDayCount - left.travelDayCount || left.cityName.localeCompare(right.cityName);
}

function sortTripsMostRecent(left: TravelInsightsTrip, right: TravelInsightsTrip) {
  const leftDate = left.endDate || left.startDate;
  const rightDate = right.endDate || right.startDate;
  if (leftDate && rightDate && leftDate !== rightDate) return compareIsoDates(rightDate, leftDate);
  if (leftDate && !rightDate) return -1;
  if (!leftDate && rightDate) return 1;
  return left.title.localeCompare(right.title);
}

function sortTripsOldest(left: TravelInsightsTrip, right: TravelInsightsTrip) {
  return -sortTripsMostRecent(left, right);
}

function sortYearsDescending(left: TravelInsightsYearEntry, right: TravelInsightsYearEntry) {
  return right.year - left.year;
}

function sortMostActiveYear(left: TravelInsightsYearEntry, right: TravelInsightsYearEntry) {
  return right.tripCount - left.tripCount
    || right.travelDayCount - left.travelDayCount
    || right.visitedPlaceCount - left.visitedPlaceCount
    || right.countryCount - left.countryCount
    || right.year - left.year;
}

function roundOne(value: number) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
}

function sum(values: readonly number[]) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}
