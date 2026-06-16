import { useState } from "react";
import { askTravelAssistant } from "../services/openai";

export function AIChatPage() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi, I’m FanAtlas. Ask me about World Cup 2026 stadiums, fan zones, travel, SOS, translation, hotels, eSIM, currency, or app navigation." }
  ]);
  const [mode, setMode] = useState<"live" | "demo">("demo");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(text?: string) {
    const msg = text || input;
    if (!msg.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    setLoading(true);
    const result = await askTravelAssistant(msg);
    setMode(result.mode);
    setMessages((m) => [
      ...m,
      {
        role: "ai",
        text: result.error && result.mode === "demo"
          ? `${result.answer}\n\nFallback note: ${result.error}`
          : result.answer
      }
    ]);
    setLoading(false);
  }

  const prompts = [
    "Plan my match day",
    "Which FanAtlas page has currency conversion?",
    "Find safe restaurants near a stadium",
    "Translate emergency phrases",
    "Best fan zone after the game",
    "How do I use the in-app map?"
  ];

  return (
    <>
      <div className="header">
        <div>
          <div className="logo">AI Assistant</div>
          <div className="subtle">
            Match Day Concierge + Safety Guardian · {mode === "live" ? "Live AI" : "Demo mode"}
          </div>
        </div>
      </div>

      <div className="grid">
        {prompts.map((p) => <button className="secondary-btn" key={p} onClick={() => send(p)}>{p}</button>)}
      </div>

      <div className="card chat-box">
        {messages.map((m, i) => <div key={i} className={`bubble ${m.role}`}>{m.text}</div>)}
        {loading && <div className="bubble ai">Thinking...</div>}
      </div>

      <div className="row">
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask FanAtlas..." />
        <button className="primary-btn" disabled={loading} onClick={() => send()}>Send</button>
      </div>
    </>
  );
}
