import { compareIsoDates, isValidIsoDate, type TripDraft } from "./tripDrafts";
import { resolveDestinationId } from "./destinationHub";
import { deriveTravelPreparation, type TravelPreparation, type TravelPreparationReadiness } from "./travelPreparation";
import { deriveTripDayExperience, type TripDayProgress } from "./tripDay";
import type { CityIntelligence, CountryIntelligence, DestinationIntelligence } from "./destinationIntelligenceTypes";
import type { ConnectivityStatus } from "./connectivity";

export type TravelHomeState =
  | "no_trip"
  | "planned_trip"
  | "approaching_trip"
  | "departure_day"
  | "active_trip"
  | "day_complete"
  | "ended_trip"
  | "multiple_trips"
  | "undated_trip";

export type TravelHomeActionTarget =
  | { kind: "tab"; tab: "tripDrafts" | "today" | "map" | "explore" | "matches" | "sos" | "passport" | "journal" | "explorer" | "traveltools" | "translator" | "currency" | "guides" | "hotels" | "travelLocation" | "offline" }
  | { kind: "tripDay"; tripId: string }
  | { kind: "preparation"; tripId: string }
  | { kind: "destination"; destinationId: string }
  | { kind: "map"; destinationId: string | null };

export type TravelHomeAction = {
  id: string;
  labelKey: string;
  target: TravelHomeActionTarget;
  kind: "primary" | "secondary";
};

export type TravelHomeNotice = {
  id: string;
  messageKey: string;
  severity: "info" | "attention";
};

export type TravelHomeTripSummary = {
  tripId: string;
  tripName: string;
  destinationId: string | null;
  destinationLabel: string | null;
  startDate: string | null;
  endDate: string | null;
  daysUntilDeparture: number | null;
  daysSinceEnd: number | null;
  dayIndex: number | null;
  dayCount: number | null;
  dayLabel: string | null;
  nextPlaceLabel: string | null;
  progress: TripDayProgress | null;
  preparation: TravelHomePreparationSummary | null;
  destination: TravelHomeDestinationSummary | null;
};

export type TravelHomePreparationSummary = {
  phase: TravelPreparation["phase"];
  readiness: TravelPreparationReadiness;
  attentionCount: number;
  summaryKey: string;
};

export type TravelHomeDestinationSummary = {
  destinationId: string | null;
  countryLabel: string | null;
  cityLabel: string | null;
  currencyCode: string | null;
  languages: string[];
  emergencyAvailable: boolean;
  timezone: string | null;
};

export type TravelHomeHero = {
  tripId: string | null;
  tripName: string | null;
  destinationLabel: string | null;
  dayLabel: string | null;
  nextPlaceLabel: string | null;
  progress: TripDayProgress | null;
  daysUntilDeparture: number | null;
  daysSinceEnd: number | null;
};

export type TravelHomeTripChooser = {
  titleKey: string;
  tripIds: string[];
  trips: TravelHomeTripSummary[];
};

export type TravelHomeOfflineSummary = {
  status: ConnectivityStatus;
  tripEssentialsAvailable: boolean;
  messageKey: string | null;
};

export type TravelHomeViewModel = {
  state: TravelHomeState;
  hero: TravelHomeHero | null;
  primaryAction: TravelHomeAction;
  secondaryActions: TravelHomeAction[];
  notices: TravelHomeNotice[];
  tripSummary: TravelHomeTripSummary | null;
  tripChooser: TravelHomeTripChooser | null;
  todaySummary: TravelHomeTripSummary | null;
  preparationSummary: TravelHomePreparationSummary | null;
  destinationSummary: TravelHomeDestinationSummary | null;
  offlineSummary: TravelHomeOfflineSummary;
};

type TravelHomeInput = {
  trips: readonly TripDraft[];
  intelligence: DestinationIntelligence;
  currentDate?: Date;
  connectivity?: ConnectivityStatus;
};

type CandidateTrip = {
  trip: TripDraft;
  destinationId: string | null;
  destinationLabel: string | null;
  daysUntilDeparture: number | null;
  daysSinceEnd: number | null;
  hasValidDates: boolean;
  activeOnDate: boolean;
};

