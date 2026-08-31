import type { FanAtlasAIErrorCode, TravelCitation } from "./fanAtlasAIContracts";
import { FANATLAS_AI_MAX_MESSAGE_LENGTH } from "./fanAtlasAIContracts";
import { normalizeTravelCitations } from "./fanAtlasAICitations";
import { isHighStakesSourceCategory } from "./fanAtlasAIProductionPolicy";

const FORBIDDEN_OUTPUT_PATTERNS = [
  /sk-[A-Za-z0-9_-]{6,}/g,
  /OPENAI_API_KEY\s*=\s*\S+/gi,
  /ANTHROPIC_API_KEY\s*=\s*\S+/gi,
  /GOOGLE_API_KEY\s*=\s*\S+/gi,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/gi,
  /SUPABASE_[A-Z_]*KEY\s*=\s*\S+/gi,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /Authorization:\s*Bearer\s+[A-Za-z0-9._-]+/gi,
  /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\b/g,
  /fanatlas_trip_drafts_v\d+/gi,
  /fanatlas_photo_[A-Za-z0-9_-]+/gi,
  /storage\/v1\/object\/[A-Za-z0-9_./-]+/gi,
  /SECRET_[A-Z0-9_]+/g,
  /INTERNAL_SYSTEM_POLICY_[A-Z0-9_]+/g
];

const UNSUPPORTED_ACTION_PATTERNS = [
  /\bI(?:'ve| have)?\s+(booked|changed|modified|saved|deleted|purchased|bought|contacted|shared|sent)\b/i,
  /\b(your|the)\s+(hotel|flight|ticket|reservation|booking)\s+(is|has been)\s+(booked|confirmed|purchased)\b/i,
  /\bI\s+(updated|edited)\s+your\s+(trip|itinerary|saved places)\b/i
];

const CURRENT_FACT_PATTERNS = [
  /\bchecked\s+(current|live)\s+(sources|information)\b/i,
  /\bI\s+(looked up|verified|checked)\s+(today|currently|live|latest)\b/i,
  /\b(current|today's|live)\s+(weather|exchange rate|visa requirement|entry requirement|customs rule|safety alert)\b/i,
  /\b(the\s+)?(visa|entry)\s+(requirement|rule)s?\s+(is|are)\b/i,
  /\bexchange\s+rate\s+(is|currently)\b/i
];

const UNSAFE_MARKUP_PATTERNS = [
  /<\s*script\b/i,
  /<\s*iframe\b/i,
  /data\s*:/i,
  /javascript\s*:/i
];

export type ValidatedAIOutput = {
  ok: true;
  content: string;
  citations: TravelCitation[];
} | {
  ok: false;
  errorCode: FanAtlasAIErrorCode;
};

export function validateProviderTextOutput(input: {
  content: unknown;
  citations?: readonly TravelCitation[];
  retrievedAt: string;
  maxCharacters?: number;
  currentInformationVerified?: boolean;
  highStakes?: boolean;
  executedCitationIds?: readonly string[];
}): ValidatedAIOutput {
  if (typeof input.content !== "string") return { ok: false, errorCode: "invalid_provider_output" };
  const trimmed = input.content.trim();
  if (!trimmed) return { ok: false, errorCode: "invalid_provider_output" };
  const max = input.maxCharacters || FANATLAS_AI_MAX_MESSAGE_LENGTH;
  if (trimmed.length > max) return { ok: false, errorCode: "invalid_provider_output" };
  if (UNSAFE_MARKUP_PATTERNS.some((pattern) => pattern.test(trimmed))) return { ok: false, errorCode: "invalid_provider_output" };
  if (UNSUPPORTED_ACTION_PATTERNS.some((pattern) => pattern.test(trimmed))) return { ok: false, errorCode: "invalid_provider_output" };
  if (!input.currentInformationVerified && CURRENT_FACT_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return { ok: false, errorCode: "invalid_provider_output" };
  }
  const content = redactSensitiveOutput(trimmed);
  const citations = normalizeTravelCitations(input.citations || [], input.retrievedAt);
  if (!validateCitationIntegrity(citations, input.executedCitationIds, Boolean(input.highStakes))) {
    return { ok: false, errorCode: "invalid_provider_output" };
  }
  return {
    ok: true,
    content,
    citations
  };
}

export function redactSensitiveOutput(value: string) {
  return FORBIDDEN_OUTPUT_PATTERNS.reduce((current, pattern) => current.replace(pattern, "[redacted]"), value)
    .replace(/javascript:/gi, "blocked:")
    .replace(/data:/gi, "blocked:");
}

export function validateCitationIntegrity(citations: readonly TravelCitation[], executedCitationIds: readonly string[] | undefined, highStakes: boolean) {
  const executed = executedCitationIds ? new Set(executedCitationIds) : undefined;
  if (executed && citations.some((citation) => !executed.has(citation.id))) return false;
  if (citations.some((citation) => citation.url?.startsWith("http://") && highStakes)) return false;
  if (highStakes && citations.length > 0 && citations.every((citation) => !isHighStakesSourceCategory(citation.category))) return false;
  return true;
}
