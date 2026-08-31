import { resolveDestinationId } from "./destinationHub";
import {
  addDaysToIsoDate,
  compareIsoDates,
  getTripDurationDays,
  getTripDateDayAlignment,
  getTripItineraryDayDate,
  hydrateTripDraft,
  isValidIsoDate,
  TRIP_TIME_BLOCK_ORDER,
  UNSCHEDULED_TRIP_DAY_ID,
  type HydratedTripDraftPlace,
  type HydratedTripTimeBlockSection,
  type TripDraft,
  type TripItineraryDay,
  type TripPlaceVisitStatus,
  type TripTimeBlock
} from "./tripDrafts";
import type { SavedPlace } from "./savedPlaces";
import { getSavedPlaceCoordinates, findNearbyPlaceGroups, type NearbyPlaceInput } from "./tripGeography";
import type { TravelPreparation } from "./travelPreparation";

export type TripDayState = "before_trip" | "today" | "future_day" | "past_day" | "trip_ended" | "undated";
export type TripDaySelectionState = "selected" | "none" | "multiple_active";
export type TripDayTimeBlockId = "unassigned" | TripTimeBlock;

export type TripDayPlace = {
  logicalPlaceId: string;
  name: string;
  type: string | null;
  timeBlock: TripTimeBlock | null;
  visitStatus: TripPlaceVisitStatus;
  planningNote: string | null;
  photoCount: number;
  isAvailable: boolean;
  order: number;
  coordinates: { latitude: number; longitude: number } | null;
};

export type TripDaySection = {
  id: TripDayTimeBlockId;
  timeBlock: TripTimeBlock | null;
  places: TripDayPlace[];
  total: number;
  unavailable: number;
};

export type TripDayProgress = {
  total: number;
  visited: number;
  skipped: number;
  remaining: number;
  completionPercent: number;
};

export type TripDayNextItem = {
  place: TripDayPlace;
  sectionId: TripDayTimeBlockId;
} | null;

export type TripDayExecutionState = {
  currentPlace: TripDayPlace | null;
  nextPlace: TripDayPlace | null;
  laterPlaces: TripDayPlace[];
  completedPlaces: TripDayPlace[];
  skippedPlaces: TripDayPlace[];
  unscheduledPlaces: TripDayPlace[];
  progress: TripDayProgress;
  currentBlock: TripDayTimeBlockId | null;
  nextBlock: TripDayTimeBlockId | null;
  dayComplete: boolean;
};

export type TripDayNearbyGroup = {
  id: string;
  sectionId: TripDayTimeBlockId;
  placeNames: string[];
  minimumDistanceMeters: number;
  maximumDistanceMeters: number;
};

export type TripDayNoticeId =
  | "no_dated_trip"
  | "multiple_active_trips"
  | "trip_not_started"
  | "trip_started"
  | "trip_ended"
  | "no_dates"
  | "date_day_mismatch"
  | "preparation_attention"
  | "current_information_unverified";

export type TripDayNotice = {
  id: TripDayNoticeId;
  level: "info" | "attention";
};

export type TripDayCandidate = {
  id: string;
  name: string;
  destinationLabel: string;
  startDate: string | null;
  endDate: string | null;
};

export type TripDayExperience = {
  selectionState: TripDaySelectionState;
  trip: TripDraft | null;
  candidates: TripDayCandidate[];
  destinationId: string | null;
  selectedDay: TripItineraryDay | null;
  selectedDate: string | null;
  currentDate: string;
  dayIndex: number | null;
  dayCount: number;
  state: TripDayState;
  sections: TripDaySection[];
  unscheduled: TripDayPlace[];
  progress: TripDayProgress;
  execution: TripDayExecutionState;
  nextItem: TripDayNextItem;
  nearbyGroups: TripDayNearbyGroup[];
  notices: TripDayNotice[];
  previousDayId: string | null;
  nextDayId: string | null;
};

