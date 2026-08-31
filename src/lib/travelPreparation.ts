import type { CountryIntelligence, DestinationIntelligence, DestinationTransportInfo } from "./destinationIntelligenceTypes";
import { resolveDestinationId } from "./destinationHub";
import type {
  PlanningAction,
  TripDraft,
  TripPreparationReminderOccurrence,
  TripPreparationReminderPhase,
  TripPreparationReminderSettings
} from "./tripDrafts";

export type TravelPreparationSectionId =
  | "essentials"
  | "documents"
  | "money"
  | "language"
  | "power"
  | "safety"
  | "transport"
  | "packing"
  | "destination";

export type TravelPreparationSuggestion = {
  id: string;
  sectionId: TravelPreparationSectionId;
  text: string;
  source: "fanatlas_suggested";
  highStakes: boolean;
  recommendedPhase: TravelPreparationPhase;
  importance: TravelPreparationImportance;
};

export type TravelPreparationAction = {
  action: PlanningAction;
  sectionId: TravelPreparationSectionId;
  source: "fanatlas_suggested" | "user_created";
  highStakes: boolean;
  suggestionId: string | null;
  recommendedPhase: TravelPreparationPhase;
  importance: TravelPreparationImportance;
};

export type TravelPreparationSection = {
  id: TravelPreparationSectionId;
  titleKey: string;
  suggestions: TravelPreparationSuggestion[];
  actions: TravelPreparationAction[];
  completed: number;
  total: number;
};

export type TravelPreparationProgress = {
  total: number;
  completed: number;
  remaining: number;
  completionPercent: number;
  status: "not_started" | "in_progress" | "ready";
};

export type TravelPreparationDates = {
  daysUntilTrip: number | null;
  durationDays: number | null;
  daysSinceTripEnded: number | null;
  proximity: "unknown" | "past" | "today" | "soon" | "upcoming" | "later";
};

export type TravelPreparationDataQuality = {
  destinationResolved: boolean;
  hasTravelDates: boolean;
  hasVerifiedEmergency: boolean;
  entryNeedsCurrentReview: boolean;
  metadataIncomplete: boolean;
  highStakesWarning: boolean;
};

export type TravelPreparationPhase = "anytime" | "early" | "week_before" | "day_before" | "departure_day" | "trip_started" | "trip_ended";

export type TravelPreparationImportance = "standard" | "important";

export type TravelPreparationNoticeId =
  | "destination_unresolved"
  | "no_travel_dates"
  | "emergency_unverified"
  | "entry_current_info_required"
  | "destination_metadata_incomplete"
  | "trip_started"
  | "trip_ended";

export type TravelPreparationNotice = {
  id: TravelPreparationNoticeId;
  textKey: string;
  importance: TravelPreparationImportance;
};

export type TravelPreparationReadinessState = "getting_started" | "in_progress" | "nearly_ready" | "ready_with_notices" | "ready";

export type TravelPreparationReadiness = {
  checklistCompletionPercent: number;
  requiredAttentionCount: number;
  unresolvedInformationCount: number;
  currentPhase: TravelPreparationPhase;
  readyState: TravelPreparationReadinessState;
  summaryKey: string;
};

export type TravelPreparationGroupId = "focus_now" | "coming_up" | "later" | "completed";

export type TravelPreparationGroup = {
  id: TravelPreparationGroupId;
  titleKey: string;
  actions: TravelPreparationAction[];
};

export type TravelPreparationReminderKind = "checklist" | "current_information";

export type TravelPreparationDueReminder = {
  id: string;
  phase: TripPreparationReminderPhase;
  kind: TravelPreparationReminderKind;
  titleKey: string;
  bodyKey: string;
  acknowledged: boolean;
  notified: boolean;
};

export type TravelPreparationReminderSummary = {
  settings: TripPreparationReminderSettings;
  due: TravelPreparationDueReminder[];
};

export type TravelPreparation = {
  trip: TripDraft | null;
  destinationId: string | null;
  country: CountryIntelligence | null;
  sections: TravelPreparationSection[];
  suggestions: TravelPreparationSuggestion[];
  progress: TravelPreparationProgress;
  dates: TravelPreparationDates;
  dataQuality: TravelPreparationDataQuality;
  phase: TravelPreparationPhase;
  notices: TravelPreparationNotice[];
  readiness: TravelPreparationReadiness;
  groups: TravelPreparationGroup[];
  reminders: TravelPreparationReminderSummary;
};

