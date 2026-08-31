import type { FanAtlasAIErrorCode, FanAtlasAIRequest, FanAtlasAIResponseStatus, TravelCitation } from "./fanAtlasAIContracts";
import type { TravelTask } from "./travelIntelligenceTypes";

export type FanAtlasAIEvaluationCategory =
  | "ordinary_travel"
  | "trip_context"
  | "clarification"
  | "current_information"
  | "high_stakes"
  | "privacy"
  | "prompt_injection"
  | "tool_safety"
  | "citation"
  | "output_validation"
  | "provider_failure"
  | "localization";

export type FanAtlasAIEvaluationInput = {
  request?: FanAtlasAIRequest;
  providerOutput?: {
    content: string;
    citations?: TravelCitation[];
    currentInformationVerified?: boolean;
    highStakes?: boolean;
    executedCitationIds?: string[];
  };
};

export type FanAtlasAIEvaluationExpectation = {
  expectedStatus?: FanAtlasAIResponseStatus;
  expectedErrorCode?: FanAtlasAIErrorCode;
  expectedTask?: TravelTask;
  requiredWarningCodes?: string[];
  requiredClarificationFields?: string[];
  requiredCitationCount?: number;
  prohibitedSecretStrings?: string[];
  maximumOutputLength?: number;
};

export type FanAtlasAIEvaluationCase = {
  id: string;
  version: string;
  category: FanAtlasAIEvaluationCategory;
  input: FanAtlasAIEvaluationInput;
  expected: FanAtlasAIEvaluationExpectation;
  tags: string[];
};

export type FanAtlasAIEvaluationResult = {
  id: string;
  category: FanAtlasAIEvaluationCategory;
  passed: boolean;
  failures: string[];
};
