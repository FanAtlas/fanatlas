declare const process: {
  env: Record<string, string | undefined>;
};

const MAX_USER_MESSAGE_LENGTH = 800;
const MAX_CONVERSATION_MESSAGES = 8;
const AI_MODEL = "gpt-4o-mini";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const supportedLanguages: Record<string, string> = {
  en: "English",
  english: "English",
  es: "Spanish",
  spanish: "Spanish",
  fr: "French",
  french: "French",
  ar: "Arabic",
  arabic: "Arabic",
  pt: "Portuguese",
  portuguese: "Portuguese"
};

const baseSystemPrompt = [
  "You are FanAtlas, a World Cup 2026 travel concierge for fans visiting the USA, Canada, and Mexico.",
  "Help with match day planning, stadium guidance, fan zones, hotels, restaurants, transportation, SOS and emergency guidance, eSIM and internet, currency, safety tips, before-travel checklists, after-arrival checklists, and during-stay tips.",
  "Known host stadiums include MetLife Stadium, Estadio Azteca, SoFi Stadium, BMO Field, AT&T Stadium, BC Place, Lumen Field, Levi's Stadium, Rose Bowl, NRG Stadium, Mercedes-Benz Stadium, Hard Rock Stadium, Arrowhead Stadium, Lincoln Financial Field, Gillette Stadium, Estadio Akron, and Estadio BBVA.",
  "When suggesting app actions, name the FanAtlas page or action clearly, such as Matches, Match Day, Map, SOS, Hotels, Explore, Fan Zones, Currency, Tickets, or Profile.",
  "For emergencies, always remind users to call local emergency services first: USA 911, Canada 911, Mexico 911.",
  "Do not give medical or legal guarantees. Do not claim to book hotels, buy tickets, call emergency services, access private account data, or perform actions outside FanAtlas.",
  "Keep answers concise, practical, and safety-aware. Ask one clarifying question only when it is necessary."
].join(" ");

function normalizeMessages(raw: any, singleMessage: any): ChatMessage[] {
  const input = Array.isArray(raw)
    ? raw
    : singleMessage
      ? [{ role: "user", content: singleMessage }]
      : [];

  return input
    .map((message) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: String(message?.content || message?.text || "").trim()
    }))
    .filter((message) => message.content)
    .slice(-MAX_CONVERSATION_MESSAGES);
}

function contextPrompt(body: any) {
  const context = [
    body?.selectedMatch ? `Selected match: ${JSON.stringify(body.selectedMatch)}` : "",
    body?.city ? `Current city: ${String(body.city)}` : "",
    body?.stadium ? `Current stadium: ${String(body.stadium)}` : ""
  ].filter(Boolean);

  const rawLanguage = String(body?.language || body?.userLanguage || "").trim().toLowerCase();
  const language = supportedLanguages[rawLanguage] || (rawLanguage ? String(body.language || body.userLanguage) : "");

  return [
    baseSystemPrompt,
    language ? `Respond in ${language} unless the user asks for another language.` : "",
    context.length ? `Current FanAtlas context:\n${context.join("\n")}` : ""
  ].filter(Boolean).join("\n\n");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const messages = normalizeMessages(req.body?.messages, req.body?.message);
  if (!messages.length) {
    return res.status(400).json({ error: "Message is required." });
  }

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (latestUserMessage && latestUserMessage.content.length > MAX_USER_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: "Please shorten your message."
    });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(503).json({ error: "AI Travel Assistant is temporarily unavailable. Please try again later." });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.35,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: contextPrompt(req.body || {})
          },
          ...messages
        ]
      })
    });

    const responseText = await response.text();
    let data: any = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { error: { message: responseText } };
    }

    if (!response.ok) {
      const openAiMessage = String(data?.error?.message || responseText || "");
      const openAiCode = String(data?.error?.code || "");
      const isQuotaError =
        response.status === 429 &&
        /quota|billing|insufficient/i.test(`${openAiMessage} ${openAiCode}`);

      return res.status(response.status).json({
        error: isQuotaError
          ? "AI Travel Assistant is temporarily unavailable. Please try again later."
          : "AI Travel Assistant is temporarily unavailable. Please try again later."
      });
    }

    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return res.status(502).json({
        error: "AI Travel Assistant is temporarily unavailable. Please try again later."
      });
    }

    return res.status(200).json({
      answer
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "AI Travel Assistant is temporarily unavailable. Please try again later."
    });
  }
}