export type TravelPreparationReconciliation = {
  actionsToAdd: TravelPreparationSuggestion[];
  obsoleteSuggestions: PlanningAction[];
  duplicateSuggestions: PlanningAction[];
  unchanged: boolean;
};

const SECTION_ORDER: TravelPreparationSectionId[] = ["essentials", "documents", "money", "language", "power", "safety", "transport", "packing", "destination"];
const SECTION_TITLE_KEYS: Record<TravelPreparationSectionId, string> = {
  essentials: "travelPreparation.sections.essentials",
  documents: "travelPreparation.sections.documents",
  money: "travelPreparation.sections.money",
  language: "travelPreparation.sections.language",
  power: "travelPreparation.sections.power",
  safety: "travelPreparation.sections.safety",
  transport: "travelPreparation.sections.transport",
  packing: "travelPreparation.sections.packing",
  destination: "travelPreparation.sections.destination"
};

export function deriveTravelPreparation(input: {
  trip: TripDraft | null;
  intelligence: DestinationIntelligence;
  originCountryCode?: string;
  now?: Date;
}): TravelPreparation {
  const trip = input.trip;
  const country = trip ? resolvePreparationCountry(trip, input.intelligence) : null;
  const destinationId = trip?.destination ? resolveDestinationId(trip.destination) : null;
  const suggestions = trip ? deriveTravelPreparationTemplate({ trip, country, originCountryCode: input.originCountryCode }) : [];
  const actions = mapActionsToPreparation(trip?.planningActions || [], suggestions);
  const sections = SECTION_ORDER.map((sectionId) => {
    const sectionActions = actions.filter((item) => item.sectionId === sectionId);
    return {
      id: sectionId,
      titleKey: SECTION_TITLE_KEYS[sectionId],
      suggestions: suggestions.filter((item) => item.sectionId === sectionId),
      actions: sectionActions,
      completed: sectionActions.filter((item) => item.action.completed).length,
      total: sectionActions.length
    };
  }).filter((section) => section.total > 0 || section.suggestions.length > 0);
  const progress = progressForActions(actions.map((item) => item.action));
  const dates = derivePreparationDates(trip?.travelDates, input.now || new Date());
  const phase = deriveTravelPreparationPhase(trip?.travelDates, input.now || new Date());
  const hasVerifiedEmergency = country?.emergency.status === "available" &&
    (country.emergency.value?.verificationState === "locally_reviewed" || country.emergency.value?.verificationState === "verified");
  const dataQuality = {
    destinationResolved: Boolean(country),
    hasTravelDates: Boolean(trip?.travelDates?.startDate),
    hasVerifiedEmergency,
    entryNeedsCurrentReview: country?.entry.informationClass === "HIGH_STAKES_CURRENT_INFORMATION",
    metadataIncomplete: Boolean(country && (
      country.currencies.status !== "available" ||
      country.languages.status !== "available" ||
      country.time.status !== "available" ||
      country.electrical.status !== "available"
    )),
    highStakesWarning: !hasVerifiedEmergency || country?.entry.informationClass === "HIGH_STAKES_CURRENT_INFORMATION"
  };
  const notices = deriveTravelPreparationNotices({ trip, country, dates, phase, dataQuality });
  const readiness = deriveTravelPreparationReadiness({ actions, progress, phase, notices });
  const reminders = deriveTravelPreparationDueReminders({
    trip,
    settings: trip?.preparationReminderSettings,
    occurrences: trip?.preparationReminderOccurrences,
    progress,
    notices,
    now: input.now || new Date()
  });

  return {
    trip,
    destinationId,
    country,
    sections,
    suggestions,
    progress,
    dates,
    dataQuality,
    phase,
    notices,
    readiness,
    groups: groupTravelPreparationActions({ actions, currentPhase: phase }),
    reminders
  };
}

