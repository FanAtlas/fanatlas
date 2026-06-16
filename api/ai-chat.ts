const demoAnswer =
  "Demo mode: I can help with World Cup 2026 stadiums, fan zones, hotels, eSIM, currency, SOS, translation, and app navigation. For match day, arrive early, use official transport, keep tickets saved offline, and use SOS for emergencies.";

declare const process: {
  env: Record<string, string | undefined>;
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.OPENAI_API_KEY;
  const message = String(req.body?.message || "").trim();

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  if (!key) {
    return res.status(200).json({ answer: demoAnswer, mode: "demo" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              [
                "You are FanAtlas, an AI travel and safety assistant for FIFA World Cup 2026 tourists in USA, Canada, and Mexico.",
                "Answer questions about World Cup 2026 stadiums, fan zones, travel planning, SOS and emergency guidance, translation help, hotels, eSIM connectivity, currency conversion, in-app map navigation, tickets, restaurants, and match-day planning.",
                "Keep answers short, practical, safety-aware, and app-aware.",
                "When useful, tell users which FanAtlas area to open: Home, Map, Explore, Matches, Fan Zones, Currency, Voice Translator, Hotels, eSIM, Tickets, Profile, or SOS.",
                "For emergencies, tell users to call local emergency services first: 911 in the USA and Canada, 911 in Mexico.",
                "Do not claim to book purchases or access live private account data."
              ].join(" ")
          },
          { role: "user", content: message }
        ]
      })
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: "OpenAI request failed",
        status: response.status
      });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || demoAnswer;

    return res.status(200).json({ answer, mode: "live" });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error generating AI answer",
      details: error?.message || "Unknown error"
    });
  }
}
