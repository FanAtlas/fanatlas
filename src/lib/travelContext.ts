import type { TripDraft } from "./tripDrafts";
import { DEFAULT_TRAVEL_CONTEXT_PERMISSIONS, canIncludeField, scopesInclude, taskRequiresCurrentInformation } from "./travelContextPolicy";
import type {
  BuildTravelContextInput,
  TravelContext,
  TravelContextPrivacySummary,
  TravelContextProvenance,
  TravelContextSummary,
  TravelContextText,
  TravelContextWarning,
  TravelDestinationContext,
  TravelIntelligenceRequest,
  TravelLocationContextValue,
  TravelPrivacyClass,
  TravelTripContext
} from "./travelIntelligenceTypes";
import { TRAVEL_CONTEXT_SCHEMA_VERSION } from "./travelIntelligenceTypes";

const PRIVACY_RANK: Record<TravelPrivacyClass, number> = {
  public: 0,
  application: 1,
  personal: 2,
  sensitive: 3,
  highly_sensitive: 4
};

export function createTravelIntelligenceRequest(
  overrides: Omit<Partial<TravelIntelligenceRequest>, "permissions"> & Pick<TravelIntelligenceRequest, "id" | "task"> & {
    permissions?: Partial<TravelIntelligenceRequest["permissions"]>;
  }
): TravelIntelligenceRequest {
  const task = overrides.task;
  return {
    id: overrides.id,
    task,
    scope: overrides.scope || ["none"],
    userIntent: overrides.userIntent || {
      normalizedIntent: task,
      task,
      urgency: "normal",
      destinationIds: [],
      tripIds: [],
      requestedOutput: "plain_text",
      requiresCurrentInformation: taskRequiresCurrentInformation(task),
      requiresUserPrivateContext: false,
      requiresExternalTools: taskRequiresCurrentInformation(task)
    },
    permissions: { ...DEFAULT_TRAVEL_CONTEXT_PERMISSIONS, ...overrides.permissions },
    constraints: overrides.constraints || {
      usagePolicy: {
        mode: "balanced",
        maxCostClass: "medium",
        maxToolCalls: 2,
        allowFallback: true,
        allowExternalResearch: false,
        allowImageAnalysis: false,
        allowDocumentAnalysis: false
      },
      maxContextCharacters: 8000,
      allowSensitiveContext: false,
      allowHighStakesWithoutCurrentInfo: false
    },
    locale: overrides.locale || "en",
    timezone: overrides.timezone,
    createdAt: overrides.createdAt || "2026-01-01T00:00:00.000Z"
  };
}