export function deriveTripDayExperience(input: {
  trips: readonly TripDraft[];
  savedPlaces?: readonly SavedPlace[];
  currentDate?: Date;
  selectedTripId?: string | null;
  selectedDayId?: string | null;
  preparation?: TravelPreparation | null;
}): TripDayExperience {
  const currentDate = toIsoDate(input.currentDate || new Date());
  const resolution = resolveTripForDay(input.trips, currentDate, input.selectedTripId || null);
  const trip = resolution.trip;
  const destinationId = trip?.destination ? resolveDestinationId(trip.destination) : null;
  const hydrated = trip ? hydrateTripDraft(trip, input.savedPlaces || []) : null;
  const dayResolution = trip ? resolveDay(trip, currentDate, input.selectedDayId || null) : emptyDayResolution();
  const daySection = dayResolution.selectedDay && hydrated
    ? hydrated.sections.find((section) => section.kind === "day" && section.id === dayResolution.selectedDay?.id) || null
    : null;
  const sections = buildTripDaySections(daySection?.timeBlocks || []);
  const unscheduledSection = hydrated?.sections.find((section) => section.id === UNSCHEDULED_TRIP_DAY_ID) || null;
  const unscheduled = (unscheduledSection?.places || []).map(toTripDayPlace);
  const progress = deriveTripDayProgress(sections.flatMap((section) => section.places));
  const execution = deriveTripDayExecutionState(sections, unscheduled, progress);
  const notices = deriveTripDayNotices({
    selectionState: resolution.selectionState,
    trip,
    state: dayResolution.state,
    currentDate,
    selectedDate: dayResolution.selectedDate,
    selectedDay: dayResolution.selectedDay,
    hasDateDayMismatch: hasTripDateDayMismatch(trip),
    preparation: input.preparation || null
  });

  return {
    selectionState: resolution.selectionState,
    trip,
    candidates: resolution.candidates,
    destinationId,
    selectedDay: dayResolution.selectedDay,
    selectedDate: dayResolution.selectedDate,
    currentDate,
    dayIndex: dayResolution.dayIndex,
    dayCount: trip?.itineraryDays.length || 0,
    state: dayResolution.state,
    sections,
    unscheduled,
    progress,
    execution,
    nextItem: execution.nextPlace ? { place: execution.nextPlace, sectionId: execution.currentBlock || "unassigned" } : null,
    nearbyGroups: deriveNearbyGroups(sections),
    notices,
    previousDayId: dayResolution.previousDayId,
    nextDayId: dayResolution.nextDayId
  };
}

export function resolveTripForDay(
  trips: readonly TripDraft[],
  currentDate: string,
  selectedTripId: string | null = null
): { selectionState: TripDaySelectionState; trip: TripDraft | null; candidates: TripDayCandidate[] } {
  const available = trips.filter((trip) => trip.status !== "archived");
  if (selectedTripId) {
    const trip = available.find((item) => item.id === selectedTripId) || null;
    return { selectionState: trip ? "selected" : "none", trip, candidates: [] };
  }

  const active = available.filter((trip) => tripIsActiveOnDate(trip, currentDate));
  if (active.length === 1) return { selectionState: "selected", trip: active[0], candidates: [] };
  if (active.length > 1) return { selectionState: "multiple_active", trip: null, candidates: active.map(toCandidate) };

  const upcoming = available
    .filter((trip) => trip.travelDates?.startDate && isValidIsoDate(trip.travelDates.startDate) && compareIsoDates(trip.travelDates.startDate, currentDate) >= 0)
    .sort((left, right) => compareIsoDates(left.travelDates!.startDate, right.travelDates!.startDate) || left.name.localeCompare(right.name));
  if (upcoming[0]) return { selectionState: "selected", trip: upcoming[0], candidates: [] };

  return { selectionState: "none", trip: null, candidates: available.map(toCandidate) };
}

export function deriveTripDayProgress(places: readonly TripDayPlace[]): TripDayProgress {
  const total = places.length;
  const visited = places.filter((place) => place.visitStatus === "visited").length;
  const skipped = places.filter((place) => place.visitStatus === "skipped").length;
  const remaining = Math.max(0, total - visited - skipped);
  return {
    total,
    visited,
    skipped,
    remaining,
    completionPercent: total === 0 ? 0 : Math.round((visited / total) * 100)
  };
}

export function deriveTripDayNextItem(sections: readonly TripDaySection[]): TripDayNextItem {
  const execution = deriveTripDayExecutionState(sections, []);
  return execution.nextPlace ? { place: execution.nextPlace, sectionId: execution.currentBlock || "unassigned" } : null;
}

function resolveDay(trip: TripDraft, currentDate: string, selectedDayId: string | null) {
  const days = [...trip.itineraryDays].sort((left, right) => left.order - right.order);
  const explicitDay = selectedDayId ? days.find((day) => day.id === selectedDayId) || null : null;
  const indexedDay = resolveDefaultDay(trip, days, currentDate);
  const selectedDay = explicitDay || indexedDay.selectedDay;
  const selectedDate = selectedDay ? getTripItineraryDayDate(trip, selectedDay) : null;
  const dayIndex = selectedDay ? days.findIndex((day) => day.id === selectedDay.id) : null;
  const previousDayId = dayIndex !== null && dayIndex > 0 ? days[dayIndex - 1]?.id || null : null;
  const nextDayId = dayIndex !== null && dayIndex >= 0 && dayIndex < days.length - 1 ? days[dayIndex + 1]?.id || null : null;
  return {
    selectedDay,
    selectedDate,
    dayIndex,
    state: selectedDay ? deriveDayState(trip, currentDate, selectedDate) : indexedDay.state,
    previousDayId,
    nextDayId
  };
}

