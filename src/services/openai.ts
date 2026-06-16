export type TravelAssistantResponse = {
  answer: string;
  error?: string;
  mode: "live" | "demo";
};

const demoAnswer =
  "Demo mode: I can help with World Cup 2026 stadiums, fan zones, hotels, eSIM, currency, SOS, translation, and app navigation. For match day, arrive early, use official transport, keep tickets saved offline, and use SOS for emergencies.";

export async function askTravelAssistant(message: string): Promise<TravelAssistantResponse> {
  try {
    const res = await fetch("/api/ai-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    if (!res.ok) {
      return {
        answer: demoAnswer,
        error: `AI backend returned ${res.status}.`,
        mode: "demo"
      };
    }

    const data = await res.json();
    return {
      answer: data.answer || demoAnswer,
      error: data.error,
      mode: data.mode === "live" ? "live" : "demo"
    };
  } catch (error: any) {
    return {
      answer: demoAnswer,
      error: error?.message || "AI backend is unavailable locally.",
      mode: "demo"
    };
  }
}
