import { supabase } from "../lib/supabase";

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiUsage = {
  month: string;
  messagesUsed: number;
  messagesLimit: number;
  limitReached: boolean;
};

export type TravelAssistantResponse = {
  answer: string;
  usage?: AiUsage;
};

export type TravelAssistantContext = {
  selectedMatch?: unknown;
  city?: string;
  stadium?: string;
  language?: string;
};

async function authHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  const { data } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };
  const token = data.session?.access_token;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function getTravelAssistantUsage(): Promise<AiUsage> {
  const response = await fetch("/api/ai", {
    method: "GET",
    headers: await authHeaders()
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `AI backend returned ${response.status}.`);
  }

  if (!data.usage) {
    throw new Error("AI backend returned no usage data.");
  }

  return data.usage;
}

export async function askTravelAssistant(
  messages: AssistantMessage[],
  context: TravelAssistantContext = {}
): Promise<TravelAssistantResponse> {
  const limitedMessages = messages.slice(-8);

  const response = await fetch("/api/ai", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ messages: limitedMessages, ...context })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `AI backend returned ${response.status}.`);
  }

  if (!data.answer) {
    throw new Error("AI backend returned an empty answer.");
  }

  return {
    answer: data.answer,
    usage: data.usage
  };
}
