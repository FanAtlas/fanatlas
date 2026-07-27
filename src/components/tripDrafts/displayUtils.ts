import type { HydratedTripDraft, HydratedTripDraftPlace, TripDraftMutationError, TripTimeBlock } from "../../lib/tripDrafts";
import {
  findNearbyPlaceGroups,
  getSavedPlaceCoordinates,
  type NearbyPlaceInput
} from "../../lib/tripGeography";
import { getSavedPlaceActions } from "../../lib/savedPlaceActions";
import type { TripNearbyPlaceGroupItem, TripPlaceActionRow, TripPlaceOrderPosition, TripPlannerTranslate } from "./types";

const FEET_PER_METER = 3.28084;
const METERS_PER_MILE = 1609.344;

export function getTripContextLines(draft: HydratedTripDraft, language: string, translate: TripPlannerTranslate) {
  const lines: string[] = [];
  if (draft.context.destination) lines.push(draft.context.destination.label);
  const dateLine = formatTripDateRange(draft, language, translate);
  if (dateLine) lines.push(dateLine);
  return lines;
}

export function formatTripDateRange(draft: HydratedTripDraft, language: string, translate: TripPlannerTranslate) {
  const dates = draft.context.travelDates;
  if (!dates) return "";
  if (!dates.endDate) {
    return translate("tripDrafts.details.startingOn").replace("{date}", formatMediumIsoDate(dates.startDate, language));
  }
  const start = formatMediumIsoDate(dates.startDate, language);
  const end = formatMediumIsoDate(dates.endDate, language);
  const duration = draft.context.durationDays;
  const durationText = duration === 1
    ? translate("tripDrafts.details.durationOneDay")
    : translate("tripDrafts.details.durationManyDays").replace("{count}", String(duration || ""));
  return `${start} - ${end} · ${durationText}`;
}

export function getTripAlignmentNotice(draft: HydratedTripDraft, translate: TripPlannerTranslate) {
  const alignment = draft.context.dateAlignment;
  if (!alignment) return "";
  if (alignment.extraItineraryDays > 0) {
    return translate("tripDrafts.details.extraItineraryDays").replace("{count}", String(alignment.extraItineraryDays));
  }
  if (alignment.unusedTripDates > 0) {
    return translate("tripDrafts.details.unusedTravelDays").replace("{count}", String(alignment.unusedTripDates));
  }
  return "";
}

export function createDefaultMissingDayTitles(existingDayCount: number, missingDayCount: number, translate: TripPlannerTranslate) {
  return Array.from({ length: missingDayCount }, (_, index) => (
    translate("tripDrafts.itinerary.defaultDayTitle").replace("{number}", String(existingDayCount + index + 1))
  ));
}

export function formatLongIsoDate(value: string, language: string) {
  return formatIsoDate(value, language, { weekday: "long", month: "long", day: "numeric" });
}

export function getTripPlaceActionRows(places: HydratedTripDraftPlace[]): TripPlaceActionRow[] {
  return places.flatMap((item) => item.place ? [{
    reference: item.reference,
    place: item.place,
    actions: getSavedPlaceActions(item.place),
    position: getTripPlaceOrderPosition(places, item.reference.logicalPlaceId)
  }] : []);
}