export function deriveTravelHome(input: TravelHomeInput): TravelHomeViewModel {
  const currentDate = normalizeCurrentDate(input.currentDate || new Date());
  const connectivity = input.connectivity || "unknown";
  const candidates = input.trips
    .filter((trip) => trip.status !== "archived")
    .map((trip) => buildCandidateTrip(trip, currentDate))
    .sort(sortCandidateTrips);
  const activeTrips = candidates.filter((candidate) => candidate.activeOnDate);
  const upcomingTrips = candidates.filter((candidate) => candidate.hasValidDates && candidate.daysUntilDeparture !== null && candidate.daysUntilDeparture >= 0 && !candidate.activeOnDate);
  const endedTrips = candidates.filter((candidate) => candidate.daysSinceEnd !== null && candidate.daysSinceEnd > 0);
  const undatedTrips = candidates.filter((candidate) => !candidate.hasValidDates);

  if (activeTrips.length > 1) {
    return buildMultipleTripsModel(activeTrips, connectivity);
  }

  const activeTrip = activeTrips[0] || null;
  if (activeTrip) {
    return buildTripModelForSingleTrip({
      trip: activeTrip.trip,
      currentDate,
      connectivity,
      intelligence: input.intelligence,
      state: buildActiveState(activeTrip.trip, currentDate)
    });
  }

  if (upcomingTrips.length > 1) {
    return buildMultipleTripsModel(upcomingTrips, connectivity);
  }

  const upcomingTrip = upcomingTrips[0] || null;
  if (upcomingTrip) {
    return buildTripModelForSingleTrip({
      trip: upcomingTrip.trip,
      currentDate,
      connectivity,
      intelligence: input.intelligence,
      state: buildUpcomingState(upcomingTrip, currentDate)
    });
  }

  if (endedTrips.length > 1) {
    return buildMultipleTripsModel(endedTrips, connectivity);
  }

  const endedTrip = endedTrips[0] || null;
  if (endedTrip) {
    return buildTripModelForSingleTrip({
      trip: endedTrip.trip,
      currentDate,
      connectivity,
      intelligence: input.intelligence,
      state: "ended_trip"
    });
  }

  if (undatedTrips.length > 1) {
    return buildMultipleTripsModel(undatedTrips, connectivity);
  }

  const undatedTrip = undatedTrips[0] || null;
  if (undatedTrip) {
    return buildTripModelForSingleTrip({
      trip: undatedTrip.trip,
      currentDate,
      connectivity,
      intelligence: input.intelligence,
      state: "undated_trip"
    });
  }

  return buildNoTripModel(connectivity);
}

function buildTripModelForSingleTrip(input: {
  trip: TripDraft;
  currentDate: string;
  connectivity: ConnectivityStatus;
  intelligence: DestinationIntelligence;
  state: TravelHomeState;
}): TravelHomeViewModel {
  const trip = input.trip;
  const preparation = deriveTravelPreparation({ trip, intelligence: input.intelligence, now: new Date(`${input.currentDate}T12:00:00.000Z`) });
  const tripDayExperience = deriveTripDayExperience({ trips: [trip], currentDate: new Date(`${input.currentDate}T12:00:00.000Z`), preparation });
  const destinationSummary = summarizeDestination(trip, input.intelligence);
  const tripSummary = summarizeTrip(trip, preparation, tripDayExperience, destinationSummary);
  const hero = summarizeHero(tripSummary);
  const notices = collectNotices({ state: input.state, preparation, tripDayExperience, destinationSummary });
  const { primaryAction, secondaryActions } = actionsForState(input.state, tripSummary, destinationSummary);
  const tripChooser = null;

  return {
    state: input.state,
    hero,
    primaryAction,
    secondaryActions,
    notices,
    tripSummary,
    tripChooser,
    todaySummary: input.state === "active_trip" || input.state === "day_complete" || input.state === "departure_day" ? tripSummary : null,
    preparationSummary: input.state === "ended_trip" ? null : tripSummary.preparation,
    destinationSummary,
    offlineSummary: {
      status: input.connectivity,
      tripEssentialsAvailable: input.connectivity === "offline",
      messageKey: input.connectivity === "offline" ? "offlineTripEssentials" : null
    }
  };
}