export function deriveTravelPreparationTemplate(input: { trip: TripDraft; country: CountryIntelligence | null; originCountryCode?: string }): TravelPreparationSuggestion[] {
  const country = input.country;
  const currency = country?.currencies.value?.[0];
  const languages = country?.languages.value || [];
  const electrical = country?.electrical.value;
  const transport = country?.transport.value;
  const multiTimezone = (country?.time.value?.timeZones.length || 0) > 1;
  const destinationLabel = input.trip.destination?.label || input.trip.destination?.country || input.trip.destination?.city;
  const isKnownDomestic = Boolean(input.originCountryCode && country?.identity.countryCode === input.originCountryCode);

  const suggestions: TravelPreparationSuggestion[] = [
    suggestion("prep.essentials.confirm-dates", "essentials", "Confirm trip dates and arrival details", "early", true),
    suggestion("prep.essentials.offline-confirmations", "essentials", "Keep important confirmations available offline", "day_before"),
    suggestion("prep.packing.basic-review", "packing", "Pack trip essentials for the planned duration", "day_before")
  ];

  if (isKnownDomestic) {
    suggestions.push(suggestion("prep.documents.domestic-id", "documents", "Keep required ID and confirmations available", "early", true));
  } else {
    suggestions.push(
      suggestion("prep.documents.review-travel-documents", "documents", "Check passport or travel document validity", "early", true),
      suggestion("prep.documents.review-entry-info", "documents", "Review official entry requirements before travel", "early", true)
    );
  }

  if (destinationLabel) suggestions.push(suggestion("prep.destination.review-guide", "destination", "Review the Destination Guide", "early"));
  if (currency) suggestions.push(suggestion(`prep.money.review-currency.${currency.code}`, "money", `Review destination currency (${currency.code})`, "week_before"));
  if (languages.length) suggestions.push(suggestion("prep.language.open-translator", "language", "Open Translator and prepare key phrases", "week_before"));
  if (electrical?.plugTypes.length || electrical?.voltage || electrical?.voltages?.length) suggestions.push(suggestion("prep.power.review-power", "power", "Review power and plug compatibility", "early"));
  if (country?.emergency.status === "available") suggestions.push(suggestion("prep.safety.review-emergency", "safety", "Review emergency information in SOS", "week_before", true));
  else suggestions.push(suggestion("prep.safety.review-official-emergency", "safety", "Review official emergency information before travel", "week_before", true));
  if (transport && hasTransportCapability(transport)) suggestions.push(suggestion("prep.transport.review-arrival", "transport", "Review arrival and local transportation options", "week_before"));
  if (multiTimezone) suggestions.push(suggestion("prep.essentials.review-timezones", "essentials", "Review destination timezones", "week_before"));

  return suggestions;
}

export function reconcileTravelPreparation(input: {
  existingActions: readonly PlanningAction[];
  suggestions: readonly TravelPreparationSuggestion[];
}): TravelPreparationReconciliation {
  const seenSuggestionIds = new Set<string>();
  const existingSuggestionTexts = new Set<string>();
  const duplicateSuggestions: PlanningAction[] = [];

  for (const action of input.existingActions) {
    const suggestion = findSuggestionForAction(action, input.suggestions);
    if (!suggestion) continue;
    if (seenSuggestionIds.has(suggestion.id)) duplicateSuggestions.push(action);
    seenSuggestionIds.add(suggestion.id);
    existingSuggestionTexts.add(normalizeText(action.text));
  }

  const actionsToAdd = input.suggestions.filter((suggestion) => !existingSuggestionTexts.has(normalizeText(suggestion.text)));
  const activeSuggestionTexts = new Set(input.suggestions.map((item) => normalizeText(item.text)));
  const obsoleteSuggestions = input.existingActions.filter((action) => isKnownPreparationSuggestion(action.text) && !activeSuggestionTexts.has(normalizeText(action.text)));

  return {
    actionsToAdd,
    obsoleteSuggestions,
    duplicateSuggestions,
    unchanged: actionsToAdd.length === 0 && obsoleteSuggestions.length === 0 && duplicateSuggestions.length === 0
  };
}

export function isKnownPreparationSuggestion(text: string) {
  const normalized = normalizeText(text);
  return KNOWN_SUGGESTION_TEXTS.has(normalized);
}

