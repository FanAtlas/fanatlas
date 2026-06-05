import { useState } from "react";
import { askTravelAssistant } from "../services/openai";

export function AIChatPage() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi, I’m FanAtlas. Ask me about match day, safety, restaurants, fan zones, or emergencies." }
  ]);
  const [input, setInput] = useState("");

  async function send(text?: string) {
    const msg = text || input;
    if (!msg.trim()) return;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    const answer = await askTravelAssistant(msg);
    setMessages((m) => [...m, { role: "ai", text: answer }]);
  }

  const prompts = [
    "Plan my match day",
    "What should I avoid tonight?",
    "Find safe restaurants nearby",
    "Translate emergency phrases",
    "Best fan zone after the game"
  ];

  return (
    <>
      <div className="header">
        <div>
          <div className="logo">AI Assistant</div>
          <div className="subtle">Match Day Concierge + Safety Guardian</div>
        </div>
      </div>

      <div className="grid">
        {prompts.map((p) => <button className="secondary-btn" key={p} onClick={() => send(p)}>{p}</button>)}
      </div>

      <div className="card chat-box">
        {messages.map((m, i) => <div key={i} className={`bubble ${m.role}`}>{m.text}</div>)}
      </div>

      <div className="row">
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask FanAtlas..." />
        <button className="primary-btn" onClick={() => send()}>Send</button>
      </div>
    </>
  );
}
