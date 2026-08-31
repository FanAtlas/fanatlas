import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { deriveTravelExplorer } from "../lib/travelExplorer";
import { deriveTravelInsights } from "../lib/travelInsights";
import { deriveTravelPassport } from "../lib/travelPassport";
import {
  FANATLAS_AI_CONVERSATION_STORAGE_KEY,
  createFanAtlasAIConversation,
  createFanAtlasAIMessage,
  parseVisibleConversation,
  serializeVisibleConversation,
  trimConversationMessages
} from "../lib/fanAtlasAIConversation";
import { FANATLAS_AI_API_VERSION, FANATLAS_AI_MAX_MESSAGE_LENGTH, createDefaultFanAtlasAIConsent, type FanAtlasAIConsent } from "../lib/fanAtlasAIContracts";
import { sendFanAtlasAIRequest } from "../lib/fanAtlasAIClient";
import { buildSafeAIContextSnapshot } from "../lib/fanAtlasAISerialization";
import type { TravelContextScope, TravelTask } from "../lib/travelIntelligenceTypes";
import { useTripDrafts } from "./useTripDrafts";

export function useFanAtlasAI(locale: string) {
  const { drafts } = useTripDrafts([]);
  const [conversation, setConversation] = useState(() => {
    if (typeof window === "undefined") return createFanAtlasAIConversation(locale);
    return parseVisibleConversation(localStorage.getItem(FANATLAS_AI_CONVERSATION_STORAGE_KEY), locale);
  });
  const [input, setInput] = useState("");
  const [consent, setConsent] = useState<FanAtlasAIConsent>(() => conversation.consent || createDefaultFanAtlasAIConsent());
  const [activeTripId, setActiveTripId] = useState<string>(conversation.activeTripId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toolActivity, setToolActivity] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const currentDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const passport = useMemo(() => deriveTravelPassport(drafts, { currentDate, generatedAt: "session" }), [currentDate, drafts]);
  const insights = useMemo(() => deriveTravelInsights(drafts, { currentDate, generatedAt: "session" }), [currentDate, drafts]);
  const explorer = useMemo(() => deriveTravelExplorer({ trips: drafts, passport, insights, currentDate }), [currentDate, drafts, insights, passport]);
  const activeTrip = useMemo(() => drafts.find((draft) => draft.id === activeTripId) || drafts[0], [activeTripId, drafts]);

  useEffect(() => {
    localStorage.setItem(FANATLAS_AI_CONVERSATION_STORAGE_KEY, serializeVisibleConversation({
      ...conversation,
      activeTripId,
      consent,
      locale
    }));
  }, [activeTripId, consent, conversation, locale]);

  async function sendMessage(text?: string, taskHint?: TravelTask) {
    const content = (text || input).trim();
    if (!content || loading) return;
    if (content.length > FANATLAS_AI_MAX_MESSAGE_LENGTH) {
      setError("fanAtlasAI.error.tooLong");
      return;
    }
    const userMessage = createFanAtlasAIMessage("user", content);
    const pendingMessage = createFanAtlasAIMessage("assistant", "fanAtlasAI.message.preparing");
    pendingMessage.status = "sending";
    setConversation((current) => ({
      ...current,
      messages: trimConversationMessages([...current.messages, userMessage, pendingMessage]),
      updatedAt: new Date().toISOString()
    }));
    setInput("");
    setError("");
    setToolActivity(["fanAtlasAI.loading.understanding", "fanAtlasAI.loading.context"]);
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) throw Object.assign(new Error("fanAtlasAI.error.unauthenticated"), { code: "unauthenticated" });

      const response = await sendFanAtlasAIRequest({
        version: FANATLAS_AI_API_VERSION,
        conversationId: conversation.id,
        messages: trimConversationMessages(conversation.messages.filter((message) => message.status !== "sending")),
        message: content,
        taskHint,
        activeTripId: activeTrip?.id,
        requestedContextScopes: ([
          [consent.allowActiveTrip, "selected_trip"],
          [consent.allowPassportHistory, "passport_history"],
          [consent.allowTravelInsights, "travel_insights"],
          [consent.allowJournalMetadata, "journal_metadata"],
          [consent.allowJournalContent, "journal_content"]
        ] as Array<[boolean, TravelContextScope]>).flatMap(([allowed, scope]) => allowed ? [scope] : []),
        consent,
        locale,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        clientRequestId: userMessage.id,
        contextSnapshot: buildSafeAIContextSnapshot({
          trip: consent.allowActiveTrip ? activeTrip : undefined,
          passport: consent.allowPassportHistory ? passport : undefined,
          insights: consent.allowTravelInsights ? insights : undefined,
          explorer
        })
      }, { accessToken: token, signal: controller.signal });

      setToolActivity(response.toolActivity.map((activity) => activity.label));
      const assistant = response.message
        || createFanAtlasAIMessage(
          "assistant",
          response.clarification?.questionKey || (response.errorCode ? `fanAtlasAI.error.${response.errorCode}` : "fanAtlasAI.error.failed")
        );
      if (response.structuredOutput) assistant.structuredOutput = response.structuredOutput;
      setConversation((current) => ({
        ...current,
        messages: trimConversationMessages(current.messages.filter((message) => message.status !== "sending").concat({ ...assistant, status: "complete" })),
        usageCounters: {
          requestCount: current.usageCounters.requestCount + 1,
          toolCallCount: current.usageCounters.toolCallCount + response.usage.toolCallCount
        },
        updatedAt: new Date().toISOString()
      }));
    } catch (caught) {
      if ((caught as Error).name === "AbortError") {
        setConversation((current) => ({
          ...current,
          messages: current.messages.map((message) => message.status === "sending" ? { ...message, content: "fanAtlasAI.message.stopped", status: "stopped" } : message)
        }));
      } else {
        setError((caught as Error).message || "fanAtlasAI.error.failed");
        setConversation((current) => ({
          ...current,
          messages: current.messages.map((message) => message.status === "sending" ? { ...message, content: "fanAtlasAI.error.failed", status: "failed" } : message)
        }));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function clearConversation() {
    setConversation(createFanAtlasAIConversation(locale, consent));
    setToolActivity([]);
    setError("");
  }

  function retryLast() {
    const lastUser = [...conversation.messages].reverse().find((message) => message.role === "user");
    if (lastUser) sendMessage(lastUser.content);
  }

  return {
    activeTrip,
    activeTripId,
    consent,
    conversation,
    drafts,
    error,
    input,
    loading,
    toolActivity,
    cancel,
    clearConversation,
    retryLast,
    sendMessage,
    setActiveTripId,
    setConsent,
    setInput
  };
}