function buildMultipleTripsModel(candidates: CandidateTrip[], connectivity: ConnectivityStatus): TravelHomeViewModel {
  const tripSummaries = candidates.slice(0, 3).map((candidate) => summarizeMinimalTrip(candidate.trip, candidate));
  return {
    state: "multiple_trips",
    hero: null,
    primaryAction: {
      id: "home-primary-choose-trip",
      labelKey: "tripDay.chooseTrip",
      target: { kind: "tab", tab: "tripDrafts" },
      kind: "primary"
    },
    secondaryActions: [
      { id: "home-secondary-passport", labelKey: "travelPassport.title", target: { kind: "tab", tab: "passport" }, kind: "secondary" },
      { id: "home-secondary-journal", labelKey: "travelJournal.title", target: { kind: "tab", tab: "journal" }, kind: "secondary" },
      { id: "home-secondary-explorer", labelKey: "travelExplorer.title", target: { kind: "tab", tab: "explorer" }, kind: "secondary" }
    ],
    notices: [],
    tripSummary: null,
    tripChooser: {
      titleKey: "home.state.multiple.title",
      tripIds: tripSummaries.map((item) => item.tripId),
      trips: tripSummaries
    },
    todaySummary: null,
    preparationSummary: null,
    destinationSummary: null,
    offlineSummary: {
      status: connectivity,
      tripEssentialsAvailable: connectivity === "offline",
      messageKey: connectivity === "offline" ? "offlineTripEssentials" : null
    }
  };
}

function buildNoTripModel(connectivity: ConnectivityStatus): TravelHomeViewModel {
  return {
    state: "no_trip",
    hero: null,
    primaryAction: {
      id: "home-primary-plan-trip",
      labelKey: "planTripSeconds",
      target: { kind: "tab", tab: "tripDrafts" },
      kind: "primary"
    },
    secondaryActions: [
      { id: "home-secondary-passport", labelKey: "travelPassport.title", target: { kind: "tab", tab: "passport" }, kind: "secondary" },
      { id: "home-secondary-journal", labelKey: "travelJournal.title", target: { kind: "tab", tab: "journal" }, kind: "secondary" },
      { id: "home-secondary-explorer", labelKey: "travelExplorer.title", target: { kind: "tab", tab: "explorer" }, kind: "secondary" },
      { id: "home-secondary-tools", labelKey: "travelTools", target: { kind: "tab", tab: "traveltools" }, kind: "secondary" }
    ],
    notices: [],
    tripSummary: null,
    tripChooser: null,
    todaySummary: null,
    preparationSummary: null,
    destinationSummary: null,
    offlineSummary: {
      status: connectivity,
      tripEssentialsAvailable: connectivity === "offline",
      messageKey: connectivity === "offline" ? "offlineTripEssentials" : null
    }
  };
}

function buildUpcomingState(candidate: CandidateTrip, currentDate: string): TravelHomeState {
  if (candidate.daysUntilDeparture === 0) return "departure_day";
  if (candidate.daysUntilDeparture !== null && candidate.daysUntilDeparture <= 7) return "approaching_trip";
  if (candidate.trip.travelDates?.startDate && compareIsoDates(candidate.trip.travelDates.startDate, currentDate) > 0) return "planned_trip";
  return "planned_trip";
}

function buildActiveState(trip: TripDraft, currentDate: string): TravelHomeState {
  const experience = deriveTripDayExperience({ trips: [trip], currentDate: new Date(`${currentDate}T12:00:00.000Z`) });
  if (experience.execution.dayComplete) return "day_complete";
  if (experience.state === "today" && trip.travelDates?.startDate === currentDate) return "departure_day";
  return "active_trip";
}