function resolveDefaultDay(trip: TripDraft, days: TripItineraryDay[], currentDate: string): { selectedDay: TripItineraryDay | null; state: TripDayState } {
  if (days.length === 0) return { selectedDay: null, state: trip.travelDates?.startDate ? "before_trip" : "undated" };
  const startDate = trip.travelDates?.startDate;
  if (!startDate || !isValidIsoDate(startDate)) return { selectedDay: days[0], state: "undated" };
  const endDate = trip.travelDates?.endDate && isValidIsoDate(trip.travelDates.endDate)
    ? trip.travelDates.endDate
    : addDaysToIsoDate(startDate, Math.max(0, days.length - 1));
  if (compareIsoDates(currentDate, startDate) < 0) return { selectedDay: days[0], state: "before_trip" };
  if (endDate && compareIsoDates(currentDate, endDate) > 0) return { selectedDay: days[days.length - 1], state: "trip_ended" };

  const offset = daysBetween(startDate, currentDate);
  if (offset === null) return { selectedDay: days[0], state: "undated" };
  const day = days.find((item) => item.order === offset) || days[offset] || null;
  if (day) return { selectedDay: day, state: "today" };
  return {
    selectedDay: offset < 0 ? days[0] : days[days.length - 1],
    state: offset < 0 ? "before_trip" : "past_day"
  };
}

function deriveDayState(trip: TripDraft, currentDate: string, selectedDate: string | null): TripDayState {
  if (!trip.travelDates?.startDate || !isValidIsoDate(trip.travelDates.startDate) || !selectedDate) return "undated";
  const endDate = trip.travelDates.endDate && isValidIsoDate(trip.travelDates.endDate)
    ? trip.travelDates.endDate
    : addDaysToIsoDate(trip.travelDates.startDate, Math.max(0, trip.itineraryDays.length - 1));
  if (compareIsoDates(currentDate, trip.travelDates.startDate) < 0) return "before_trip";
  if (endDate && compareIsoDates(currentDate, endDate) > 0) return "trip_ended";
  const comparison = compareIsoDates(selectedDate, currentDate);
  if (comparison === 0) return "today";
  return comparison < 0 ? "past_day" : "future_day";
}

function buildTripDaySections(blocks: readonly HydratedTripTimeBlockSection[]): TripDaySection[] {
  return TRIP_TIME_BLOCK_ORDER.map((timeBlock) => {
    const block = blocks.find((item) => (item.timeBlock || null) === timeBlock);
    const id = (timeBlock || "unassigned") as TripDayTimeBlockId;
    const places = (block?.places || []).map(toTripDayPlace);
    return {
      id,
      timeBlock,
      places,
      total: places.length,
      unavailable: block?.counts.unavailable || 0
    };
  });
}

function toTripDayPlace(item: HydratedTripDraftPlace): TripDayPlace {
  const placeRecord = item.place as Record<string, unknown> | null;
  return {
    logicalPlaceId: item.reference.logicalPlaceId,
    name: typeof placeRecord?.name === "string" && placeRecord.name.trim() ? placeRecord.name : item.reference.logicalPlaceId,
    type: typeof placeRecord?.type === "string" ? placeRecord.type : item.reference.persistedReferences[0]?.itemType || null,
    timeBlock: item.reference.timeBlock || null,
    visitStatus: item.reference.visitStatus || "planned",
    planningNote: item.reference.planningNote || null,
    photoCount: item.reference.photoIds?.length || 0,
    isAvailable: item.isAvailable,
    order: item.reference.order,
    coordinates: item.place ? getSavedPlaceCoordinates(item.place) : null
  };
}

function deriveNearbyGroups(sections: readonly TripDaySection[]): TripDayNearbyGroup[] {
  return sections.flatMap((section) => {
    const inputs: NearbyPlaceInput[] = section.places.flatMap((place) => {
      if (!place.coordinates) return [];
      return [{ logicalPlaceId: place.logicalPlaceId, name: place.name, order: place.order, ...place.coordinates }];
    });
    return findNearbyPlaceGroups(inputs).map((group) => ({
      id: group.id,
      sectionId: section.id,
      placeNames: group.places.map((place) => place.name),
      minimumDistanceMeters: group.minimumDistanceMeters,
      maximumDistanceMeters: group.maximumDistanceMeters
    }));
  });
}

