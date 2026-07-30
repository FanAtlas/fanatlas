import type { PassportTripCompletionState } from "./travelPassportTypes";

export type TravelInsightSeason = "spring" | "summer" | "autumn" | "winter";

export type TravelInsightsSummary = {
  totalTrips: number;
  completedTrips: number;
  plannedTrips: number;
  countriesVisited: number;
  citiesVisited: number;
  visitedPlaces: number;
  travelDays: number;
  journalEntries: number;
  favoriteMoments: number;
  photos: number;
  averageTripLength: number;
  longestTripDays: number;
  shortestTripDays: number;
  yearsTraveling: number;
};

export type TravelInsightsCountry = {
  countryCode: string;
  displayName: string;
  tripCount: number;
  returnVisits: number;
  cityCount: number;
  visitedPlaceCount: number;
  photoCount: number;
  journalEntryCount: number;
  favoriteEntryCount: number;
  travelDayCount: number;
  firstVisitDate?: string;
  latestVisitDate?: string;
  tripIds: string[];
};

export type TravelInsightsCity = {
  id: string;
  cityName: string;
  countryCode?: string;
  countryName?: string;
  tripCount: number;
  visitedPlaceCount: number;
  photoCount: number;
  journalEntryCount: number;
  favoriteEntryCount: number;
  travelDayCount: number;
  firstVisitDate?: string;
  latestVisitDate?: string;
  tripIds: string[];
};

export type TravelInsightsTrip = {
  tripDraftId: string;
  title: string;
  completionState: PassportTripCompletionState;
  startDate?: string;
  endDate?: string;
  durationDays: number;
  countryCodes: string[];
  countryNames: string[];
  cityKeys: string[];
  cityNames: string[];
  visitedPlaceCount: number;
  photoCount: number;
  journalEntryCount: number;
  favoriteEntryCount: number;
  season?: TravelInsightSeason;
  year?: number;
};

export type TravelInsightsPhotoInsights = {
  totalPhotos: number;
  tripsWithPhotos: number;
  averagePhotosPerCompletedTrip: number;
  averagePhotosPerTravelDay: number;
  tripWithMostPhotos?: TravelInsightsTrip;
  countryWithMostPhotos?: TravelInsightsCountry;
  cityWithMostPhotos?: TravelInsightsCity;
  favoriteEntryPhotoCount: number;
};

export type TravelInsightsJournalInsights = {
  totalEntries: number;
  draftEntries: number;
  completedEntries: number;
  favoriteEntries: number;
  tripsWithJournals: number;
  completedTripsWithoutJournals: number;
  averageEntriesPerJournaledTrip: number;
  averageEntryLength: number;
  longestEntry?: {
    tripDraftId: string;
    tripTitle: string;
    entryId: string;
    characterCount: number;
  };
  tripWithMostEntries?: {
    tripDraftId: string;
    tripTitle: string;
    entryCount: number;
  };
  countriesWithoutJournals: number;
};

export type TravelInsightsSeasonEntry = {
  season: TravelInsightSeason;
  tripCount: number;
  travelDayCount: number;
  shareOfTrips: number;
};

export type TravelInsightsMonthEntry = {
  month: number;
  tripCount: number;
  travelDayCount: number;
  visitedPlaceCount: number;
};

export type TravelInsightsYearEntry = {
  year: number;
  tripCount: number;
  countryCount: number;
  cityCount: number;
  visitedPlaceCount: number;
  travelDayCount: number;
  photoCount: number;
  journalEntryCount: number;
  favoriteEntryCount: number;
};

export type TravelInsightsTimeline = {
  firstTrip?: TravelInsightsTrip;
  latestTrip?: TravelInsightsTrip;
  longestGapDays?: number;
  mostActiveYear?: TravelInsightsYearEntry;
  tripsPerYear: TravelInsightsYearEntry[];
  countriesPerYear: TravelInsightsYearEntry[];
  citiesPerYear: TravelInsightsYearEntry[];
};

export type TravelInsightsStreaks = {
  activeYears: number[];
  longestConsecutiveYearStreak: number;
  currentConsecutiveYearStreak: number;
  countriesRevisited: number;
  citiesRevisited: number;
};

export type TravelInsightsFavoriteDestination = {
  id: string;
  type: "country" | "city";
  displayName: string;
  tripCount: number;
  returnVisits: number;
  favoriteEntryCount: number;
  photoCount: number;
  visitedPlaceCount: number;
};

export type TravelInsightsTravelPatterns = {
  seasons: TravelInsightsSeasonEntry[];
  months: TravelInsightsMonthEntry[];
  mostActiveSeason?: TravelInsightsSeasonEntry;
  mostActiveMonth?: TravelInsightsMonthEntry;
  quietestRecordedMonth?: TravelInsightsMonthEntry;
  favoriteDestinations: TravelInsightsFavoriteDestination[];
  streaks: TravelInsightsStreaks;
};

export type TravelInsightsDataQuality = {
  unknownCountryCount: number;
  unknownCityCount: number;
  missingDateCount: number;
  invalidDateRangeCount: number;
  unavailablePlaceCount: number;
  duplicateReferenceCount: number;
  duplicatePhotoReferenceCount: number;
  brokenJournalLinkCount: number;
  malformedTripCount: number;
};

export type TravelInsights = {
  summary: TravelInsightsSummary;
  travelPatterns: TravelInsightsTravelPatterns;
  countryInsights: TravelInsightsCountry[];
  cityInsights: TravelInsightsCity[];
  tripInsights: TravelInsightsTrip[];
  photoInsights: TravelInsightsPhotoInsights;
  journalInsights: TravelInsightsJournalInsights;
  seasonInsights: TravelInsightsSeasonEntry[];
  monthInsights: TravelInsightsMonthEntry[];
  timelineInsights: TravelInsightsTimeline;
  yearlyActivity: TravelInsightsYearEntry[];
  dataQuality: TravelInsightsDataQuality;
};