function buildCandidateTrip(trip: TripDraft, currentDate: string): CandidateTrip {
  const destinationId = trip.destination ? resolveDestinationId(trip.destination) : null;
  const destinationLabel = trip.destination?.label || trip.destination?.city || trip.destination?.country || null;
  const hasValidDates = Boolean(trip.travelDates?.startDate && isValidIsoDate(trip.travelDates.startDate));
  const startDate = hasValidDates ? trip.travelDates!.startDate! : null;
  const endDate = trip.travelDates?.endDate && isValidIsoDate(trip.travelDates.endDate)
    ? trip.travelDates.endDate
    : startDate && trip.itineraryDays.length > 0
      ? addDays(startDate, Math.max(0, trip.itineraryDays.length - 1))
      : null;
  const activeOnDate = Boolean(startDate && endDate && compareIsoDates(currentDate, startDate) >= 0 && compareIsoDates(currentDate, endDate) <= 0);
  const daysUntilDeparture = startDate ? diffInDays(currentDate, startDate) : null;
  const daysSinceEnd = endDate ? diffInDays(endDate, currentDate) : null;

  return {
    trip,
    destinationId,
    destinationLabel,
    daysUntilDeparture,
    daysSinceEnd,
    hasValidDates,
    activeOnDate
  };
}

function summarizeTrip(
  trip: TripDraft,
  preparation: TravelPreparation,
  tripDayExperience: ReturnType<typeof deriveTripDayExperience>,
  destinationSummary: TravelHomeDestinationSummary | null
): TravelHomeTripSummary {
  const destinationLabel = trip.destination?.label || trip.destination?.city || trip.destination?.country || null;
  const dayLabel = tripDayExperience.selectedDate && tripDayExperience.dayIndex !== null
    ? `${tripDayExperience.dayIndex + 1}/${tripDayExperience.dayCount}`
    : null;

  return {
    tripId: trip.id,
    tripName: trip.name,
    destinationId: destinationSummary?.destinationId || (trip.destination ? resolveDestinationId(trip.destination) : null),
    destinationLabel,
    startDate: trip.travelDates?.startDate || null,
    endDate: trip.travelDates?.endDate || null,
    daysUntilDeparture: preparation.dates.daysUntilTrip,
    daysSinceEnd: preparation.dates.daysSinceTripEnded,
    dayIndex: tripDayExperience.dayIndex,
    dayCount: tripDayExperience.dayCount || null,
    dayLabel,
    nextPlaceLabel: tripDayExperience.nextItem?.place.name || null,
    progress: tripDayExperience.progress,
    preparation: {
      phase: preparation.phase,
      readiness: preparation.readiness,
      attentionCount: preparation.readiness.requiredAttentionCount,
      summaryKey: preparation.readiness.summaryKey
    },
    destination: destinationSummary
  };
}

function summarizeMinimalTrip(trip: TripDraft, candidate: CandidateTrip): TravelHomeTripSummary {
  return {
    tripId: trip.id,
    tripName: trip.name,
    destinationId: candidate.destinationId,
    destinationLabel: candidate.destinationLabel,
    startDate: trip.travelDates?.startDate || null,
    endDate: trip.travelDates?.endDate || null,
    daysUntilDeparture: candidate.daysUntilDeparture,
    daysSinceEnd: candidate.daysSinceEnd,
    dayIndex: null,
    dayCount: trip.itineraryDays.length || null,
    dayLabel: null,
    nextPlaceLabel: null,
    progress: null,
    preparation: null,
    destination: null
  };
}

function summarizeHero(summary: TravelHomeTripSummary): TravelHomeHero {
  return {
    tripId: summary.tripId,
    tripName: summary.tripName,
    destinationLabel: summary.destinationLabel,
    dayLabel: summary.dayLabel,
    nextPlaceLabel: summary.nextPlaceLabel,
    progress: summary.progress,
    daysUntilDeparture: summary.daysUntilDeparture,
    daysSinceEnd: summary.daysSinceEnd
  };
}

