export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type TravelAssistantResponse = {
  answer: string;
};

export type TravelAssistantContext = {
  selectedMatch?: unknown;
  city?: string;
  stadium?: string;
  language?: string;
  originCountry?: string;
  destinationCountry?: string;
  destinationCity?: string;
};

export async function askTravelAssistant(
  messages: AssistantMessage[],
  context: TravelAssistantContext = {}
): Promise<TravelAssistantResponse> {
  const limitedMessages = messages.slice(-8);

  const response = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
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
    answer: data.answer
  };
}