export function getTripNearbyPlaceGroupItems(
  places: readonly HydratedTripDraftPlace[],
  sourceDayId: string,
  sourceTimeBlock: TripTimeBlock | null,
  language: string,
  translate: TripPlannerTranslate
): TripNearbyPlaceGroupItem[] {
  const coordinateInputs: NearbyPlaceInput[] = [];

  places.forEach((item) => {
    if (!item.place) return;
    const coordinates = getSavedPlaceCoordinates(item.place);
    if (!coordinates) return;

    coordinateInputs.push({
      logicalPlaceId: item.reference.logicalPlaceId,
      name: item.place.name,
      order: item.reference.order,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    });
  });

  return findNearbyPlaceGroups(coordinateInputs).map((group) => {
    const distance = formatTripNearbyDistance(group.minimumDistanceMeters, language, translate);
    const heading = group.places.length === 2
      ? translate("tripDrafts.nearbyGroup")
      : translate("tripDrafts.nearbyPlaceCount").replace("{count}", formatLocalizedNumber(group.places.length, language, 0));
    const closestDistanceLabel = group.places.length === 2
      ? translate("tripDrafts.approximatelyApart").replace("{distance}", distance)
      : translate("tripDrafts.closestPlacesApart").replace("{distance}", distance);

    return {
      id: group.id,
      memberIds: group.places.map((place) => place.logicalPlaceId),
      sourceDayId,
      sourceTimeBlock,
      heading,
      placeNames: group.places.map((place) => place.name),
      closestDistanceLabel,
      spanDistanceLabel: group.places.length > 2
        ? translate("tripDrafts.groupSpans").replace("{distance}", formatTripNearbyDistance(group.maximumDistanceMeters, language, translate))
        : undefined
    };
  });
}

export function timeBlockLabel(timeBlock: TripTimeBlock | null, translate: TripPlannerTranslate) {
  if (timeBlock === "morning") return translate("tripDrafts.timeBlocks.morning");
  if (timeBlock === "afternoon") return translate("tripDrafts.timeBlocks.afternoon");
  if (timeBlock === "evening") return translate("tripDrafts.timeBlocks.evening");
  return translate("tripDrafts.timeBlocks.unassigned");
}

export function emptyTimeBlockLabel(timeBlock: TripTimeBlock | null, translate: TripPlannerTranslate) {
  if (timeBlock === "morning") return translate("tripDrafts.timeBlocks.emptyMorning");
  if (timeBlock === "afternoon") return translate("tripDrafts.timeBlocks.emptyAfternoon");
  if (timeBlock === "evening") return translate("tripDrafts.timeBlocks.emptyEvening");
  return "";
}

export function formatTimeBlockSuccess(timeBlock: TripTimeBlock | null, placeName: string, translate: TripPlannerTranslate) {
  if (timeBlock === "morning") return translate("tripDrafts.timeBlocks.assignedMorningSuccess").replace("{name}", placeName);
  if (timeBlock === "afternoon") return translate("tripDrafts.timeBlocks.assignedAfternoonSuccess").replace("{name}", placeName);
  if (timeBlock === "evening") return translate("tripDrafts.timeBlocks.assignedEveningSuccess").replace("{name}", placeName);
  return translate("tripDrafts.timeBlocks.clearedSuccess").replace("{name}", placeName);
}

export function translateTripDraftError(error: TripDraftMutationError | null, translate: TripPlannerTranslate) {
  if (!error) return "";
  if (error === "invalid_name") return translate("tripDrafts.errors.invalidName");
  if (error === "invalid_day_title") return translate("tripDrafts.itinerary.errors.invalidTitle");
  if (error === "draft_not_found") return translate("tripDrafts.errors.notFound");
  if (error === "day_not_found") return translate("tripDrafts.itinerary.errors.dayNotFound");
  if (error === "draft_limit_reached") return translate("tripDrafts.errors.limitReached");
  if (error === "day_limit_reached") return translate("tripDrafts.details.errors.dayLimitReached");
  if (error === "place_limit_reached") return translate("tripDrafts.errors.limitReached");
  if (error === "incomplete_travel_dates") return translate("tripDrafts.details.errors.incompleteDates");
  if (error === "no_missing_itinerary_days") return translate("tripDrafts.details.errors.noMissingDays");
  if (error === "invalid_generated_day_titles") return translate("tripDrafts.details.errors.invalidGeneratedTitles");
  if (error === "invalid_time_block") return translate("tripDrafts.timeBlocks.errors.invalidBlock");
  if (error === "time_block_not_allowed_in_unscheduled") return translate("tripDrafts.timeBlocks.errors.notAllowedInUnscheduled");
  if (error === "invalid_destination") return translate("tripDrafts.details.errors.invalidDestination");
  if (error === "invalid_start_date") return translate("tripDrafts.details.errors.invalidStartDate");
  if (error === "invalid_end_date") return translate("tripDrafts.details.errors.invalidEndDate");
  if (error === "end_date_before_start_date") return translate("tripDrafts.details.errors.endBeforeStart");
  if (error === "invalid_destination_day") return translate("tripDrafts.itinerary.errors.invalidDestination");
  if (error === "invalid_place_group") return translate("tripDrafts.nearbyGroups.errors.invalidGroup");
  if (error === "stale_place_group") return translate("tripDrafts.nearbyGroups.errors.staleGroup");
  if (error === "place_not_found") return translate("tripDrafts.itinerary.errors.placeNotFound");
  if (error === "reserved_day_operation") return translate("tripDrafts.itinerary.errors.dayNotFound");
  if (error === "storage_unavailable") return translate("tripDrafts.errors.storageUnavailable");
  return translate("tripDrafts.errors.writeFailed");
}