function summarizeDestination(trip: TripDraft, intelligence: DestinationIntelligence): TravelHomeDestinationSummary | null {
  if (!trip.destination) return null;
  const destinationId = resolveDestinationId(trip.destination);
  const country = findCountry(intelligence, trip.destination.countryCode || trip.destination.country || trip.destination.label);
  const city = findCity(intelligence, trip.destination.countryCode || country?.identity.countryCode || null, trip.destination.city || trip.destination.label);
  const currencyCode = country?.currencies.status === "available" ? country.currencies.value?.[0]?.code || null : null;
  const languages = country?.languages.status === "available" ? country.languages.value?.map((item) => item.displayName).filter(Boolean) || [] : [];
  const emergencyAvailable = Boolean(country?.emergency.status === "available" && (country.emergency.value?.verificationState === "verified" || country.emergency.value?.verificationState === "locally_reviewed"));
  return {
    destinationId,
    countryLabel: country?.identity.countryName || trip.destination.country || null,
    cityLabel: city?.identity.cityName || trip.destination.city || null,
    currencyCode,
    languages,
    emergencyAvailable,
    timezone: city?.time.status === "available" ? city.time.value?.cityTimeZone || city.time.value?.timeZones[0] || null : country?.time.status === "available" ? country.time.value?.cityTimeZone || country.time.value?.timeZones[0] || null : null
  };
}

function collectNotices(input: {
  state: TravelHomeState;
  preparation: TravelPreparation;
  tripDayExperience: ReturnType<typeof deriveTripDayExperience>;
  destinationSummary: TravelHomeDestinationSummary | null;
}): TravelHomeNotice[] {
  const notices: TravelHomeNotice[] = [];
  if (input.state === "planned_trip" || input.state === "approaching_trip" || input.state === "departure_day" || input.state === "active_trip" || input.state === "day_complete") {
    if (input.preparation.readiness.requiredAttentionCount > 0) {
      notices.push({ id: "preparation_attention", messageKey: "tripDay.notice.preparation_attention", severity: "attention" });
    }
    if (input.preparation.dataQuality.highStakesWarning) {
      notices.push({ id: "current_information_unverified", messageKey: "tripDay.notice.current_information_unverified", severity: "attention" });
    }
  }
  if (input.state === "undated_trip") {
    notices.push({ id: "no_dates", messageKey: "tripDay.notice.no_dates", severity: "info" });
  }
  if (!input.destinationSummary) {
    notices.push({ id: "destination_missing", messageKey: "tripDay.destinationUnavailable", severity: "info" });
  }
  if (input.preparation.dataQuality.hasVerifiedEmergency) {
    notices.push({ id: "verified_emergency", messageKey: "offlineEmergencyNumbers", severity: "info" });
  }
  if (input.tripDayExperience.state === "today" && input.tripDayExperience.execution.dayComplete) {
    notices.push({ id: "day_complete", messageKey: "tripDay.dayComplete", severity: "info" });
  }
  return uniqueNotices(notices);
}