export function derivePreparationDates(
  travelDates: TripDraft["travelDates"] | undefined,
  now: Date
): TravelPreparationDates {
  if (!travelDates?.startDate) return { daysUntilTrip: null, durationDays: null, daysSinceTripEnded: null, proximity: "unknown" };
  const start = parseDateOnly(travelDates.startDate);
  if (!start) return { daysUntilTrip: null, durationDays: null, daysSinceTripEnded: null, proximity: "unknown" };
  const today = parseDateOnly(now.toISOString().slice(0, 10)) || now;
  const daysUntilTrip = Math.round((start.getTime() - today.getTime()) / 86_400_000);
  const end = travelDates.endDate ? parseDateOnly(travelDates.endDate) : null;
  const durationDays = end && end >= start ? Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1 : null;
  const daysSinceTripEnded = end && today > end ? Math.round((today.getTime() - end.getTime()) / 86_400_000) : null;
  return {
    daysUntilTrip,
    durationDays,
    daysSinceTripEnded,
    proximity: daysUntilTrip < 0 ? "past" : daysUntilTrip === 0 ? "today" : daysUntilTrip <= 7 ? "soon" : daysUntilTrip <= 30 ? "upcoming" : "later"
  };
}

export function deriveTravelPreparationPhase(
  travelDates: TripDraft["travelDates"] | undefined,
  now: Date
): TravelPreparationPhase {
  if (!travelDates?.startDate) return "anytime";
  const dates = derivePreparationDates(travelDates, now);
  if (dates.daysSinceTripEnded !== null) return "trip_ended";
  if (dates.daysUntilTrip === null) return "anytime";
  if (dates.daysUntilTrip < 0) return "trip_started";
  if (dates.daysUntilTrip === 0) return "departure_day";
  if (dates.daysUntilTrip === 1) return "day_before";
  if (dates.daysUntilTrip <= 7) return "week_before";
  return "early";
}

export function deriveTravelPreparationNotices(input: {
  trip: TripDraft | null;
  country: CountryIntelligence | null;
  dates: TravelPreparationDates;
  phase: TravelPreparationPhase;
  dataQuality: TravelPreparationDataQuality;
}): TravelPreparationNotice[] {
  const notices: TravelPreparationNotice[] = [];
  if (input.trip && !input.dataQuality.destinationResolved) notices.push(notice("destination_unresolved", "travelPreparation.notices.destinationUnresolved", "important"));
  if (!input.dataQuality.hasTravelDates) notices.push(notice("no_travel_dates", "travelPreparation.notices.noTravelDates"));
  if (!input.dataQuality.hasVerifiedEmergency) notices.push(notice("emergency_unverified", "travelPreparation.notices.emergencyUnverified", "important"));
  if (input.dataQuality.entryNeedsCurrentReview) notices.push(notice("entry_current_info_required", "travelPreparation.notices.entryCurrentInfoRequired", "important"));
  if (input.dataQuality.metadataIncomplete) notices.push(notice("destination_metadata_incomplete", "travelPreparation.notices.metadataIncomplete"));
  if (input.phase === "trip_started") notices.push(notice("trip_started", "travelPreparation.notices.tripStarted"));
  if (input.phase === "trip_ended") notices.push(notice("trip_ended", "travelPreparation.notices.tripEnded"));
  return notices;
}

export function deriveTravelPreparationReadiness(input: {
  actions: readonly TravelPreparationAction[];
  progress: TravelPreparationProgress;
  phase: TravelPreparationPhase;
  notices: readonly TravelPreparationNotice[];
}): TravelPreparationReadiness {
  const focusNow = input.actions.filter((item) => !item.action.completed && phaseRank(item.recommendedPhase) <= phaseRank(input.phase));
  const unresolvedInformationCount = input.notices.filter((item) => item.importance === "important").length;
  const readyState: TravelPreparationReadinessState = input.progress.completionPercent === 100
    ? unresolvedInformationCount > 0 ? "ready_with_notices" : "ready"
    : input.progress.completionPercent >= 80 ? "nearly_ready"
      : input.progress.completed > 0 ? "in_progress" : "getting_started";
  return {
    checklistCompletionPercent: input.progress.completionPercent,
    requiredAttentionCount: focusNow.length,
    unresolvedInformationCount,
    currentPhase: input.phase,
    readyState,
    summaryKey: `travelPreparation.readiness.${readyState}`
  };
}

