import type { SavedPlace } from "./savedPlaces";
import type { TravelExplorer } from "./travelExplorerTypes";
import type { TravelInsights } from "./travelInsightsTypes";
import type { TravelPassport } from "./travelPassportTypes";
import type { TripDraft } from "./tripDrafts";

export const TRAVEL_CONTEXT_SCHEMA_VERSION = "2026-07-30.1";
export const TRAVEL_ORCHESTRATION_POLICY_VERSION = "2026-07-30.1";
export const TRAVEL_TOOL_REGISTRY_VERSION = "2026-07-30.1";
export const TRAVEL_CAPABILITY_REGISTRY_VERSION = "2026-07-30.1";
export const TRAVEL_OUTPUT_SCHEMA_VERSION = "2026-07-30.1";

export type TravelTask =
  | "general_travel_question"
  | "trip_planning"
  | "itinerary_generation"
  | "itinerary_revision"
  | "destination_comparison"
  | "place_recommendation"
  | "budget_guidance"
  | "packing_guidance"
  | "safety_guidance"
  | "emergency_guidance"
  | "language_assistance"
  | "translation"
  | "document_analysis"
  | "visa_rule_research"
  | "customs_rule_research"
  | "transport_guidance"
  | "map_reasoning"
  | "image_understanding"
  | "landmark_recognition"
  | "menu_translation"
  | "travel_summary"
  | "trip_reflection"
  | "memory_summary"
  | "travel_insight_explanation"
  | "saved_place_organization";

export type TravelUrgency = "low" | "normal" | "urgent" | "background" | "research";
export type TravelOutputFormat =
  | "plain_text"
  | "structured_itinerary"
  | "destination_comparison"
  | "recommendation_list"
  | "safety_notice"
  | "translation"
  | "document_summary"
  | "tool_request"
  | "clarification_request";

export type TravelContextScope =
  | "none"
  | "current_user"
  | "current_trip"
  | "selected_trip"
  | "selected_destination"
  | "current_location"
  | "passport_history"
  | "travel_insights"
  | "saved_places"
  | "itinerary"
  | "journal_metadata"
  | "journal_content"
  | "memory_metadata"
  | "image_content"
  | "uploaded_document"
  | "emergency_context";

export type TravelPrivacyClass = "public" | "application" | "personal" | "sensitive" | "highly_sensitive";
export type TravelRetentionPolicy = "none" | "ephemeral" | "safe_trace";
export type TravelContextWarningCode =
  | "missing_trip"
  | "missing_destination"
  | "missing_dates"
  | "incomplete_itinerary"
  | "permission_denied"
  | "sensitive_context_excluded"
  | "current_information_required"
  | "external_tool_required"
  | "unsupported_task"
  | "insufficient_context"
  | "ambiguous_destination"
  | "location_precision_reduced"
  | "context_trimmed";
export type TravelIntelligenceStatus = "ready" | "blocked" | "needs_clarification" | "feature_disabled";
export type TravelIntelligenceWarning = TravelContextWarning;
export type TravelIntelligenceErrorCode =
  | "invalid_request"
  | "unsupported_task"
  | "permission_denied"
  | "context_unavailable"
  | "context_too_large"
  | "no_capable_model"
  | "required_tool_disabled"
  | "external_research_required"
  | "user_confirmation_required"
  | "sensitive_data_blocked"
  | "feature_disabled";

export type TravelContextPermissions = {
  allowProfilePreferences: boolean;
  allowCurrentTrip: boolean;
  allowTravelHistory: boolean;
  allowPassport: boolean;
  allowInsights: boolean;
  allowSavedPlaces: boolean;
  allowItinerary: boolean;
  allowJournalMetadata: boolean;
  allowJournalContent: boolean;
  allowMemoryMetadata: boolean;
  allowImageContent: boolean;
  allowCurrentLocation: boolean;
  allowUploadedDocuments: boolean;
};

export type TravelIntelligenceConstraints = {
  usagePolicy: TravelUsagePolicy;
  maxContextCharacters: number;
  allowSensitiveContext: boolean;
  allowHighStakesWithoutCurrentInfo: boolean;
};

export type TravelUserIntent = {
  rawText?: string;
  normalizedIntent: string;
  task: TravelTask;
  urgency: TravelUrgency;
  destinationIds: string[];
  tripIds: string[];
  requestedOutput: TravelOutputFormat;
  requiresCurrentInformation: boolean;
  requiresUserPrivateContext: boolean;
  requiresExternalTools: boolean;
};