export function buildTravelContext(input: BuildTravelContextInput): TravelContext {
  const request = input.request;
  const warnings: TravelContextWarning[] = [];
  const provenance: TravelContextProvenance[] = [];
  const destinations: TravelDestinationContext[] = [];
  const selectedTrip = selectTrip(input.trips || [], request.userIntent.tripIds[0]);
  let excludedSensitiveFields = 0;

  if (taskRequiresCurrentInformation(request.task)) {
    warnings.push(warning("current_information_required", "travelIntelligence.warning.currentInformationRequired", "warning"));
  }

  const context: TravelContext = {
    schemaVersion: TRAVEL_CONTEXT_SCHEMA_VERSION,
    requestId: request.id,
    destinations,
    provenance,
    privacy: emptyPrivacy(),
    warnings,
    estimatedCharacters: 0
  };

  if (scopesInclude(request.scope, "current_user")) {
    if (request.permissions.allowProfilePreferences && input.profile) {
      context.user = clonePlain(input.profile);
      provenance.push(included("profile", "profile.preferences", "personal", "profile preferences allowed"));
    } else {
      provenance.push(excluded("profile", "profile.preferences", "personal", "profile preferences denied"));
      warnings.push(warning("permission_denied", "travelIntelligence.warning.permissionDenied", "info"));
    }
  }

  if (scopesInclude(request.scope, "selected_trip") || scopesInclude(request.scope, "current_trip")) {
    if (!selectedTrip) {
      warnings.push(warning("missing_trip", "travelIntelligence.warning.missingTrip", "warning"));
    } else if (request.permissions.allowCurrentTrip) {
      context.trip = projectTrip(selectedTrip, request, warnings);
      context.itinerary = request.permissions.allowItinerary ? context.trip.itinerarySummary : undefined;
      destinations.push(...context.trip.destinations);
      provenance.push(included("trip_drafts", "trip", "personal", "selected trip projection"));
    } else {
      provenance.push(excluded("trip_drafts", "trip", "personal", "current trip permission denied"));
      warnings.push(warning("permission_denied", "travelIntelligence.warning.permissionDenied", "warning"));
    }
  }

  if (scopesInclude(request.scope, "selected_destination")) {
    const selectedDestinationIds = new Set(request.userIntent.destinationIds);
    const explorerDestinations = input.explorer?.countries
      .filter((country) => selectedDestinationIds.size === 0 || selectedDestinationIds.has(country.id) || selectedDestinationIds.has(country.countryCode || ""))
      .map((country) => ({
        id: country.id,
        countryCode: country.countryCode || undefined,
        canonicalCountryName: country.countryName,
        localizedDisplayName: country.countryName,
        travelStatus: country.status,
        plannedDates: { startDate: country.nextPlannedDate || undefined },
        visitHistory: {
          firstVisitDate: country.firstVisitDate || undefined,
          latestVisitDate: country.latestVisitDate || undefined,
          visitCount: country.visitCount,
          returnDestination: country.isReturnDestination
        },
        coordinates: country.coordinates
          ? { latitude: country.coordinates.latitude, longitude: country.coordinates.longitude, precision: "approximate" as const }
          : undefined
      })) || [];
    destinations.push(...explorerDestinations);
    if (explorerDestinations.length === 0) warnings.push(warning("missing_destination", "travelIntelligence.warning.missingDestination", "warning"));
    provenance.push(included("explorer", "countries", "personal", "selected destination projection"));
  }

  if (scopesInclude(request.scope, "passport_history")) {
    if (request.permissions.allowPassport && input.passport) {
      context.passport = {
        visitedCountryCount: input.passport.summary.totalCountriesVisited,
        visitedCityCount: input.passport.summary.totalCitiesVisited,
        selectedDestinationHistory: destinations.map((destination) => ({ ...destination }))
      };
      provenance.push(included("passport", "summary", "personal", "passport summary allowed"));
    } else {
      provenance.push(excluded("passport", "summary", "personal", "passport permission denied"));
    }
  }

  if (scopesInclude(request.scope, "travel_insights")) {
    if (request.permissions.allowInsights && input.insights) {
      context.insights = {
        averageTripDuration: input.insights.summary.averageTripLength,
        travelFrequencyYears: input.insights.summary.yearsTraveling,
        mostVisitedCountries: input.insights.countryInsights.slice(0, 3).map((country) => country.displayName),
        mostVisitedCities: input.insights.cityInsights.slice(0, 3).map((city) => city.cityName),
        seasonalPatterns: input.insights.seasonInsights.filter((season) => season.tripCount > 0).map((season) => season.season)
      };
      provenance.push(included("insights", "summary", "personal", "insights projection allowed"));
    } else {
      provenance.push(excluded("insights", "summary", "personal", "insights permission denied"));
    }
  }

  if (scopesInclude(request.scope, "saved_places")) {
    if (request.permissions.allowSavedPlaces) {
      const savedPlaces = (input.savedPlaces || []).slice(0, 20);
      context.savedPlaces = {
        count: input.savedPlaces?.length || 0,
        places: savedPlaces.map((place) => ({
          id: place.id,
          name: userText(place.name, "saved_places"),
          type: place.type,
          city: place.city,
          country: place.country
        }))
      };
      provenance.push(included("saved_places", "places", "personal", "saved places projection allowed"));
    } else {
      provenance.push(excluded("saved_places", "places", "personal", "saved places permission denied"));
    }
  }

  if (scopesInclude(request.scope, "journal_metadata") || scopesInclude(request.scope, "journal_content")) {
    if (selectedTrip?.journalEntries && request.permissions.allowJournalMetadata) {
      const allowBody = scopesInclude(request.scope, "journal_content")
        && request.permissions.allowJournalContent
        && request.constraints.allowSensitiveContext
        && canIncludeField("journal.body", request.task, true);
      if (scopesInclude(request.scope, "journal_content") && !allowBody) {
        excludedSensitiveFields += selectedTrip.journalEntries.length;
        warnings.push(warning("sensitive_context_excluded", "travelIntelligence.warning.sensitiveContextExcluded", "warning"));
      }
      context.journal = {
        entryCount: selectedTrip.journalEntries.length,
        favoriteCount: selectedTrip.journalEntries.filter((entry) => entry.favorite).length,
        entries: selectedTrip.journalEntries.map((entry) => ({
          id: entry.id,
          title: entry.title ? userText(entry.title, "journal") : undefined,
          body: allowBody && entry.body ? userText(entry.body, "journal") : undefined,
          entryDate: entry.entryDate,
          favorite: entry.favorite,
          status: entry.status
        }))
      };
      provenance.push(included("journal", allowBody ? "journal.metadata_and_body" : "journal.metadata", allowBody ? "sensitive" : "personal", "journal projection minimized"));
    } else {
      provenance.push(excluded("journal", "journal", "sensitive", "journal permission denied or unavailable"));
    }
  }

  if (scopesInclude(request.scope, "memory_metadata") && selectedTrip) {
    if (request.permissions.allowMemoryMetadata) {
      const photoCount = countPhotos(selectedTrip);
      context.memories = {
        photoCount,
        favoriteCount: selectedTrip.journalEntries?.filter((entry) => entry.favorite).length || 0,
        tripIds: [selectedTrip.id],
        destinationIds: destinations.map((destination) => destination.id)
      };
      provenance.push(included("memory_gallery", "memory.metadata", "personal", "memory metadata counts allowed"));
    } else {
      provenance.push(excluded("memory_gallery", "memory.metadata", "personal", "memory metadata denied"));
    }
  }

  if (scopesInclude(request.scope, "current_location") || scopesInclude(request.scope, "emergency_context")) {
    context.location = minimizeLocation(input.currentLocation, request, warnings);
    if (context.location) provenance.push(included("current_location", "location", context.location.precision === "precise" ? "sensitive" : "personal", "location minimized"));
  }

  if (scopesInclude(request.scope, "uploaded_document")) {
    if (request.permissions.allowUploadedDocuments && request.constraints.allowSensitiveContext) {
      context.documents = (input.documents || []).map((document) => ({ ...document, name: { ...document.name } }));
      provenance.push(included("user_message", "documents.metadata", "sensitive", "document metadata allowed"));
    } else {
      warnings.push(warning("sensitive_context_excluded", "travelIntelligence.warning.sensitiveContextExcluded", "warning"));
      provenance.push(excluded("user_message", "documents", "sensitive", "document permission denied"));
    }
  }

  context.estimatedCharacters = estimateContextCharacters(context);
  if (context.estimatedCharacters > request.constraints.maxContextCharacters) {
    const trimmed = trimTravelContext(context, request.constraints.maxContextCharacters);
    trimmed.warnings.push(warning("context_trimmed", "travelIntelligence.warning.contextTrimmed", "info"));
    trimmed.privacy = summarizePrivacy(trimmed.provenance, excludedSensitiveFields);
    return trimmed;
  }

  context.privacy = summarizePrivacy(provenance, excludedSensitiveFields);
  return context;
}