export function groupTravelPreparationActions(input: {
  actions: readonly TravelPreparationAction[];
  currentPhase: TravelPreparationPhase;
}): TravelPreparationGroup[] {
  const groups: TravelPreparationGroup[] = [
    { id: "focus_now", titleKey: "travelPreparation.groups.focusNow", actions: [] },
    { id: "coming_up", titleKey: "travelPreparation.groups.comingUp", actions: [] },
    { id: "later", titleKey: "travelPreparation.groups.later", actions: [] },
    { id: "completed", titleKey: "travelPreparation.groups.completed", actions: [] }
  ];
  for (const action of input.actions) {
    if (action.action.completed) groups[3].actions.push(action);
    else if (phaseRank(action.recommendedPhase) <= phaseRank(input.currentPhase)) groups[0].actions.push(action);
    else if (phaseRank(action.recommendedPhase) <= phaseRank(nextPhase(input.currentPhase))) groups[1].actions.push(action);
    else groups[2].actions.push(action);
  }
  return groups;
}

export function defaultTravelPreparationReminderSettings(): TripPreparationReminderSettings {
  return {
    enabled: false,
    phases: ["week_before", "day_before", "departure_day"]
  };
}

export function enabledTravelPreparationReminderSettings(): TripPreparationReminderSettings {
  return {
    enabled: true,
    phases: ["week_before", "day_before", "departure_day"]
  };
}

export function deriveTravelPreparationDueReminders(input: {
  trip: TripDraft | null;
  settings?: TripPreparationReminderSettings;
  occurrences?: readonly TripPreparationReminderOccurrence[];
  progress: TravelPreparationProgress;
  notices: readonly TravelPreparationNotice[];
  now: Date;
}): TravelPreparationReminderSummary {
  const settings = input.settings || defaultTravelPreparationReminderSettings();
  const occurrenceMap = new Map((input.occurrences || []).map((occurrence) => [occurrence.occurrenceId, occurrence]));
  if (!input.trip || !settings.enabled || !input.trip.travelDates?.startDate) return { settings, due: [] };
  const currentReminderPhase = deriveCurrentReminderPhase(input.trip.travelDates, input.now);
  if (!currentReminderPhase || !settings.phases.includes(currentReminderPhase)) return { settings, due: [] };

  const due: TravelPreparationDueReminder[] = [];
  const importantNoticeCount = input.notices.filter((notice) => notice.importance === "important").length;
  if (input.progress.completionPercent < 100) {
    due.push(reminder(input.trip.id, input.trip.travelDates.startDate, currentReminderPhase, "checklist", occurrenceMap));
  } else if (importantNoticeCount > 0) {
    due.push(reminder(input.trip.id, input.trip.travelDates.startDate, currentReminderPhase, "current_information", occurrenceMap));
  }
  return { settings, due: due.filter((item) => !item.acknowledged) };
}

export function createTravelPreparationReminderId(input: {
  tripId: string;
  startDate: string;
  phase: TripPreparationReminderPhase;
  kind?: TravelPreparationReminderKind;
}) {
  return `prep-reminder:${input.tripId}:${input.startDate}:${input.phase}:${input.kind || "checklist"}`;
}

function resolvePreparationCountry(trip: TripDraft, intelligence: DestinationIntelligence) {
  const destinationId = trip.destination ? resolveDestinationId(trip.destination) : null;
  if (!destinationId) return null;
  const city = intelligence.cities.find((item) => item.identity.id === destinationId);
  const countryCode = city?.country.countryCode || destinationId.replace(/^country:/, "");
  return intelligence.countries.find((item) => item.identity.countryCode === countryCode) || null;
}

function mapActionsToPreparation(actions: readonly PlanningAction[], suggestions: readonly TravelPreparationSuggestion[]): TravelPreparationAction[] {
  return actions.map((action) => {
    const suggestion = findSuggestionForAction(action, suggestions);
    return {
      action,
      sectionId: suggestion?.sectionId || "essentials",
      source: suggestion ? "fanatlas_suggested" : "user_created",
      highStakes: Boolean(suggestion?.highStakes),
      suggestionId: suggestion?.id || null,
      recommendedPhase: suggestion?.recommendedPhase || "anytime",
      importance: suggestion?.importance || "standard"
    };
  });
}