export type TravelIntelligenceRequest = {
  id: string;
  task: TravelTask;
  scope: TravelContextScope[];
  userIntent: TravelUserIntent;
  permissions: TravelContextPermissions;
  constraints: TravelIntelligenceConstraints;
  locale: string;
  timezone?: string;
  createdAt: string;
};

export type TravelContextText = {
  value: string;
  source: TravelContextProvenanceSource;
  trust: "trusted_application" | "user_authored" | "external_untrusted";
};

export type TravelUserContext = {
  preferredLanguage?: string;
  homeCountry?: string;
  travelStyle?: string;
  budgetPreference?: string;
  accessibilityPreferences?: string[];
  dietaryPreferences?: string[];
  transportationPreferences?: string[];
  preferredPace?: string;
  interests?: string[];
  supportedCurrencies?: string[];
};

export type TravelTripContext = {
  id: string;
  title: TravelContextText;
  status: "completed" | "planned" | "draft" | "archived";
  startDate?: string;
  endDate?: string;
  destinations: TravelDestinationContext[];
  itinerarySummary?: {
    dayCount: number;
    plannedPlaceCount: number;
    visitedPlaceCount: number;
    plannedActivities: TravelContextText[];
  };
  completionStatus?: string;
};

export type TravelDestinationContext = {
  id: string;
  countryCode?: string;
  canonicalCountryName?: string;
  localizedDisplayName?: string;
  city?: string;
  travelStatus: "visited" | "planned" | "wishlist" | "unknown";
  plannedDates?: { startDate?: string; endDate?: string };
  visitHistory?: {
    firstVisitDate?: string;
    latestVisitDate?: string;
    visitCount: number;
    returnDestination: boolean;
  };
  savedPlaceCategories?: string[];
  coordinates?: { latitude: number; longitude: number; precision: "city" | "approximate" | "precise" };
};

export type TravelPassportContext = {
  visitedCountryCount: number;
  visitedCityCount: number;
  selectedDestinationHistory: TravelDestinationContext[];
};

export type TravelInsightsContext = {
  averageTripDuration: number;
  travelFrequencyYears: number;
  mostVisitedCountries: string[];
  mostVisitedCities: string[];
  seasonalPatterns: string[];
};

export type TravelSavedPlacesContext = {
  count: number;
  places: Array<{
    id: string;
    name: TravelContextText;
    type: string;
    city?: string;
    country?: string;
  }>;
};

export type TravelJournalContext = {
  entryCount: number;
  favoriteCount: number;
  entries?: Array<{
    id: string;
    title?: TravelContextText;
    body?: TravelContextText;
    entryDate?: string;
    favorite: boolean;
    status: string;
  }>;
};

export type TravelMemoryContext = {
  photoCount: number;
  favoriteCount: number;
  tripIds: string[];
  destinationIds: string[];
};

export type TravelLocationPrecision = "none" | "country" | "region" | "city" | "approximate" | "precise";
export type TravelLocationContextValue = {
  precision: TravelLocationPrecision;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
};

export type TravelDocumentContext = {
  id: string;
  name: TravelContextText;
  kind: string;
  characterCount: number;
};

export type TravelContextProvenanceSource =
  | "profile"
  | "trip_drafts"
  | "passport"
  | "insights"
  | "explorer"
  | "journal"
  | "memory_gallery"
  | "saved_places"
  | "current_location"
  | "user_message"
  | "external_tool";

export type TravelContextProvenance = {
  source: TravelContextProvenanceSource;
  path?: string;
  classification: TravelPrivacyClass;
  included: boolean;
  reason: string;
};

export type TravelContextPrivacySummary = {
  highestClassification: TravelPrivacyClass;
  includesPersonalData: boolean;
  includesSensitiveData: boolean;
  includesHighlySensitiveData: boolean;
  excludedSensitiveFields: number;
};

export type TravelContextWarning = {
  code: TravelContextWarningCode;
  messageKey: string;
  severity: "info" | "warning" | "blocking";
};

