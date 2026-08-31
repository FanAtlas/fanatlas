import type { MapDestination } from "../mapDestinations";
import type { DestinationCurrentInformationInput, WeatherLookupInput } from "../server/tools/toolContracts";
import type { DestinationIntelligence } from "./destinationIntelligenceTypes";
import type { TripDayExperience } from "./tripDay";

export type TripDayLiveContextStatus = "idle" | "loading" | "success" | "partial" | "unavailable" | "error";

export type TripDayLiveContextIdentity = {
  tripId: string | null;
  dayId: string | null;
  selectedDate: string | null;
  nextPlaceId: string | null;
};

export type TripDayLiveContextDestination = {
  label: string;
  city?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  currency?: string;
  timezone?: string;
};

export type TripDayWeatherContextRequest = {
  action: "weather";
  requestId: string;
  locale: WeatherLookupInput["locale"];
  currentDate: string;
  identity: TripDayLiveContextIdentity;
  destination: TripDayLiveContextDestination;
  units: WeatherLookupInput["units"];
};

export type TripDayCurrencyContextRequest = {
  action: "currency";
  requestId: string;
  locale: WeatherLookupInput["locale"];
  currentDate: string;
  identity: TripDayLiveContextIdentity;
  baseCurrency: string;
  targetCurrency: string;
  amount: number;
};

export type TripDayOfficialUpdatesCategory = DestinationCurrentInformationInput["category"];

export type TripDayOfficialUpdatesContextRequest = {
  action: "official_updates";
  requestId: string;
  locale: WeatherLookupInput["locale"];
  currentDate: string;
  identity: TripDayLiveContextIdentity;
  destination: TripDayLiveContextDestination;
  categories: readonly TripDayOfficialUpdatesCategory[];
};

export type TripDayLiveContextRequest =
  | TripDayWeatherContextRequest
  | TripDayCurrencyContextRequest
  | TripDayOfficialUpdatesContextRequest;

export type TripDayLiveContextFreshness = {
  class: "live" | "recent" | "dated" | "unknown" | "expired";
  retrievedAt: string;
  staleAt?: string;
  expiresAt?: string;
};

export type TripDayLiveContextResultBase = {
  requestId: string;
  currentDate: string;
  identity: TripDayLiveContextIdentity;
  status: TripDayLiveContextStatus;
  retrievedAt: string | null;
  freshness: TripDayLiveContextFreshness | null;
  source: string | null;
  sourceQuality: string | null;
  warningCodes: string[];
};

export type TripDayWeatherContextResult = TripDayLiveContextResultBase & {
  kind: "weather";
  destination: string | null;
  date: string | null;
  forecastStart: string | null;
  forecastEnd: string | null;
  units: WeatherLookupInput["units"] | null;
  daily: Array<{
    date: string;
    condition: string;
    temperatureMin: number | null;
    temperatureMax: number | null;
    precipitationChance: number | null;
  }>;
  alerts: Array<{
    title: string;
    severity: "watch" | "warning" | "advisory";
    effectiveAt?: string;
    expiresAt?: string;
  }>;
  citationCount: number;
  unavailableReason?: string;
};

export type TripDayCurrencyContextResult = TripDayLiveContextResultBase & {
  kind: "currency";
  baseCurrency: string | null;
  targetCurrency: string | null;
  amount: number | null;
  rate: number | null;
  convertedAmount: number | null;
  rateDate: string | null;
  citationCount: number;
  ratesMayChange: boolean;
  unavailableReason?: string;
};

export type TripDayOfficialFinding = {
  title: string;
  source: string;
  url: string;
  fact: string;
  sourceQuality: string;
  retrievedAt: string;
  category: TripDayOfficialUpdatesCategory;
  updatedAt?: string;
};

export type TripDayOfficialUpdatesContextResult = TripDayLiveContextResultBase & {
  kind: "official_updates";
  destination: string | null;
  categoryCount: number;
  findings: TripDayOfficialFinding[];
  citationCount: number;
  unavailableReason?: string;
};

export type TripDayLiveContextResponse =
  | TripDayWeatherContextResult
  | TripDayCurrencyContextResult
  | TripDayOfficialUpdatesContextResult;

export type TripDayRouteContext = {
  status: TripDayLiveContextStatus;
  destination: MapDestination | null;
  unavailableReason?: string;
};

export function buildTripDayLiveContextIdentity(experience: Pick<TripDayExperience, "trip" | "selectedDay" | "selectedDate" | "nextItem">): TripDayLiveContextIdentity {
  return {
    tripId: experience.trip?.id || null,
    dayId: experience.selectedDay?.id || null,
    selectedDate: experience.selectedDate || null,
    nextPlaceId: experience.nextItem?.place.logicalPlaceId || null
  };
}

export function buildTripDayLiveContextKey(identity: TripDayLiveContextIdentity) {
  return [identity.tripId || "", identity.dayId || "", identity.selectedDate || "", identity.nextPlaceId || ""].join("|");
}

