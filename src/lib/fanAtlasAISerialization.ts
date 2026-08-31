import type { SafeTravelContextSnapshot } from "./fanAtlasAIContracts";
import type { TravelExplorer } from "./travelExplorerTypes";
import type { TravelInsights } from "./travelInsightsTypes";
import type { TravelPassport } from "./travelPassportTypes";
import type { TripDraft } from "./tripDrafts";

export function buildSafeAIContextSnapshot(input: {
  trip?: TripDraft;
  passport?: TravelPassport;
  insights?: TravelInsights;
  explorer?: TravelExplorer;
}): SafeTravelContextSnapshot {
  const trip = input.trip;
  const photoIds = new Set<string>();
  trip?.placeReferences.forEach((place) => place.photoIds?.forEach((id) => photoIds.add(id)));
  trip?.journalEntries?.forEach((entry) => entry.photoIds.forEach((id) => photoIds.add(id)));
  return {
    activeTrip: trip ? {
      id: trip.id,
      title: trip.name,
      status: trip.completionStatus || trip.status,
      startDate: trip.travelDates?.startDate,
      endDate: trip.travelDates?.endDate,
      destinationLabel: trip.destination?.label,
      itineraryDayCount: trip.itineraryDays.length,
      plannedPlaceCount: trip.placeReferences.filter((place) => place.visitStatus !== "visited").length,
      visitedPlaceCount: trip.placeReferences.filter((place) => place.visitStatus === "visited").length,
      journalEntryCount: trip.journalEntries?.length || 0,
      photoCount: photoIds.size
    } : undefined,
    passport: input.passport ? {
      visitedCountryCount: input.passport.summary.totalCountriesVisited,
      visitedCityCount: input.passport.summary.totalCitiesVisited
    } : undefined,
    insights: input.insights ? {
      completedTrips: input.insights.summary.completedTrips,
      averageTripLength: input.insights.summary.averageTripLength,
      topCountries: input.insights.countryInsights.slice(0, 3).map((country) => country.displayName)
    } : undefined,
    explorer: input.explorer ? {
      countryCount: input.explorer.summary.totalCountries,
      cityCount: input.explorer.summary.totalCities,
      routeCount: input.explorer.routes.length
    } : undefined
  };
}
