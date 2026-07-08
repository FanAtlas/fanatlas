import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { BackButton } from "../components/BackButton";
import { useLanguage } from "../LanguageContext";
import { AssistantMessage, askTravelAssistant } from "../services/openai";
import { useTravelLocation } from "../TravelLocationContext";

type ChatMessage = AssistantMessage & {
  id: string;
};

const CHAT_STORAGE_KEY = "fanatlas.aiChat.history";
const MAX_USER_MESSAGE_LENGTH = 800;

const directUserMessages = new Set([
  "Please shorten your message.",
  "AI Travel Assistant is temporarily unavailable. Please try again later."
]);

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi, I'm FanAtlas. Ask me about your destination, hotels, restaurants, transportation, SOS, translation, expenses, checklists, or event travel."
};

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content
  };
}

function loadStoredMessages() {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!stored) return [welcomeMessage];

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) return [welcomeMessage];

    const messages = parsed
      .map((message) => ({
        id: String(message.id || `${Date.now()}-${Math.random()}`),
        role: message.role === "user" ? "user" : "assistant",
        content: String(message.content || message.text || "").trim()
      }))
      .filter((message) => message.content);

    return messages.length ? messages : [welcomeMessage];
  } catch {
    return [welcomeMessage];
  }
}

export function AIChatPage({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const { travelLocation } = useTravelLocation();
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadStoredMessages());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("OpenAI Assistant");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-40)));
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [loading, messages]);

  const apiMessages = useMemo(
    () => messages
      .filter((message) => message.id !== "welcome")
      .map((message) => ({
        role: message.role,
        content: message.content
      })),
    [messages]
  );

  async function send(text?: string) {
    const content = (text || input).trim();
    if (!content || loading) return;

    if (content.length > MAX_USER_MESSAGE_LENGTH) {
      setMessages((current) => [...current, createMessage("assistant", "Please shorten your message.")]);
      return;
    }

    const userMessage = createMessage("user", content);
    const nextApiMessages = [...apiMessages, {
      role: userMessage.role,
      content: userMessage.content
    }];

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);
    setStatus("Typing...");

    try {
      const result = await askTravelAssistant(nextApiMessages, {
        language,
        originCountry: travelLocation.originCountry,
        destinationCountry: travelLocation.destinationCountry,
        destinationCity: travelLocation.destinationCity,
        city: travelLocation.destinationCity
      });
      setMessages((current) => [...current, createMessage("assistant", result.answer)]);
      setStatus("OpenAI Assistant");
    } catch (error: any) {
      const message = error?.message || "Check the backend configuration and try again.";
      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          directUserMessages.has(message)
            ? message
            : `I could not reach the OpenAI assistant. ${message}`
        )
      ]);
      setStatus("Assistant unavailable");
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([welcomeMessage]);
    setStatus("OpenAI Assistant");
  }

  function submitMessage(event: FormEvent) {
    event.preventDefault();
    send();
  }

  const prompts = [
    "Plan my match day",
    "Find safe way back to hotel",
    "Restaurants near the stadium",
    "Best fan zone after the match",
    "What should I do before traveling?",
    "Emergency help in this city",
    "Translate this phrase"
  ];

  return (
    <>
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div>
          <div className="brand">AI Assistant <span>OpenAI</span></div>
          <div className="subtle">
            Travel, safety, hotels, restaurants, transport, SOS, and event planning · {status}
          </div>
        </div>
        <button className="mini-btn" onClick={clearChat} disabled={loading}>
          Clear
        </button>
      </div>

      <div className="ai-usage-card">
        <strong>Beta: AI assistant has limited availability.</strong>
      </div>

      <div className="grid ai-prompt-grid">
        {prompts.map((prompt) => (
          <button
            className="secondary-btn"
            key={prompt}
            onClick={() => send(prompt)}
            disabled={loading}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="card chat-box ai-chat-scroll" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`bubble ${message.role === "user" ? "user" : "ai"}`}>
            {message.content}
          </div>
        ))}

        {loading && (
          <div className="bubble ai typing-bubble">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form className="row ai-input-row" onSubmit={submitMessage}>
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          maxLength={MAX_USER_MESSAGE_LENGTH + 1}
          placeholder="Ask FanAtlas..."
        />
        <button className="primary-btn" type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </>
  );
}