export function deriveTripDayExecutionState(
  sections: readonly TripDaySection[],
  unscheduled: readonly TripDayPlace[],
  progress: TripDayProgress = deriveTripDayProgress(sections.flatMap((section) => section.places))
): TripDayExecutionState {
  const orderedSections = sections.filter((section) => section.id !== "unassigned");
  const ordered = orderedSections.flatMap((section) => section.places.map((place) => ({ sectionId: section.id, place })));
  const completedPlaces = ordered.filter(({ place }) => place.visitStatus === "visited").map(({ place }) => place);
  const skippedPlaces = ordered.filter(({ place }) => place.visitStatus === "skipped").map(({ place }) => place);
  const plannedPlaces = ordered.filter(({ place }) => place.visitStatus === "planned");
  const nextEntry = plannedPlaces[0] || null;
  const laterPlaces = plannedPlaces.slice(1).map(({ place }) => place);
  const currentBlock = nextEntry ? nextEntry.sectionId : null;
  const currentBlockIndex = currentBlock === null ? -1 : orderedSections.findIndex((section) => section.id === currentBlock);
  const nextBlock = currentBlockIndex < 0
    ? orderedSections.find((section) => section.places.some((place) => place.visitStatus === "planned"))?.id || null
    : orderedSections.slice(currentBlockIndex + 1).find((section) => section.places.some((place) => place.visitStatus === "planned"))?.id || null;

  return {
    currentPlace: nextEntry?.place || null,
    nextPlace: nextEntry?.place || null,
    laterPlaces,
    completedPlaces,
    skippedPlaces,
    unscheduledPlaces: [...unscheduled],
    progress,
    currentBlock,
    nextBlock,
    dayComplete: progress.total > 0 && progress.remaining === 0
  };
}

function deriveTripDayNotices(input: {
  selectionState: TripDaySelectionState;
  trip: TripDraft | null;
  state: TripDayState;
  currentDate: string;
  selectedDate: string | null;
  selectedDay: TripItineraryDay | null;
  hasDateDayMismatch: boolean;
  preparation: TravelPreparation | null;
}): TripDayNotice[] {
  const notices: TripDayNotice[] = [];
  if (!input.trip) notices.push({ id: "no_dated_trip", level: "info" });
  if (input.selectionState === "multiple_active") notices.push({ id: "multiple_active_trips", level: "attention" });
  if (input.trip && !input.trip.travelDates?.startDate) notices.push({ id: "no_dates", level: "info" });
  if (input.state === "before_trip") notices.push({ id: "trip_not_started", level: "info" });
  if (input.state === "trip_ended") notices.push({ id: "trip_ended", level: "info" });
  if (input.state === "today") notices.push({ id: "trip_started", level: "info" });
  if (input.hasDateDayMismatch) notices.push({ id: "date_day_mismatch", level: "attention" });
  if (input.preparation && input.preparation.readiness.requiredAttentionCount > 0 && (input.state === "before_trip" || input.state === "today")) {
    notices.push({ id: "preparation_attention", level: "attention" });
  }
  if (input.preparation?.dataQuality.highStakesWarning) {
    notices.push({ id: "current_information_unverified", level: "attention" });
  }
  return uniqueNotices(notices);
}

function hasTripDateDayMismatch(trip: TripDraft | null) {
  if (!trip) return false;
  const alignment = getTripDateDayAlignment(trip);
  return Boolean(alignment && (alignment.extraItineraryDays > 0 || alignment.unusedTripDates > 0));
}

function uniqueNotices(notices: TripDayNotice[]) {
  const seen = new Set<string>();
  return notices.filter((notice) => {
    if (seen.has(notice.id)) return false;
    seen.add(notice.id);
    return true;
  });
}

function tripIsActiveOnDate(trip: TripDraft, currentDate: string) {
  const startDate = trip.travelDates?.startDate;
  if (!startDate || !isValidIsoDate(startDate)) return false;
  const endDate = trip.travelDates?.endDate && isValidIsoDate(trip.travelDates.endDate)
    ? trip.travelDates.endDate
    : startDate;
  return compareIsoDates(currentDate, startDate) >= 0 && compareIsoDates(currentDate, endDate) <= 0;
}

function toCandidate(trip: TripDraft): TripDayCandidate {
  return {
    id: trip.id,
    name: trip.name,
    destinationLabel: trip.destination?.label || trip.destination?.country || trip.destination?.city || "",
    startDate: trip.travelDates?.startDate || null,
    endDate: trip.travelDates?.endDate || null
  };
}

function emptyDayResolution() {
  return {
    selectedDay: null,
    selectedDate: null,
    dayIndex: null,
    state: "undated" as TripDayState,
    previousDayId: null,
    nextDayId: null
  };
}

function toIsoDate(date: Date) {
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function daysBetween(startDate: string, endDate: string) {
  const duration = getTripDurationDays(startDate, endDate);
  return duration === null ? null : duration - 1;
}
