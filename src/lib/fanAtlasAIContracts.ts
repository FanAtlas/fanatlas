import type {
  TravelClarificationRequest,
  TravelContextScope,
  TravelIntelligenceWarning,
  TravelStructuredOutput,
  TravelTask
} from "./travelIntelligenceTypes";

export const FANATLAS_AI_API_VERSION = "1" as const;
export const FANATLAS_AI_MAX_MESSAGE_LENGTH = 4000;
export const FANATLAS_AI_MAX_VISIBLE_MESSAGES = 50;
export const FANATLAS_AI_MAX_STORED_CONVERSATION_CHARACTERS = 60000;
export const FANATLAS_AI_MAX_STORED_CITATIONS_PER_MESSAGE = 5;

export type FanAtlasAIMessageRole = "user" | "assistant" | "system_notice" | "tool_notice";
export type FanAtlasAIMessageStatus = "sending" | "complete" | "failed" | "stopped";
export type FanAtlasAIReleaseMode = "disabled" | "internal" | "beta" | "production";
export type FanAtlasAIGroundingType = "user_message" | "fanatlas_context" | "tool_result" | "general_model_knowledge" | "uncertain";
export type FanAtlasAISourceCategory =
  | "official_government"
  | "official_embassy"
  | "official_transport"
  | "official_tourism"
  | "official_airport"
  | "official_emergency"
  | "recognized_weather"
  | "authoritative_health"
  | "reputable_secondary"
  | "unknown";

export type FanAtlasAIMessage = {
  id: string;
  role: FanAtlasAIMessageRole;
  content: string;
  createdAt: string;
  status?: FanAtlasAIMessageStatus;
  citations?: TravelCitation[];
  structuredOutputId?: string;
  structuredOutput?: TravelStructuredOutput;
  warningCodes?: string[];
};

export type FanAtlasAIConsent = {
  allowActiveTrip: boolean;
  allowTravelPreferences: boolean;
  allowPassportHistory: boolean;
  allowTravelInsights: boolean;
  allowSavedPlaces: boolean;
  allowJournalMetadata: boolean;
  allowJournalContent: boolean;
  allowCurrentLocation: boolean;
};

export type FanAtlasAIConversationSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: FanAtlasAIMessage[];
  activeTripId?: string;
  locale: string;
  allowedContextScopes: TravelContextScope[];
  consent: FanAtlasAIConsent;
  usageCounters: {
    requestCount: number;
    toolCallCount: number;
  };
};

export type SafeTravelContextSnapshot = {
  activeTrip?: {
    id: string;
    title: string;
    status: string;
    startDate?: string;
    endDate?: string;
    destinationLabel?: string;
    itineraryDayCount: number;
    plannedPlaceCount: number;
    visitedPlaceCount: number;
    journalEntryCount: number;
    photoCount: number;
  };
  passport?: {
    visitedCountryCount: number;
    visitedCityCount: number;
  };
  insights?: {
    completedTrips: number;
    averageTripLength: number;
    topCountries: string[];
  };
  explorer?: {
    countryCount: number;
    cityCount: number;
    routeCount: number;
  };
};

export type FanAtlasAIRequest = {
  version: typeof FANATLAS_AI_API_VERSION;
  conversationId?: string;
  messages: FanAtlasAIMessage[];
  message: string;
  taskHint?: TravelTask;
  activeTripId?: string;
  selectedDestinationIds?: string[];
  requestedContextScopes?: TravelContextScope[];
  consent: FanAtlasAIConsent;
  locale: string;
  timezone?: string;
  clientRequestId: string;
  contextSnapshot?: SafeTravelContextSnapshot;
};

export type FanAtlasAIResponseStatus = "completed" | "clarification_required" | "blocked" | "failed";

export type TravelCitationCategory =
  | "weather"
  | "currency"
  | "official"
  | "research"
  | "application"
  | FanAtlasAISourceCategory;

export type TravelCitation = {
  id: string;
  title: string;
  source: string;
  url?: string;
  retrievedAt: string;
  updatedAt?: string;
  category: TravelCitationCategory;
};

export type SafeToolActivity = {
  id: string;
  label: string;
  status: "planned" | "completed" | "blocked" | "failed";
};

export type SafeUsageSummary = {
  contextSizeClass: "tiny" | "small" | "medium" | "large";
  toolCallCount: number;
  modelCallCount: number;
  responseLengthClass: "short" | "medium" | "long";
};

export type FanAtlasAIResponse = {
  version: typeof FANATLAS_AI_API_VERSION;
  requestId: string;
  conversationId: string;
  status: FanAtlasAIResponseStatus;
  message?: FanAtlasAIMessage;
  clarification?: TravelClarificationRequest;
  structuredOutput?: TravelStructuredOutput;
  citations: TravelCitation[];
  toolActivity: SafeToolActivity[];
  warnings: TravelIntelligenceWarning[];
  usage: SafeUsageSummary;
  errorCode?: FanAtlasAIErrorCode;
};

export type FanAtlasAIErrorCode =
  | "ai_disabled"
  | "unauthenticated"
  | "invalid_request"
  | "context_permission_denied"
  | "provider_unavailable"
  | "provider_rate_limited"
  | "provider_timeout"
  | "ai_temporarily_unavailable"
  | "request_already_processing"
  | "idempotency_conflict"
  | "coordination_unavailable"
  | "minute_limit_reached"
  | "daily_limit_reached"
  | "request_expired"
  | "tool_unavailable"
  | "tool_failed"
  | "current_information_unavailable"
  | "invalid_provider_output"
  | "usage_limit_reached"
  | "request_cancelled"
  | "server_error";

export type ProviderNeutralMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderNeutralGenerationRequest = {
  requestId: string;
  modelProfileId: string;
  messages: ProviderNeutralMessage[];
  maxOutputCharacters: number;
  locale: string;
};

export type ProviderGenerationOptions = {
  signal?: AbortSignal;
  timeoutMs: number;
};

export type ProviderNeutralGenerationResult = {
  content: string;
  usage: {
    inputCharacters: number;
    outputCharacters: number;
    modelCalls: number;
  };
};

export type TravelAIProviderGateway = {
  generate(
    request: ProviderNeutralGenerationRequest,
    options: ProviderGenerationOptions
  ): Promise<ProviderNeutralGenerationResult>;
};

export function createDefaultFanAtlasAIConsent(): FanAtlasAIConsent {
  return {
    allowActiveTrip: true,
    allowTravelPreferences: false,
    allowPassportHistory: false,
    allowTravelInsights: false,
    allowSavedPlaces: false,
    allowJournalMetadata: false,
    allowJournalContent: false,
    allowCurrentLocation: false
  };
}
