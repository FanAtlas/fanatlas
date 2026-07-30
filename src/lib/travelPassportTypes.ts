export type PassportTripCompletionState = "completed" | "derived_completed" | "planned" | "undetermined";

export type TravelPassportSummary = {
  totalTripsCompleted: number;
  totalCountriesVisited: number;
  totalCitiesVisited: number;
  totalVisitedPlaces: number;
  totalTravelDays: number;
  totalMemories: number;
  firstTravelDate?: string;
  mostRecentTravelDate?: string;
};

export type TravelPassportTripEntry = {
  tripDraftId: string;
  title: string;
  completionState: PassportTripCompletionState;
  startDate?: string;
  endDate?: string;
  completedAt?: string;
  countryCodes: string[];
  countryNames: string[];
  cityKeys: string[];
  cityNames: string[];
  visitedPlaceCount: number;
  memoryCount: number;
  travelDayCount: number;
};

export type TravelPassportCountryEntry = {
  countryCode: string;
  displayName: string;
  firstVisitDate?: string;
  latestVisitDate?: string;
  tripCount: number;
  cityCount: number;
  visitedPlaceCount: number;
  memoryCount: number;
};

export type TravelPassportCityEntry = {
  id: string;
  cityName: string;
  countryCode?: string;
  countryName?: string;
  firstVisitDate?: string;
  latestVisitDate?: string;
  tripCount: number;
  visitedPlaceCount: number;
  memoryCount: number;
};

export type TravelPassportPlaceEntry = {
  tripDraftId: string;
  placeReferenceId: string;
  tripTitle: string;
  displayName: string;
  cityName?: string;
  countryCode?: string;
  countryName?: string;
  category?: string;
  visitDate?: string;
  memoryCount: number;
  unavailable: boolean;
};

export type TravelPassportTimelineEntry = TravelPassportTripEntry & {
  sortDate?: string;
  year?: number;
};

export type TravelPassportStamp = {
  id: string;
  type: "country" | "city" | "trip";
  countryCode?: string;
  cityId?: string;
  tripDraftId?: string;
  displayName: string;
  earnedAt?: string;
};

export type TravelPassportAchievementId =
  | "first_journey"
  | "country_explorer"
  | "city_explorer"
  | "memory_keeper"
  | "travel_regular"
  | "world_wanderer";

export type TravelPassportAchievementMetric = "completedTrips" | "countries" | "cities" | "visitedPlaces" | "memories";

export type TravelPassportAchievement = {
  id: TravelPassportAchievementId;
  titleKey: string;
  descriptionKey: string;
  metric: TravelPassportAchievementMetric;
  current: number;
  target: number;
  completed: boolean;
  earnedAt?: string;
  progressPercent: number;
};

export type TravelPassportYearSummary = {
  year: number;
  completedTripCount: number;
  countryCount: number;
  cityCount: number;
  visitedPlaceCount: number;
  travelDayCount: number;
  memoryCount: number;
};

export type TravelPassportDataQuality = {
  visitedReferencesProcessed: number;
  unresolvedCountryCount: number;
  unresolvedCityCount: number;
  invalidDateCount: number;
  unavailableReferenceCount: number;
  duplicateReferenceCount: number;
  duplicatePhotoOwnershipCount: number;
};

export type TravelPassport = {
  summary: TravelPassportSummary;
  countries: TravelPassportCountryEntry[];
  cities: TravelPassportCityEntry[];
  trips: TravelPassportTripEntry[];
  places: TravelPassportPlaceEntry[];
  timeline: TravelPassportTimelineEntry[];
  yearlySummaries: TravelPassportYearSummary[];
  stamps: TravelPassportStamp[];
  achievements: TravelPassportAchievement[];
  dataQuality: TravelPassportDataQuality;
  generatedAt: string;
};