export function summarizeTravelContext(context: TravelContext): TravelContextSummary {
  return {
    hasUserPreferences: Boolean(context.user),
    hasTrip: Boolean(context.trip),
    destinationCount: context.destinations.length,
    hasDates: Boolean(context.trip?.startDate || context.trip?.endDate),
    hasItinerary: Boolean(context.itinerary),
    hasTravelHistory: Boolean(context.passport || context.insights),
    hasCurrentLocation: Boolean(context.location),
    includesSensitiveData: context.privacy.includesSensitiveData,
    estimatedSize: context.estimatedCharacters
  };
}

export function trimTravelContext(context: TravelContext, maxCharacters: number): TravelContext {
  const trimmed: TravelContext = clonePlain(context);
  if (estimateContextCharacters(trimmed) <= maxCharacters) return trimmed;

  trimmed.memories = undefined;
  trimmed.provenance.push(excluded("memory_gallery", "memory.metadata", "personal", "trimmed by context budget"));
  if (estimateContextCharacters(trimmed) <= maxCharacters) {
    trimmed.estimatedCharacters = estimateContextCharacters(trimmed);
    return trimmed;
  }

  if (trimmed.savedPlaces) {
    trimmed.savedPlaces = { ...trimmed.savedPlaces, places: trimmed.savedPlaces.places.slice(0, 5) };
    trimmed.provenance.push(excluded("saved_places", "places.overflow", "personal", "trimmed by context budget"));
  }
  if (estimateContextCharacters(trimmed) <= maxCharacters) {
    trimmed.estimatedCharacters = estimateContextCharacters(trimmed);
    return trimmed;
  }

  if (trimmed.journal?.entries) {
    trimmed.journal = { ...trimmed.journal, entries: trimmed.journal.entries.map((entry) => ({ ...entry, body: undefined })) };
    trimmed.provenance.push(excluded("journal", "journal.body", "sensitive", "trimmed by context budget"));
  }
  trimmed.estimatedCharacters = estimateContextCharacters(trimmed);
  return trimmed;
}

export function estimateContextCharacters(context: TravelContext) {
  return JSON.stringify(context, (_key, value) => typeof value === "string" && value.length > 240 ? `${value.slice(0, 240)}...` : value).length;
}