export type TravelContext = {
  schemaVersion: string;
  requestId: string;
  user?: TravelUserContext;
  trip?: TravelTripContext;
  destinations: TravelDestinationContext[];
  itinerary?: TravelTripContext["itinerarySummary"];
  passport?: TravelPassportContext;
  insights?: TravelInsightsContext;
  savedPlaces?: TravelSavedPlacesContext;
  journal?: TravelJournalContext;
  memories?: TravelMemoryContext;
  location?: TravelLocationContextValue;
  documents?: TravelDocumentContext[];
  provenance: TravelContextProvenance[];
  privacy: TravelContextPrivacySummary;
  warnings: TravelContextWarning[];
  estimatedCharacters: number;
};

export type TravelContextSummary = {
  hasUserPreferences: boolean;
  hasTrip: boolean;
  destinationCount: number;
  hasDates: boolean;
  hasItinerary: boolean;
  hasTravelHistory: boolean;
  hasCurrentLocation: boolean;
  includesSensitiveData: boolean;
  estimatedSize: number;
};

export type TravelContextFieldPolicy = {
  field: string;
  classification: TravelPrivacyClass;
  defaultAllowed: boolean;
  permittedTasks: TravelTask[];
  requiresExplicitConsent: boolean;
  includeInLogs: boolean;
  retention: TravelRetentionPolicy;
};

export type BuildTravelContextInput = {
  request: TravelIntelligenceRequest;
  profile?: TravelUserContext;
  trips?: readonly TripDraft[];
  passport?: TravelPassport;
  insights?: TravelInsights;
  explorer?: TravelExplorer;
  savedPlaces?: readonly SavedPlace[];
  currentLocation?: TravelLocationContextValue;
  documents?: readonly TravelDocumentContext[];
};

export type TravelToolId =
  | "weather_lookup"
  | "place_search"
  | "route_planning"
  | "currency_conversion"
  | "emergency_services_lookup"
  | "visa_rules_lookup"
  | "customs_rules_lookup"
  | "flight_search"
  | "hotel_search"
  | "restaurant_search"
  | "event_search"
  | "translation"
  | "image_analysis"
  | "document_analysis"
  | "itinerary_read"
  | "saved_places_read"
  | "passport_summary_read"
  | "travel_insights_read";

export type TravelToolKind = "read" | "suggest" | "write" | "external_action";

export type TravelToolDefinition = {
  id: TravelToolId;
  name: string;
  description: string;
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
  privacyLevel: TravelPrivacyClass;
  kind: TravelToolKind;
  enabled: boolean;
  requiresNetwork: boolean;
  requiresLocation: boolean;
  requiresConfirmation: boolean;
  requiredPermissions: (keyof TravelContextPermissions)[];
  minimumLocationPrecision: TravelLocationPrecision;
  acceptedPrivacyClasses: TravelPrivacyClass[];
  returnedPrivacyClasses: TravelPrivacyClass[];
  supportedTasks: TravelTask[];
};

export type TravelToolValidation = {
  allowed: boolean;
  blockedReasons: string[];
  requiresConfirmation: boolean;
};

export type TravelToolPlanStep = {
  id: string;
  toolId: TravelToolId;
  purpose: string;
  inputProjection: Record<string, unknown>;
  dependsOn: string[];
  status: "planned" | "blocked" | "disabled";
  blockedReasons: string[];
};

export type TravelToolPlan = {
  steps: TravelToolPlanStep[];
  canExecute: boolean;
  requiresConfirmation: boolean;
  blockedReasons: string[];
};

export type TravelModelCapability =
  | "conversation"
  | "itinerary_generation"
  | "structured_output"
  | "long_context"
  | "document_analysis"
  | "image_understanding"
  | "map_reasoning"
  | "translation"
  | "multilingual_response"
  | "tool_calling"
  | "low_latency"
  | "high_reasoning"
  | "low_cost"
  | "local_execution";

export type TravelModelProvider = "primary_concierge" | "visual_location" | "long_document" | "local_model";

export type TravelModelProfile = {
  id: string;
  provider: TravelModelProvider;
  enabled: boolean;
  capabilities: TravelModelCapability[];
  maxContextClass: "small" | "medium" | "large";
  latencyClass: "fast" | "standard" | "slow";
  costClass: "low" | "medium" | "high";
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  supportsImages: boolean;
  supportsDocuments: boolean;
  supportedLocales: string[];
};

export type TravelUsagePolicy = {
  mode: "economy" | "balanced" | "premium";
  maxCostClass: "low" | "medium" | "high";
  maxToolCalls: number;
  allowFallback: boolean;
  allowExternalResearch: boolean;
  allowImageAnalysis: boolean;
  allowDocumentAnalysis: boolean;
};