function actionsForState(state: TravelHomeState, tripSummary: TravelHomeTripSummary | null, destinationSummary: TravelHomeDestinationSummary | null): { primaryAction: TravelHomeAction; secondaryActions: TravelHomeAction[] } {
  const destinationId = tripSummary?.destinationId || destinationSummary?.destinationId || null;
  if (state === "no_trip") {
    return {
      primaryAction: { id: "home-primary-plan-trip", labelKey: "planTripSeconds", target: { kind: "tab", tab: "tripDrafts" }, kind: "primary" },
      secondaryActions: [
        { id: "home-secondary-passport", labelKey: "travelPassport.title", target: { kind: "tab", tab: "passport" }, kind: "secondary" },
        { id: "home-secondary-journal", labelKey: "travelJournal.title", target: { kind: "tab", tab: "journal" }, kind: "secondary" },
        { id: "home-secondary-explorer", labelKey: "travelExplorer.title", target: { kind: "tab", tab: "explorer" }, kind: "secondary" },
        { id: "home-secondary-tools", labelKey: "travelTools", target: { kind: "tab", tab: "traveltools" }, kind: "secondary" }
      ]
    };
  }

  if (state === "multiple_trips") {
    return {
      primaryAction: { id: "home-primary-choose-trip", labelKey: "tripDay.chooseTrip", target: { kind: "tab", tab: "tripDrafts" }, kind: "primary" },
      secondaryActions: [
        { id: "home-secondary-passport", labelKey: "travelPassport.title", target: { kind: "tab", tab: "passport" }, kind: "secondary" },
        { id: "home-secondary-journal", labelKey: "travelJournal.title", target: { kind: "tab", tab: "journal" }, kind: "secondary" },
        { id: "home-secondary-explorer", labelKey: "travelExplorer.title", target: { kind: "tab", tab: "explorer" }, kind: "secondary" }
      ]
    };
  }

  if (state === "planned_trip" || state === "approaching_trip" || state === "undated_trip") {
    return {
      primaryAction: { id: "home-primary-prepare", labelKey: "travelPreparation.title", target: tripSummary ? { kind: "preparation", tripId: tripSummary.tripId } : { kind: "tab", tab: "tripDrafts" }, kind: "primary" },
      secondaryActions: [
        destinationId ? { id: "home-secondary-destination", labelKey: "travelGuides", target: { kind: "destination", destinationId }, kind: "secondary" } : { id: "home-secondary-guides", labelKey: "travelGuides", target: { kind: "tab", tab: "guides" }, kind: "secondary" },
        { id: "home-secondary-journal", labelKey: "travelJournal.title", target: { kind: "tab", tab: "journal" }, kind: "secondary" },
        { id: "home-secondary-passport", labelKey: "travelPassport.title", target: { kind: "tab", tab: "passport" }, kind: "secondary" },
        { id: "home-secondary-map", labelKey: "map", target: destinationId ? { kind: "map", destinationId } : { kind: "tab", tab: "map" }, kind: "secondary" }
      ]
    };
  }

  if (state === "departure_day") {
    return {
      primaryAction: { id: "home-primary-today", labelKey: "tripDay.title", target: { kind: "tab", tab: "today" }, kind: "primary" },
      secondaryActions: [
        { id: "home-secondary-preparation", labelKey: "travelPreparation.title", target: tripSummary ? { kind: "preparation", tripId: tripSummary.tripId } : { kind: "tab", tab: "tripDrafts" }, kind: "secondary" },
        destinationId ? { id: "home-secondary-destination", labelKey: "travelGuides", target: { kind: "destination", destinationId }, kind: "secondary" } : { id: "home-secondary-guides", labelKey: "travelGuides", target: { kind: "tab", tab: "guides" }, kind: "secondary" },
        { id: "home-secondary-sos", labelKey: "sosEmergency", target: { kind: "tab", tab: "sos" }, kind: "secondary" },
        { id: "home-secondary-map", labelKey: "map", target: destinationId ? { kind: "map", destinationId } : { kind: "tab", tab: "map" }, kind: "secondary" }
      ]
    };
  }

  if (state === "active_trip") {
    return {
      primaryAction: { id: "home-primary-today", labelKey: "tripDay.homeActive", target: { kind: "tab", tab: "today" }, kind: "primary" },
      secondaryActions: [
        destinationId ? { id: "home-secondary-destination", labelKey: "travelGuides", target: { kind: "destination", destinationId }, kind: "secondary" } : { id: "home-secondary-guides", labelKey: "travelGuides", target: { kind: "tab", tab: "guides" }, kind: "secondary" },
        { id: "home-secondary-preparation", labelKey: "travelPreparation.title", target: tripSummary ? { kind: "preparation", tripId: tripSummary.tripId } : { kind: "tab", tab: "tripDrafts" }, kind: "secondary" },
        { id: "home-secondary-journal", labelKey: "travelJournal.title", target: { kind: "tab", tab: "journal" }, kind: "secondary" },
        { id: "home-secondary-sos", labelKey: "sosEmergency", target: { kind: "tab", tab: "sos" }, kind: "secondary" }
      ]
    };
  }

  if (state === "day_complete") {
    return {
      primaryAction: { id: "home-primary-journal", labelKey: "travelJournal.title", target: { kind: "tab", tab: "journal" }, kind: "primary" },
      secondaryActions: [
        { id: "home-secondary-today", labelKey: "tripDay.title", target: { kind: "tab", tab: "today" }, kind: "secondary" },
        { id: "home-secondary-passport", labelKey: "travelPassport.title", target: { kind: "tab", tab: "passport" }, kind: "secondary" },
        { id: "home-secondary-explorer", labelKey: "travelExplorer.title", target: { kind: "tab", tab: "explorer" }, kind: "secondary" },
        destinationId ? { id: "home-secondary-destination", labelKey: "travelGuides", target: { kind: "destination", destinationId }, kind: "secondary" } : { id: "home-secondary-guides", labelKey: "travelGuides", target: { kind: "tab", tab: "guides" }, kind: "secondary" }
      ]
    };
  }

  if (state === "ended_trip") {
    return {
      primaryAction: {
        id: "home-primary-review",
        labelKey: "home.reviewTrip",
        target: tripSummary ? { kind: "tripDay", tripId: tripSummary.tripId } : { kind: "tab", tab: "tripDrafts" },
        kind: "primary"
      },
      secondaryActions: [
        { id: "home-secondary-journal", labelKey: "travelJournal.title", target: { kind: "tab", tab: "journal" }, kind: "secondary" },
        { id: "home-secondary-passport", labelKey: "travelPassport.title", target: { kind: "tab", tab: "passport" }, kind: "secondary" },
        { id: "home-secondary-explorer", labelKey: "travelExplorer.title", target: { kind: "tab", tab: "explorer" }, kind: "secondary" }
      ]
    };
  }

  return {
    primaryAction: { id: "home-primary-plan-trip", labelKey: "planTripSeconds", target: { kind: "tab", tab: "tripDrafts" }, kind: "primary" },
    secondaryActions: [{ id: "home-secondary-tools", labelKey: "travelTools", target: { kind: "tab", tab: "traveltools" }, kind: "secondary" }]
  };
}

