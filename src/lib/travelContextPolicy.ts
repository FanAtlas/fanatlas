import type {
  TravelContextFieldPolicy,
  TravelContextPermissions,
  TravelContextScope,
  TravelIntelligenceFeatureFlags,
  TravelTask
} from "./travelIntelligenceTypes";

export const DEFAULT_TRAVEL_CONTEXT_PERMISSIONS: TravelContextPermissions = {
  allowProfilePreferences: false,
  allowCurrentTrip: false,
  allowTravelHistory: false,
  allowPassport: false,
  allowInsights: false,
  allowSavedPlaces: false,
  allowItinerary: false,
  allowJournalMetadata: false,
  allowJournalContent: false,
  allowMemoryMetadata: false,
  allowImageContent: false,
  allowCurrentLocation: false,
  allowUploadedDocuments: false
};

export const DEFAULT_TRAVEL_INTELLIGENCE_FEATURE_FLAGS: TravelIntelligenceFeatureFlags = {
  travelIntelligenceFoundation: true,
  fanAtlasAI: false,
  aiProviderCalls: false,
  aiToolExecution: false,
  aiImageUnderstanding: false,
  aiDocumentAnalysis: false,
  aiTravelResearch: false,
  aiWriteActions: false,
  aiDeveloperDiagnostics: false
};

export const JOURNAL_CONTENT_TASKS: TravelTask[] = ["trip_reflection", "memory_summary", "travel_summary"];
export const CURRENT_INFORMATION_TASKS: TravelTask[] = [
  "emergency_guidance",
  "visa_rule_research",
  "customs_rule_research",
  "transport_guidance",
  "place_recommendation",
  "budget_guidance"
];

export const HIGH_STAKES_TASKS: TravelTask[] = [
  "emergency_guidance",
  "safety_guidance",
  "visa_rule_research",
  "customs_rule_research",
  "budget_guidance"
];

export const TRAVEL_CONTEXT_FIELD_POLICIES: TravelContextFieldPolicy[] = [
  {
    field: "trip.title",
    classification: "personal",
    defaultAllowed: false,
    permittedTasks: ["trip_planning", "itinerary_generation", "itinerary_revision", "travel_summary", "trip_reflection"],
    requiresExplicitConsent: false,
    includeInLogs: false,
    retention: "ephemeral"
  },
  {
    field: "trip.travelDates",
    classification: "sensitive",
    defaultAllowed: false,
    permittedTasks: ["trip_planning", "itinerary_generation", "itinerary_revision", "packing_guidance", "travel_summary"],
    requiresExplicitConsent: true,
    includeInLogs: false,
    retention: "ephemeral"
  },
  {
    field: "trip.itinerary",
    classification: "personal",
    defaultAllowed: false,
    permittedTasks: ["trip_planning", "itinerary_generation", "itinerary_revision", "transport_guidance", "travel_summary"],
    requiresExplicitConsent: false,
    includeInLogs: false,
    retention: "ephemeral"
  },
  {
    field: "journal.metadata",
    classification: "personal",
    defaultAllowed: false,
    permittedTasks: ["trip_reflection", "memory_summary", "travel_summary", "travel_insight_explanation"],
    requiresExplicitConsent: false,
    includeInLogs: false,
    retention: "ephemeral"
  },
  {
    field: "journal.body",
    classification: "sensitive",
    defaultAllowed: false,
    permittedTasks: JOURNAL_CONTENT_TASKS,
    requiresExplicitConsent: true,
    includeInLogs: false,
    retention: "none"
  },
  {
    field: "memory.photoIds",
    classification: "sensitive",
    defaultAllowed: false,
    permittedTasks: [],
    requiresExplicitConsent: true,
    includeInLogs: false,
    retention: "none"
  },
  {
    field: "location.precise",
    classification: "sensitive",
    defaultAllowed: false,
    permittedTasks: ["emergency_guidance"],
    requiresExplicitConsent: true,
    includeInLogs: false,
    retention: "none"
  }
];

export function canIncludeField(field: string, task: TravelTask, explicitlyAllowed: boolean) {
  const policy = TRAVEL_CONTEXT_FIELD_POLICIES.find((entry) => entry.field === field);
  if (!policy) return true;
  if (!policy.permittedTasks.includes(task)) return false;
  if (policy.requiresExplicitConsent && !explicitlyAllowed) return false;
  return policy.defaultAllowed || explicitlyAllowed;
}

export function taskRequiresCurrentInformation(task: TravelTask) {
  return CURRENT_INFORMATION_TASKS.includes(task);
}

export function taskIsHighStakes(task: TravelTask) {
  return HIGH_STAKES_TASKS.includes(task);
}

export function scopesInclude(scopes: readonly TravelContextScope[], scope: TravelContextScope) {
  return scopes.includes(scope);
}
