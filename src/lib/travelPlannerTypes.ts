export const TRAVEL_PLANNER_PROFILE_VERSION = 1 as const;

export type TravelPlanningPace = "relaxed" | "balanced" | "active";
export type TravelPlanningInterest = "food" | "coffee" | "history" | "culture" | "museums" | "architecture" | "nature" | "beaches" | "shopping" | "nightlife" | "family" | "photography" | "sports" | "wellness" | "local_experiences";
export type TravelPlanningBudgetStyle = "budget" | "moderate" | "premium" | "flexible";
export type TravelPlanningPartyType = "solo" | "couple" | "family" | "friends" | "business" | "group";
export type TravelPlanningWalkingTolerance = "low" | "moderate" | "high";
export type TravelPlanningTimeOfDay = "morning" | "afternoon" | "evening" | "any";
export type TravelPlanningCandidateSource = "manual" | "existing_itinerary" | "reservation_anchor" | "destination_data";
export type TravelPlanningCostLevel = "budget" | "moderate" | "premium";

export type TravelPlanningProfile = {
  version: typeof TRAVEL_PLANNER_PROFILE_VERSION;
  pace: TravelPlanningPace;
  interests: TravelPlanningInterest[];
  budgetStyle: TravelPlanningBudgetStyle;
  partyType: TravelPlanningPartyType;
  walkingTolerance: TravelPlanningWalkingTolerance;
  preferPublicTransportation: boolean;
  preferTaxiOrRideshare: boolean;
  avoidExcessiveWalking: boolean;
  wheelchairAccessibilityRequired: boolean;
  preferredDayStart: string;
  preferredDayEnd: string;
  preferredLunchWindow?: { start: string; end: string };
  preferredDinnerWindow?: { start: string; end: string };
};

export type TravelPlanningCandidate = {
  id: string;
  title: string;
  category: string;
  estimatedDurationMinutes: number;
  preferredTimeOfDay: TravelPlanningTimeOfDay;
  interestTags: TravelPlanningInterest[];
  costLevel?: TravelPlanningCostLevel;
  destinationId?: string;
  location?: { latitude: number; longitude: number; label?: string };
  priority?: number;
  source: TravelPlanningCandidateSource;
  planningNotes?: string;
};

export type TravelPlanningFixedCommitment = {
  id: string;
  date?: string;
  endDate?: string;
  start?: string;
  end?: string;
  startTimezone?: string;
  endTimezone?: string;
  timing: "timed" | "untimed";
  title: string;
  kind: "reservation" | "locked_itinerary";
  source: "reservation_anchor" | "locked_itinerary";
  status: "confirmed" | "pending" | "locked";
  relatedEntityId: string;
  locationLabel?: string;
};

export type TravelPlanningConflictCode = "TIME_OVERLAP" | "OUTSIDE_DAY_WINDOW" | "INSUFFICIENT_TIME" | "FIXED_COMMITMENT_CONFLICT" | "UNKNOWN_TRAVEL_TIME" | "UNSCHEDULED_CANDIDATE";
export type TravelPlanningConflict = { code: TravelPlanningConflictCode; severity: "info" | "warning" | "blocking"; date?: string; relatedIds: string[]; metadata?: Record<string, string | number | boolean> };

export type TravelPlanningScoreReason = "USER_PRIORITY" | "INTEREST_MATCH" | "PREFERRED_TIME_MATCH" | "DURATION_FIT" | "BUDGET_MATCH" | "LOCATION_GROUPING";

export type TravelPlanningCandidateScore = {
  candidateId: string;
  score: number;
  reasonCodes: TravelPlanningScoreReason[];
};

export type TravelPlanningScheduledActivity = {
  id: string;
  candidateId: string;
  date: string;
  dayId: string;
  start: string;
  end: string;
  score: TravelPlanningCandidateScore;
};

export type TravelPlanningMealWindow = {
  id: string;
  date: string;
  kind: "OPEN_LUNCH_WINDOW" | "OPEN_DINNER_WINDOW";
  start: string;
  end: string;
  affectedByFixedCommitment: boolean;
};

export type TravelPlanningBuffer = {
  id: string;
  date: string;
  start: string;
  end: string;
  kind: "PLANNING_BUFFER";
};

export type TravelPlanningPreviewDay = {
  id: string;
  date: string;
  itineraryDayId?: string;
  availableStart: string;
  availableEnd: string;
  fixedCommitmentIds: string[];
  scheduledActivities: TravelPlanningScheduledActivity[];
  mealWindows: TravelPlanningMealWindow[];
  planningBuffers: TravelPlanningBuffer[];
};

export type TravelPlanningUnscheduledCandidate = {
  candidateId: string;
  reasonCodes: ("UNKNOWN_DURATION" | "INSUFFICIENT_TIME" | "PACE_LIMIT")[];
};

export type TravelPlanPreviewState = "ready" | "ready_with_warnings" | "cannot_plan" | "trip_ended" | "undated";

export type TravelPlanPreview = {
  schemaVersion: 1;
  tripDraftId: string;
  state: TravelPlanPreviewState;
  basis: string;
  days: TravelPlanningPreviewDay[];
  fixedCommitments: TravelPlanningFixedCommitment[];
  scheduledActivities: TravelPlanningScheduledActivity[];
  mealWindows: TravelPlanningMealWindow[];
  planningBuffers: TravelPlanningBuffer[];
  unscheduledCandidates: TravelPlanningUnscheduledCandidate[];
  conflicts: TravelPlanningConflict[];
  warnings: TravelPlanningConflict[];
};

export type TravelPlanApplyError = "invalid_preview" | "preview_trip_mismatch" | "stale_preview";
export type TravelPlanApplyResult<T> = { ok: true; value: T } | { ok: false; error: TravelPlanApplyError };