export type TravelUsageEstimate = {
  contextSizeClass: "tiny" | "small" | "medium" | "large";
  expectedModelCalls: number;
  expectedToolCalls: number;
  estimatedCostClass: "none" | "low" | "medium" | "high";
  estimatedLatencyClass: "instant" | "fast" | "standard" | "slow";
};

export type OrchestrationInput = {
  task: TravelTask;
  urgency: TravelUrgency;
  contextSummary: TravelContextSummary;
  requiredCapabilities: TravelModelCapability[];
  tools: TravelToolPlan;
  constraints: TravelIntelligenceConstraints;
  availableModels: TravelModelProfile[];
  locale: string;
};

export type OrchestrationDecision = {
  status: "selected" | "blocked" | "fallback" | "unsupported";
  primaryModelId?: string;
  fallbackModelIds: string[];
  requiredCapabilities: TravelModelCapability[];
  reasonCodes: string[];
  estimatedCostClass: "none" | "low" | "medium" | "high";
  requiresExternalTools: boolean;
  requiresUserConfirmation: boolean;
};

export type TravelIntelligenceResult = {
  requestId: string;
  status: TravelIntelligenceStatus;
  orchestration: OrchestrationDecision;
  contextSummary: TravelContextSummary;
  toolPlan: TravelToolPlan;
  usageEstimate: TravelUsageEstimate;
  warnings: TravelIntelligenceWarning[];
};

export type TravelTraceStep = {
  id: string;
  event:
    | "intent_received"
    | "permissions_checked"
    | "context_built"
    | "context_trimmed"
    | "tools_planned"
    | "capabilities_resolved"
    | "model_selected"
    | "request_blocked";
  reasonCodes: string[];
  safeMetadata: Record<string, string | number | boolean>;
};

export type TravelIntelligenceTrace = {
  requestId: string;
  task: TravelTask;
  steps: TravelTraceStep[];
  privacySummary: TravelContextPrivacySummary;
  finalDecision: OrchestrationDecision;
};

export type TravelSafeLogRecord = {
  requestId: string;
  task: TravelTask;
  capabilityRequirements: TravelModelCapability[];
  selectedModelId?: string;
  toolIds: TravelToolId[];
  reasonCodes: string[];
  latencyClass: TravelUsageEstimate["estimatedLatencyClass"];
  costClass: TravelUsageEstimate["estimatedCostClass"];
  warningCodes: TravelContextWarningCode[];
  context: {
    hasTrip: boolean;
    destinationCount: number;
    hasTravelHistory: boolean;
    hasCurrentLocation: boolean;
    includesSensitiveData: boolean;
    sizeClass: TravelUsageEstimate["contextSizeClass"];
  };
};

export type TravelPromptSection =
  | { role: "system_policy"; content: string; trust: "trusted_application" }
  | { role: "application_instructions"; content: string; trust: "trusted_application" }
  | { role: "user_request"; content: TravelContextText; trust: "user_authored" }
  | { role: "structured_context"; context: TravelContext; trust: "trusted_application" }
  | { role: "tool_results"; content: TravelContextText[]; trust: "external_untrusted" };

export type TravelClarificationRequest = {
  code: string;
  questionKey: string;
  requiredFields: string[];
  options?: Array<{ id: string; labelKey: string }>;
};

export type TravelStructuredOutput =
  | { type: "plain_text"; version: string }
  | { type: "structured_itinerary"; version: string; days: Array<{ title: string; items: string[] }> }
  | { type: "destination_comparison"; version: string; destinations: string[] }
  | { type: "recommendation_list"; version: string; items: Array<{ title: string; reason: string }> }
  | { type: "safety_notice"; version: string; notices: string[] }
  | { type: "translation"; version: string; sourceLocale?: string; targetLocale: string }
  | { type: "document_summary"; version: string; sectionCount: number }
  | { type: "tool_request"; version: string; toolIds: TravelToolId[] }
  | { type: "clarification_request"; version: string; clarification: TravelClarificationRequest };

export type TravelIntelligenceFeatureFlags = {
  travelIntelligenceFoundation: boolean;
  fanAtlasAI: boolean;
  aiProviderCalls: boolean;
  aiToolExecution: boolean;
  aiImageUnderstanding: boolean;
  aiDocumentAnalysis: boolean;
  aiTravelResearch: boolean;
  aiWriteActions: boolean;
  aiDeveloperDiagnostics: boolean;
};