function findSuggestionForAction(action: PlanningAction, suggestions: readonly TravelPreparationSuggestion[]) {
  const normalized = normalizeText(action.text);
  return suggestions.find((suggestion) => normalizeText(suggestion.text) === normalized);
}

function progressForActions(actions: readonly PlanningAction[]): TravelPreparationProgress {
  const total = actions.length;
  const completed = actions.filter((item) => item.completed).length;
  const completionPercent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return {
    total,
    completed,
    remaining: total - completed,
    completionPercent,
    status: total === 0 || completed === 0 ? "not_started" : completed === total ? "ready" : "in_progress"
  };
}

function hasTransportCapability(transport: DestinationTransportInfo) {
  return Object.values(transport).some((value) => value === "available" || value === "limited");
}

function phaseRank(phase: TravelPreparationPhase) {
  return PHASE_RANK[phase] ?? 0;
}

function nextPhase(phase: TravelPreparationPhase): TravelPreparationPhase {
  if (phase === "anytime") return "early";
  if (phase === "early") return "week_before";
  if (phase === "week_before") return "day_before";
  if (phase === "day_before") return "departure_day";
  return phase;
}

function deriveCurrentReminderPhase(
  travelDates: TripDraft["travelDates"],
  now: Date
): TripPreparationReminderPhase | null {
  const dates = derivePreparationDates(travelDates, now);
  if (dates.daysSinceTripEnded !== null || dates.daysUntilTrip === null || dates.daysUntilTrip < 0) return null;
  if (dates.daysUntilTrip === 0) return "departure_day";
  if (dates.daysUntilTrip === 1) return "day_before";
  if (dates.daysUntilTrip === 7) return "week_before";
  if (dates.daysUntilTrip > 7) return "early";
  return null;
}

function reminder(
  tripId: string,
  startDate: string,
  phase: TripPreparationReminderPhase,
  kind: TravelPreparationReminderKind,
  occurrenceMap: ReadonlyMap<string, TripPreparationReminderOccurrence>
): TravelPreparationDueReminder {
  const id = createTravelPreparationReminderId({ tripId, startDate, phase, kind });
  const occurrence = occurrenceMap.get(id);
  return {
    id,
    phase,
    kind,
    titleKey: kind === "current_information" ? "travelPreparation.reminders.currentInfoTitle" : `travelPreparation.reminders.title.${phase}`,
    bodyKey: kind === "current_information" ? "travelPreparation.reminders.currentInfoBody" : `travelPreparation.reminders.body.${phase}`,
    acknowledged: Boolean(occurrence?.acknowledgedAt),
    notified: Boolean(occurrence?.notifiedAt)
  };
}

function notice(id: TravelPreparationNoticeId, textKey: string, importance: TravelPreparationImportance = "standard"): TravelPreparationNotice {
  return { id, textKey, importance };
}

function suggestion(
  id: string,
  sectionId: TravelPreparationSectionId,
  text: string,
  recommendedPhase: TravelPreparationPhase,
  highStakes = false
): TravelPreparationSuggestion {
  return { id, sectionId, text, source: "fanatlas_suggested", highStakes, recommendedPhase, importance: highStakes ? "important" : "standard" };
}

function normalizeText(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const KNOWN_SUGGESTION_TEXTS = new Set([
  "confirm trip dates and arrival details",
  "keep important confirmations available offline",
  "keep required id and confirmations available",
  "check passport or travel document validity",
  "review official entry requirements before travel",
  "pack trip essentials for the planned duration",
  "review the destination guide",
  "open translator and prepare key phrases",
  "review power and plug compatibility",
  "review emergency information in sos",
  "review official emergency information before travel",
  "review arrival and local transportation options",
  "review destination timezones",
  "review destination currency (usd)",
  "review destination currency (cad)",
  "review destination currency (mxn)",
  "review destination currency (mad)",
  "review destination currency (eur)",
  "review destination currency (gbp)",
  "review destination currency (jpy)",
  "review destination currency (brl)"
]);

const PHASE_RANK: Record<TravelPreparationPhase, number> = {
  anytime: 0,
  early: 1,
  week_before: 2,
  day_before: 3,
  departure_day: 4,
  trip_started: 5,
  trip_ended: 6
};