function findCountry(intelligence: DestinationIntelligence, reference: string | null | undefined): CountryIntelligence | null {
  if (!reference) return null;
  const normalized = normalizeLookup(reference);
  return intelligence.countries.find((country) => normalizeLookup(country.identity.countryName) === normalized || normalizeLookup(country.identity.countryCode) === normalized) || null;
}

function findCity(intelligence: DestinationIntelligence, countryCode: string | null | undefined, reference: string | null | undefined): CityIntelligence | null {
  if (!reference) return null;
  const normalized = normalizeLookup(reference);
  return intelligence.cities.find((city) => {
    if (countryCode && city.identity.countryCode !== countryCode.toUpperCase()) return false;
    return normalizeLookup(city.identity.cityName) === normalized || normalizeLookup(city.identity.id) === normalized;
  }) || null;
}

function normalizeLookup(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeCurrentDate(date: Date) {
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function diffInDays(leftDate: string, rightDate: string) {
  const left = Date.parse(`${leftDate}T00:00:00.000Z`);
  const right = Date.parse(`${rightDate}T00:00:00.000Z`);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return Math.round((right - left) / 86_400_000);
}

function addDays(date: string, days: number) {
  const value = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(value)) return date;
  return new Date(value + days * 86_400_000).toISOString().slice(0, 10);
}

function sortCandidateTrips(left: CandidateTrip, right: CandidateTrip) {
  const leftDate = left.trip.travelDates?.startDate || "";
  const rightDate = right.trip.travelDates?.startDate || "";
  return compareIsoDates(leftDate || "9999-12-31", rightDate || "9999-12-31") || left.trip.name.localeCompare(right.trip.name);
}

function uniqueNotices(notices: TravelHomeNotice[]) {
  const seen = new Set<string>();
  return notices.filter((notice) => {
    if (seen.has(notice.id)) return false;
    seen.add(notice.id);
    return true;
  });
}
