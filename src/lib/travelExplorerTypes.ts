import type { TravelInsights } from "./travelInsightsTypes";
import type { TravelPassport } from "./travelPassportTypes";
import type { TripDraft } from "./tripDrafts";

export type ExplorerTravelStatus = "visited" | "planned" | "wishlist";

export type ExplorerCoordinate = {
  latitude: number;
  longitude: number;
};

export type ExplorerCoordinateSource =
  | "place"
  | "destination"
  | "city-centroid"
  | "country-centroid"
  | "none";

export type TravelExplorerBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type TravelExplorerSummary = {
  totalCountries: number;
  visitedCountries: number;
  plannedCountries: number;
  wishlistCountries: number;
  totalCities: number;
  visitedCities: number;
  plannedCities: number;
  totalMappedPlaces: number;
  visitedPlaces: number;
  plannedPlaces: number;
  tripsWithCoordinates: number;
  routesAvailable: number;
  earliestTravelYear: number | null;
  latestTravelYear: number | null;
};

export type TravelExplorerCountry = {
  id: string;
  countryCode: string | null;
  countryName: string;
  normalizedCountryKey: string;
  status: ExplorerTravelStatus;
  hasCompletedTrips: boolean;
  hasPlannedTrips: boolean;
  hasWishlistReferences: boolean;
  isReturnDestination: boolean;
  tripIds: string[];
  completedTripIds: string[];
  plannedTripIds: string[];
  cityIds: string[];
  placeIds: string[];
  journalEntryCount: number;
  photoCount: number;
  favoriteMemoryCount: number;
  visitCount: number;
  firstVisitDate: string | null;
  latestVisitDate: string | null;
  nextPlannedDate: string | null;
  coordinates: ExplorerCoordinate | null;
  coordinateSource: ExplorerCoordinateSource;
};

export type TravelExplorerCity = {
  id: string;
  cityName: string;
  normalizedCityKey: string;
  countryId: string | null;
  countryCode: string | null;
  countryName: string | null;
  status: ExplorerTravelStatus;
  hasCompletedTrips: boolean;
  hasPlannedTrips: boolean;
  hasWishlistReferences: boolean;
  isReturnDestination: boolean;
  tripIds: string[];
  completedTripIds: string[];
  plannedTripIds: string[];
  placeIds: string[];
  journalEntryCount: number;
  photoCount: number;
  favoriteMemoryCount: number;
  firstVisitDate: string | null;
  latestVisitDate: string | null;
  nextPlannedDate: string | null;
  coordinates: ExplorerCoordinate | null;
  coordinateSource: ExplorerCoordinateSource;
};

export type TravelExplorerPlace = {
  id: string;
  name: string;
  cityId: string | null;
  countryId: string | null;
  status: ExplorerTravelStatus;
  visitStatus: string | null;
  tripIds: string[];
  coordinates: ExplorerCoordinate | null;
  photoCount: number;
  journalReferenceCount: number;
};

export type TravelExplorerTrip = {
  id: string;
  title: string;
  status: "completed" | "planned";
  startDate: string | null;
  endDate: string | null;
  year: number | null;
  countryIds: string[];
  cityIds: string[];
  placeIds: string[];
  routePointIds: string[];
  routeAvailable: boolean;
  bounds: TravelExplorerBounds | null;
};

export type TravelExplorerRoutePoint = {
  id: string;
  order: number;
  label: string;
  countryId: string | null;
  cityId: string | null;
  placeId: string | null;
  date: string | null;
  coordinates: ExplorerCoordinate;
};

export type TravelExplorerRoute = {
  id: string;
  tripId: string;
  status: "completed" | "planned";
  points: TravelExplorerRoutePoint[];
  segmentCount: number;
  isComplete: boolean;
  bounds: TravelExplorerBounds | null;
  unresolvedRoutePoints: number;
  crossesAntimeridian: boolean;
};

export type TravelExplorerYear = {
  year: number;
  completedTripIds: string[];
  plannedTripIds: string[];
  countryIds: string[];
  cityIds: string[];
  routeIds: string[];
  visitedCountryCount: number;
  plannedCountryCount: number;
};

export type TravelExplorerLayers = {
  visitedCountryIds: string[];
  plannedCountryIds: string[];
  wishlistCountryIds: string[];
  visitedCityIds: string[];
  plannedCityIds: string[];
  wishlistCityIds: string[];
  completedRouteIds: string[];
  plannedRouteIds: string[];
};

export type TravelExplorerDataQuality = {
  unresolvedCountries: number;
  unresolvedCities: number;
  missingCoordinates: number;
  invalidCoordinates: number;
  tripsWithoutMapPoints: number;
  partiallyMappedRoutes: number;
  unmatchedCountryGeometry: number;
  duplicateDestinationReferences: number;
  ambiguousCityReferences: number;
};

export type TravelExplorer = {
  summary: TravelExplorerSummary;
  countries: TravelExplorerCountry[];
  cities: TravelExplorerCity[];
  places: TravelExplorerPlace[];
  trips: TravelExplorerTrip[];
  routes: TravelExplorerRoute[];
  years: TravelExplorerYear[];
  layers: TravelExplorerLayers;
  bounds: TravelExplorerBounds | null;
  dataQuality: TravelExplorerDataQuality;
};

export type DeriveTravelExplorerInput = {
  trips: readonly TripDraft[];
  passport: TravelPassport;
  insights: TravelInsights;
  currentDate?: string;
};
