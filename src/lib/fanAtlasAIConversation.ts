import type { FanAtlasAIMessage, FanAtlasAIConversationSession, FanAtlasAIConsent } from "./fanAtlasAIContracts";
import {
  FANATLAS_AI_MAX_MESSAGE_LENGTH,
  FANATLAS_AI_MAX_STORED_CITATIONS_PER_MESSAGE,
  FANATLAS_AI_MAX_STORED_CONVERSATION_CHARACTERS,
  FANATLAS_AI_MAX_VISIBLE_MESSAGES,
  createDefaultFanAtlasAIConsent
} from "./fanAtlasAIContracts";

export const FANATLAS_AI_CONVERSATION_STORAGE_KEY = "fanatlas.ai.visibleConversation.v1";

export function createFanAtlasAIMessage(role: FanAtlasAIMessage["role"], content: string, now = new Date().toISOString()): FanAtlasAIMessage {
  return {
    id: `${now}-${role}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: now,
    status: role === "assistant" ? "complete" : undefined
  };
}

export function createFanAtlasAIConversation(locale: string, consent: FanAtlasAIConsent = createDefaultFanAtlasAIConsent(), now = new Date().toISOString()): FanAtlasAIConversationSession {
  return {
    id: `conversation-${now}`,
    title: "FanAtlas AI",
    createdAt: now,
    updatedAt: now,
    messages: [],
    locale,
    allowedContextScopes: ["selected_trip"],
    consent,
    usageCounters: {
      requestCount: 0,
      toolCallCount: 0
    }
  };
}

export function trimConversationMessages(messages: readonly FanAtlasAIMessage[], maxMessages = FANATLAS_AI_MAX_VISIBLE_MESSAGES) {
  const sanitized = messages
    .filter((message) => message.content.trim())
    .slice(-maxMessages)
    .map((message) => ({
      ...message,
      content: message.content.slice(0, FANATLAS_AI_MAX_MESSAGE_LENGTH),
      citations: message.citations?.slice(0, FANATLAS_AI_MAX_STORED_CITATIONS_PER_MESSAGE).map((citation) => ({ ...citation })),
      structuredOutput: normalizeStructuredOutput(message.structuredOutput)
    }));
  return sanitized.length > 1 && sanitized[0].role === "assistant" ? sanitized.slice(1) : sanitized;
}

export function serializeVisibleConversation(session: FanAtlasAIConversationSession) {
  let messages = trimConversationMessages(session.messages);
  let serialized = JSON.stringify({
    ...session,
    messages
  });
  while (serialized.length > FANATLAS_AI_MAX_STORED_CONVERSATION_CHARACTERS && messages.length > 1) {
    messages = trimConversationMessages(messages.slice(1), messages.length - 1);
    serialized = JSON.stringify({ ...session, messages });
  }
  return serialized;
}

export function parseVisibleConversation(value: string | null, locale: string): FanAtlasAIConversationSession {
  if (!value) return createFanAtlasAIConversation(locale);
  try {
    const parsed = JSON.parse(value) as Partial<FanAtlasAIConversationSession>;
    if (!Array.isArray(parsed.messages)) return createFanAtlasAIConversation(locale);
    return {
      id: String(parsed.id || `conversation-${Date.now()}`),
      title: String(parsed.title || "FanAtlas AI"),
      createdAt: String(parsed.createdAt || new Date().toISOString()),
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
      messages: trimConversationMessages(parsed.messages.map((message) => ({
        id: String(message.id || `${Date.now()}`),
        role: message.role === "user" || message.role === "assistant" || message.role === "system_notice" || message.role === "tool_notice" ? message.role : "assistant",
        content: String(message.content || ""),
        createdAt: String(message.createdAt || new Date().toISOString()),
        status: message.status,
        citations: Array.isArray(message.citations) ? message.citations : undefined,
        structuredOutput: normalizeStructuredOutput(message.structuredOutput)
      }))),
      activeTripId: parsed.activeTripId,
      locale,
      allowedContextScopes: parsed.allowedContextScopes || ["selected_trip"],
      consent: { ...createDefaultFanAtlasAIConsent(), ...parsed.consent },
      usageCounters: {
        requestCount: Number(parsed.usageCounters?.requestCount || 0),
        toolCallCount: Number(parsed.usageCounters?.toolCallCount || 0)
      }
    };
  } catch {
    return createFanAtlasAIConversation(locale);
  }
}

function normalizeStructuredOutput(value: unknown): FanAtlasAIMessage["structuredOutput"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const output = value as FanAtlasAIMessage["structuredOutput"];
  if (!output || typeof output.type !== "string" || output.version !== "1") return undefined;
  if ([
    "weather_result",
    "currency_result",
    "emergency_information",
    "current_information_result",
    "structured_itinerary",
    "destination_comparison",
    "recommendation_list",
    "safety_notice",
    "clarification_request"
  ].includes(output.type)) return output;
  return undefined;
}
