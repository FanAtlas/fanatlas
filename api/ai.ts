import { createClient } from "@supabase/supabase-js";

declare const process: {
  env: Record<string, string | undefined>;
};

const FREE_AI_MESSAGES_LIMIT = 20;
const MAX_USER_MESSAGE_LENGTH = 800;
const MAX_CONVERSATION_MESSAGES = 8;
const AI_MODEL = "gpt-4o-mini";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AiUsageRow = {
  id: string;
  user_id: string;
  month: string;
  messages_used: number;
  messages_limit: number;
  created_at?: string;
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

function currentUsageMonth() {
  return new Date().toISOString().slice(0, 7);
}

function usagePayload(row: AiUsageRow) {
  return {
    month: row.month,
    messagesUsed: Number(row.messages_used || 0),
    messagesLimit: Number(row.messages_limit || FREE_AI_MESSAGES_LIMIT),
    limitReached: Number(row.messages_used || 0) >= Number(row.messages_limit || FREE_AI_MESSAGES_LIMIT)
  };
}

function bearerToken(req: any) {
  const header = String(req.headers?.authorization || req.headers?.Authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function supabaseClient(key: string, token?: string) {
  const url = process.env.VITE_SUPABASE_URL || "";

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      : undefined
  });
}

async function getUsageForRequest(req: any) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !anonKey) {
    return {
      errorStatus: 503,
      error: "AI usage tracking is not configured."
    };
  }

  const token = bearerToken(req);
  if (!token) {
    return {
      errorStatus: 401,
      error: "Please log in to use the AI Travel Assistant."
    };
  }

  const authClient = supabaseClient(anonKey, token);
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const user = userData?.user;

  if (userError || !user) {
    return {
      errorStatus: 401,
      error: "Please log in to use the AI Travel Assistant."
    };
  }

  const db = serviceKey ? supabaseClient(serviceKey) : authClient;
  const month = currentUsageMonth();

  const { data: existingRows, error: readError } = await db
    .from("user_ai_usage")
    .select("id,user_id,month,messages_used,messages_limit,created_at")
    .eq("user_id", user.id)
    .eq("month", month)
    .order("created_at", { ascending: true })
    .limit(1);

  if (readError) {
    return {
      errorStatus: 500,
      error: "AI usage tracking is unavailable."
    };
  }

  const existing = Array.isArray(existingRows) ? existingRows[0] as AiUsageRow | undefined : undefined;
  if (existing) {
    return { db, user, usage: existing };
  }

  const { data: created, error: insertError } = await db
    .from("user_ai_usage")
    .insert({
      user_id: user.id,
      month,
      messages_used: 0,
      messages_limit: FREE_AI_MESSAGES_LIMIT
    })
    .select("id,user_id,month,messages_used,messages_limit,created_at")
    .single();

  if (insertError || !created) {
    return {
      errorStatus: 500,
      error: "AI usage tracking is unavailable."
    };
  }

  return { db, user, usage: created as AiUsageRow };
}

async function incrementUsage(db: any, usage: AiUsageRow) {
  const nextUsed = Number(usage.messages_used || 0) + 1;

  const { data, error } = await db
    .from("user_ai_usage")
    .update({ messages_used: nextUsed })
    .eq("id", usage.id)
    .select("id,user_id,month,messages_used,messages_limit,created_at")
    .single();

  if (error || !data) {
    return {
      ...usage,
      messages_used: nextUsed
    };
  }

  return data as AiUsageRow;
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
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const usageResult = await getUsageForRequest(req);
  if ("error" in usageResult) {
    return res.status(usageResult.errorStatus).json({ error: usageResult.error });
  }

  if (req.method === "GET") {
    return res.status(200).json({ usage: usagePayload(usageResult.usage) });
  }

  const messages = normalizeMessages(req.body?.messages, req.body?.message);
  if (!messages.length) {
    return res.status(400).json({ error: "Message is required." });
  }

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (latestUserMessage && latestUserMessage.content.length > MAX_USER_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: "Please shorten your message.",
      usage: usagePayload(usageResult.usage)
    });
  }

  if (Number(usageResult.usage.messages_used || 0) >= Number(usageResult.usage.messages_limit || FREE_AI_MESSAGES_LIMIT)) {
    return res.status(429).json({
      error: "You have reached your monthly AI limit. Upgrade to Premium to continue.",
      usage: usagePayload(usageResult.usage)
    });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(503).json({ error: "OpenAI key is not configured.", usage: usagePayload(usageResult.usage) });
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
          : "AI Travel Assistant is temporarily unavailable. Please try again later.",
        usage: usagePayload(usageResult.usage)
      });
    }

    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return res.status(502).json({
        error: "AI Travel Assistant is temporarily unavailable. Please try again later.",
        usage: usagePayload(usageResult.usage)
      });
    }

    const nextUsage = await incrementUsage(usageResult.db, usageResult.usage);

    return res.status(200).json({
      answer,
      usage: usagePayload(nextUsage)
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "AI Travel Assistant is temporarily unavailable. Please try again later.",
      usage: usagePayload(usageResult.usage)
    });
  }
}