function projectTrip(trip: TripDraft, request: TravelIntelligenceRequest, warnings: TravelContextWarning[]): TravelTripContext {
  if (!trip.travelDates?.startDate) warnings.push(warning("missing_dates", "travelIntelligence.warning.missingDates", "info"));
  const includeDates = canIncludeField("trip.travelDates", request.task, request.permissions.allowCurrentTrip && request.constraints.allowSensitiveContext);
  const includeItinerary = request.permissions.allowItinerary && canIncludeField("trip.itinerary", request.task, request.permissions.allowItinerary);
  return {
    id: trip.id,
    title: userText(trip.name, "trip_drafts"),
    status: trip.completionStatus === "completed" ? "completed" : trip.status === "archived" ? "archived" : trip.status === "planned" ? "planned" : "draft",
    startDate: includeDates ? trip.travelDates?.startDate : undefined,
    endDate: includeDates ? trip.travelDates?.endDate : undefined,
    destinations: trip.destination ? [destinationFromTrip(trip)] : [],
    itinerarySummary: includeItinerary ? {
      dayCount: trip.itineraryDays.length,
      plannedPlaceCount: trip.placeReferences.filter((place) => place.visitStatus !== "visited").length,
      visitedPlaceCount: trip.placeReferences.filter((place) => place.visitStatus === "visited").length,
      plannedActivities: (trip.planningActions || []).slice(0, 10).map((action) => userText(action.text, "trip_drafts"))
    } : undefined,
    completionStatus: trip.completionStatus
  };
}

function destinationFromTrip(trip: TripDraft): TravelDestinationContext {
  return {
    id: trip.destination?.countryCode || trip.destination?.label || trip.id,
    countryCode: trip.destination?.countryCode,
    canonicalCountryName: trip.destination?.country,
    localizedDisplayName: trip.destination?.country || trip.destination?.label,
    city: trip.destination?.city,
    travelStatus: trip.completionStatus === "completed" ? "visited" : "planned",
    plannedDates: { startDate: trip.travelDates?.startDate, endDate: trip.travelDates?.endDate }
  };
}

function minimizeLocation(location: TravelLocationContextValue | undefined, request: TravelIntelligenceRequest, warnings: TravelContextWarning[]) {
  if (!location || !request.permissions.allowCurrentLocation) return undefined;
  if (request.task === "emergency_guidance" && request.constraints.allowSensitiveContext && location.precision === "precise") {
    return clonePlain(location);
  }
  if (location.precision === "precise" || location.latitude !== undefined || location.longitude !== undefined) {
    warnings.push(warning("location_precision_reduced", "travelIntelligence.warning.locationPrecisionReduced", "warning"));
  }
  return {
    precision: location.city ? "city" as const : location.region ? "region" as const : location.countryCode ? "country" as const : "none" as const,
    countryCode: location.countryCode,
    region: location.region,
    city: location.city
  };
}

function countPhotos(trip: TripDraft) {
  const ids = new Set<string>();
  trip.placeReferences.forEach((place) => place.photoIds?.forEach((id) => ids.add(id)));
  trip.journalEntries?.forEach((entry) => entry.photoIds.forEach((id) => ids.add(id)));
  return ids.size;
}

function selectTrip(trips: readonly TripDraft[], tripId?: string) {
  if (tripId) return trips.find((trip) => trip.id === tripId);
  return trips[0];
}

function userText(value: string, source: TravelContextText["source"]): TravelContextText {
  return { value, source, trust: "user_authored" };
}

function warning(code: TravelContextWarning["code"], messageKey: string, severity: TravelContextWarning["severity"]): TravelContextWarning {
  return { code, messageKey, severity };
}

function included(source: TravelContextProvenance["source"], path: string, classification: TravelPrivacyClass, reason: string): TravelContextProvenance {
  return { source, path, classification, included: true, reason };
}

function excluded(source: TravelContextProvenance["source"], path: string, classification: TravelPrivacyClass, reason: string): TravelContextProvenance {
  return { source, path, classification, included: false, reason };
}

function summarizePrivacy(provenance: readonly TravelContextProvenance[], excludedSensitiveFields: number): TravelContextPrivacySummary {
  const included = provenance.filter((entry) => entry.included);
  const highest = included.reduce<TravelPrivacyClass>((current, entry) => PRIVACY_RANK[entry.classification] > PRIVACY_RANK[current] ? entry.classification : current, "public");
  return {
    highestClassification: highest,
    includesPersonalData: included.some((entry) => PRIVACY_RANK[entry.classification] >= PRIVACY_RANK.personal),
    includesSensitiveData: included.some((entry) => PRIVACY_RANK[entry.classification] >= PRIVACY_RANK.sensitive),
    includesHighlySensitiveData: included.some((entry) => entry.classification === "highly_sensitive"),
    excludedSensitiveFields
  };
}

function emptyPrivacy(): TravelContextPrivacySummary {
  return {
    highestClassification: "public",
    includesPersonalData: false,
    includesSensitiveData: false,
    includesHighlySensitiveData: false,
    excludedSensitiveFields: 0
  };
}

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