export function typeLabel(type: string | undefined) {
  if (type === "fan-zone" || type === "fan_zone") return "Fan Zone";
  if (!type) return "Place";
  return type.replace("_", " ").charAt(0).toUpperCase() + type.replace("_", " ").slice(1);
}

export function iconFor(type: string | undefined) {
  if (type === "stadium") return "🏟";
  if (type === "restaurant") return "🍽";
  if (type === "hotel") return "🏨";
  return "🎉";
}

function formatTripNearbyDistance(distanceMeters: number, language: string, translate: TripPlannerTranslate) {
  if (language === "en") {
    const miles = distanceMeters / METERS_PER_MILE;
    if (miles < 0.1) {
      const feet = roundToNearest(distanceMeters * FEET_PER_METER, 50);
      return translate("tripDrafts.distanceFeet").replace("{count}", formatLocalizedNumber(feet, language, 0));
    }
    return translate("tripDrafts.distanceMiles").replace("{count}", formatLocalizedNumber(miles, language, 1));
  }

  if (distanceMeters < 1000) {
    const meters = roundToNearest(distanceMeters, 50);
    return translate("tripDrafts.distanceMeters").replace("{count}", formatLocalizedNumber(meters, language, 0));
  }

  return translate("tripDrafts.distanceKilometers").replace("{count}", formatLocalizedNumber(distanceMeters / 1000, language, 1));
}

function getTripPlaceOrderPosition(places: HydratedTripDraftPlace[], logicalPlaceId: string): TripPlaceOrderPosition {
  const index = places.findIndex((item) => item.reference.logicalPlaceId === logicalPlaceId);
  const total = places.length;
  return {
    index,
    total,
    canMoveUp: index > 0,
    canMoveDown: index >= 0 && index < total - 1
  };
}

function formatMediumIsoDate(value: string, language: string) {
  return formatIsoDate(value, language, { month: "short", day: "numeric", year: "numeric" });
}

function formatIsoDate(value: string, language: string, options: Intl.DateTimeFormatOptions) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  try {
    return new Intl.DateTimeFormat(localeForLanguage(language), { timeZone: "UTC", ...options }).format(date);
  } catch {
    return value;
  }
}

function formatLocalizedNumber(value: number, language: string, maximumFractionDigits: number) {
  try {
    return new Intl.NumberFormat(localeForLanguage(language), {
      maximumFractionDigits,
      minimumFractionDigits: maximumFractionDigits
    }).format(value);
  } catch {
    return value.toFixed(maximumFractionDigits);
  }
}

function roundToNearest(value: number, unit: number) {
  return Math.round(value / unit) * unit;
}

function localeForLanguage(language: string) {
  if (language === "es") return "es-ES";
  if (language === "fr") return "fr-FR";
  if (language === "ar") return "ar";
  if (language === "pt") return "pt-PT";
  return "en-US";
}
