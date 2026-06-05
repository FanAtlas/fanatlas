export async function askTravelAssistant(message: string) {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) {
    return "OpenAI key is not connected yet. For now, this is demo mode: arrive early, use official transport, check stadium rules, and ask local authorities in emergencies.";
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are FanAtlas, an AI travel and safety assistant for FIFA World Cup 2026 tourists in USA, Canada, and Mexico. Give short, practical, safety-aware answers."
        },
        { role: "user", content: message }
      ]
    })
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "Sorry, I could not generate an answer.";
}