export function buildTripDayWeatherRequest(input: {
  experience: Pick<TripDayExperience, "trip" | "selectedDay" | "selectedDate" | "nextItem">;
  destination: TripDayLiveContextDestination | null;
  locale: TripDayWeatherContextRequest["locale"];
  requestId?: string;
  units?: WeatherLookupInput["units"];
}): TripDayWeatherContextRequest | null {
  if (!hasCoordinate(input.destination?.latitude) || !hasCoordinate(input.destination?.longitude) || !input.experience.selectedDate) return null;
  const identity = buildTripDayLiveContextIdentity(input.experience);
  return {
    action: "weather",
    requestId: input.requestId || `trip-day-weather-${buildTripDayLiveContextKey(identity)}`,
    locale: input.locale,
    currentDate: input.experience.selectedDate,
    identity,
    destination: input.destination,
    units: input.units || "metric"
  };
}

export function buildTripDayCurrencyRequest(input: {
  experience: Pick<TripDayExperience, "trip" | "selectedDay" | "selectedDate" | "nextItem">;
  baseCurrency: string;
  targetCurrency: string;
  amount: number;
  locale: TripDayCurrencyContextRequest["locale"];
  requestId?: string;
}): TripDayCurrencyContextRequest | null {
  const identity = buildTripDayLiveContextIdentity(input.experience);
  if (!input.baseCurrency || !input.targetCurrency || !Number.isFinite(input.amount) || input.amount < 0) return null;
  return {
    action: "currency",
    requestId: input.requestId || `trip-day-currency-${buildTripDayLiveContextKey(identity)}`,
    locale: input.locale,
    currentDate: input.experience.selectedDate || new Date().toISOString().slice(0, 10),
    identity,
    baseCurrency: input.baseCurrency.trim().toUpperCase(),
    targetCurrency: input.targetCurrency.trim().toUpperCase(),
    amount: roundAmount(input.amount)
  };
}

export function buildTripDayOfficialUpdatesRequest(input: {
  experience: Pick<TripDayExperience, "trip" | "selectedDay" | "selectedDate" | "nextItem">;
  destination: TripDayLiveContextDestination | null;
  locale: TripDayOfficialUpdatesContextRequest["locale"];
  categories?: readonly TripDayOfficialUpdatesCategory[];
  requestId?: string;
}): TripDayOfficialUpdatesContextRequest | null {
  if (!input.destination?.label) return null;
  const identity = buildTripDayLiveContextIdentity(input.experience);
  return {
    action: "official_updates",
    requestId: input.requestId || `trip-day-official-${buildTripDayLiveContextKey(identity)}`,
    locale: input.locale,
    currentDate: input.experience.selectedDate || new Date().toISOString().slice(0, 10),
    identity,
    destination: input.destination,
    categories: input.categories && input.categories.length > 0 ? input.categories : ["advisory", "transport", "tourism"]
  };
}

export function resolveTripDayLiveContextDestination(input: {
  experience: Pick<TripDayExperience, "trip">;
  intelligence: DestinationIntelligence | null;
}): TripDayLiveContextDestination | null {
  const tripDestination = input.experience.trip?.destination;
  if (!tripDestination) return null;
  const label = tripDestination.label || [tripDestination.city, tripDestination.country].filter(Boolean).join(", ");
  if (!label) return null;
  const countryCode = tripDestination.countryCode?.trim().toUpperCase() || null;
  const cityName = tripDestination.city?.trim().toLowerCase() || null;
  const city = input.intelligence?.cities.find((item) => {
    if (countryCode && item.identity.countryCode !== countryCode) return false;
    if (!cityName) return false;
    return item.identity.cityName?.trim().toLowerCase() === cityName;
  }) || null;
  const country = countryCode
    ? input.intelligence?.countries.find((item) => item.identity.countryCode === countryCode) || null
    : null;
  const coordinates = city?.coordinates.status === "available" ? city.coordinates.value || null : null;
  const currency = country?.currencies.status === "available" ? country.currencies.value?.[0]?.code || undefined : undefined;
  const timezone = city?.time.status === "available"
    ? city.time.value?.cityTimeZone || city.time.value?.timeZones?.[0] || undefined
    : country?.time.status === "available"
      ? country.time.value?.cityTimeZone || country.time.value?.timeZones?.[0] || undefined
      : undefined;
  return {
    label,
    city: tripDestination.city || city?.displayName.value || undefined,
    country: tripDestination.country || country?.localizedName.value || undefined,
    countryCode: countryCode || undefined,
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    currency,
    timezone
  };
}

export function resolveTripDayRouteDestination(input: {
  experience: Pick<TripDayExperience, "trip" | "nextItem">;
  selectedMapDestination?: MapDestination | null;
}): MapDestination | null {
  if (input.selectedMapDestination) return input.selectedMapDestination;
  const nextPlace = input.experience.nextItem?.place;
  if (!nextPlace?.coordinates) return null;
  const tripCity = input.experience.trip?.destination?.city || input.experience.trip?.destination?.label || "Destination";
  return {
    name: nextPlace.name,
    city: tripCity,
    lat: nextPlace.coordinates.latitude,
    lng: nextPlace.coordinates.longitude,
    emoji: "📍",
    type: "place",
    address: nextPlace.planningNote || undefined,
    safetyNotes: nextPlace.photoCount > 0 ? "Memory photos are available for this stop." : undefined
  };
}

export function hasTripDayRouteDestination(input: {
  experience: Pick<TripDayExperience, "trip" | "nextItem">;
}) {
  return Boolean(input.experience.nextItem?.place.coordinates);
}

function roundAmount(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function hasCoordinate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}
