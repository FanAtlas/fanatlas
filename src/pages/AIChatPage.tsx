import { FormEvent, KeyboardEvent } from "react";
import { Bot, CircleStop, RotateCcw, Send, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { useLanguage } from "../LanguageContext";
import { FANATLAS_AI_MAX_MESSAGE_LENGTH } from "../lib/fanAtlasAIContracts";
import type { TravelStructuredOutput, TravelTask } from "../lib/travelIntelligenceTypes";
import { useFanAtlasAI } from "../hooks/useFanAtlasAI";

export function AIChatPage({ onBack }: { onBack: () => void }) {
  const { language, t } = useLanguage();
  const ai = useFanAtlasAI(language);
  const copy = t as Record<string, string>;

  function translate(key: string) {
    return copy[key] || key;
  }

  function submitMessage(event: FormEvent) {
    event.preventDefault();
    ai.sendMessage();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ai.sendMessage();
    }
  }

  const suggestedPrompts: Array<{ label: string; text: string; task?: TravelTask }> = [
    { label: translate("fanAtlasAI.prompt.improveTrip"), text: "Help me improve my active trip." },
    { label: translate("fanAtlasAI.prompt.packing"), text: "Create a packing list for my next destination.", task: "packing_guidance" as const },
    { label: translate("fanAtlasAI.prompt.compare"), text: "Compare two destinations for my budget.", task: "destination_comparison" as const },
    { label: translate("fanAtlasAI.prompt.patterns"), text: "Explain my travel patterns.", task: "travel_summary" as const },
    { label: translate("fanAtlasAI.prompt.prepare"), text: "What should I prepare before this trip?" },
    { label: translate("fanAtlasAI.prompt.entry"), text: "Find current entry requirements for my destination.", task: "visa_rule_research" as const }
  ];

  return (
    <main className="fanatlas-ai-page" aria-labelledby="fanatlas-ai-title">
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div>
          <h1 className="brand" id="fanatlas-ai-title">{translate("fanAtlasAI.title")}</h1>
          <div className="subtle">{translate("fanAtlasAI.subtitle")}</div>
        </div>
        <button className="mini-btn" type="button" onClick={ai.clearConversation} disabled={ai.loading}>
          <Trash2 size={15} aria-hidden="true" />
          {translate("fanAtlasAI.clear")}
        </button>
      </div>

      <section className="fanatlas-ai-privacy" aria-labelledby="fanatlas-ai-privacy-title">
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <h2 id="fanatlas-ai-privacy-title">{translate("fanAtlasAI.privacyTitle")}</h2>
          <p>{translate("fanAtlasAI.privacyNotice")}</p>
        </div>
      </section>

      <section className="fanatlas-ai-context" aria-labelledby="fanatlas-ai-context-title">
        <div className="section-row">
          <div>
            <span>{translate("fanAtlasAI.contextLabel")}</span>
            <h2 id="fanatlas-ai-context-title">{translate("fanAtlasAI.contextTitle")}</h2>
          </div>
          <Bot size={20} aria-hidden="true" />
        </div>

        <label className="field-label" htmlFor="fanatlas-ai-trip-select">{translate("fanAtlasAI.activeTrip")}</label>
        <select
          id="fanatlas-ai-trip-select"
          className="input"
          value={ai.activeTripId || ai.activeTrip?.id || ""}
          onChange={(event) => ai.setActiveTripId(event.target.value)}
          disabled={ai.loading}
        >
          <option value="">{translate("fanAtlasAI.noTrip")}</option>
          {ai.drafts.map((draft) => (
            <option key={draft.id} value={draft.id}>{draft.name}</option>
          ))}
        </select>

        <details className="fanatlas-ai-context-details">
          <summary>{translate("fanAtlasAI.privacyControls")}</summary>
          <div className="fanatlas-ai-toggle-grid">
            {([
              ["allowActiveTrip", "fanAtlasAI.useActiveTrip"],
              ["allowPassportHistory", "fanAtlasAI.usePassport"],
              ["allowTravelInsights", "fanAtlasAI.useInsights"],
              ["allowSavedPlaces", "fanAtlasAI.useSavedPlaces"],
              ["allowJournalMetadata", "fanAtlasAI.useJournalMetadata"],
              ["allowJournalContent", "fanAtlasAI.useJournalContent"]
            ] as const).map(([key, label]) => (
              <label key={key} className="fanatlas-ai-toggle">
                <input
                  type="checkbox"
                  checked={ai.consent[key]}
                  onChange={(event) => ai.setConsent((current) => ({ ...current, [key]: event.target.checked }))}
                  disabled={ai.loading}
                />
                <span>{translate(label)}</span>
              </label>
            ))}
          </div>
          <p className="subtle">{translate("fanAtlasAI.contextPreview")}</p>
        </details>
      </section>

      {ai.conversation.messages.length === 0 && (
        <section className="fanatlas-ai-empty" aria-labelledby="fanatlas-ai-empty-title">
          <Sparkles size={24} aria-hidden="true" />
          <h2 id="fanatlas-ai-empty-title">{translate("fanAtlasAI.emptyTitle")}</h2>
          <p>{translate("fanAtlasAI.emptyDescription")}</p>
          <div className="fanatlas-ai-prompt-grid">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt.text}
                type="button"
                className="secondary-btn"
                onClick={() => ai.sendMessage(prompt.text, prompt.task)}
                disabled={ai.loading}
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="fanatlas-ai-conversation" aria-label={translate("fanAtlasAI.conversationLabel")} aria-live="polite">
        {ai.conversation.messages.map((message) => (
          <article key={message.id} className={`fanatlas-ai-message ${message.role}`} dir="auto">
            <strong>{message.role === "user" ? translate("fanAtlasAI.you") : translate("fanAtlasAI.assistant")}</strong>
            <p>{translate(message.content)}</p>
            {message.structuredOutput && (
              <AIStructuredOutput output={message.structuredOutput} translate={translate} />
            )}
            {message.citations && message.citations.length > 0 && (
              <details className="fanatlas-ai-citations">
                <summary>{translate("fanAtlasAI.sources")}</summary>
                <ul>
                  {message.citations.map((citation) => (
                    <li key={citation.id}>
                      {citation.url ? (
                        <a href={citation.url} target="_blank" rel="noopener noreferrer">{citation.title}</a>
                      ) : citation.title}
                      <span>{citation.source}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </article>
        ))}
      </section>

      {ai.toolActivity.length > 0 && (
        <section className="fanatlas-ai-tool-activity" aria-label={translate("fanAtlasAI.toolActivity")}>
          {ai.toolActivity.map((activity) => (
            <span key={activity}>{translate(activity)}</span>
          ))}
        </section>
      )}

      {ai.error && (
        <div className="fanatlas-ai-error" role="alert">
          {translate(ai.error)}
          <button type="button" className="secondary-btn" onClick={ai.retryLast} disabled={ai.loading}>
            <RotateCcw size={15} aria-hidden="true" />
            {translate("fanAtlasAI.retry")}
          </button>
        </div>
      )}

      <form className="fanatlas-ai-composer" onSubmit={submitMessage}>
        <label className="sr-only" htmlFor="fanatlas-ai-input">{translate("fanAtlasAI.inputLabel")}</label>
        <textarea
          id="fanatlas-ai-input"
          className="input"
          value={ai.input}
          onChange={(event) => ai.setInput(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          maxLength={FANATLAS_AI_MAX_MESSAGE_LENGTH}
          placeholder={translate("fanAtlasAI.placeholder")}
          rows={3}
          disabled={ai.loading}
          dir="auto"
        />
        <div className="fanatlas-ai-composer-actions">
          <span>{ai.input.length}/{FANATLAS_AI_MAX_MESSAGE_LENGTH}</span>
          {ai.loading ? (
            <button className="secondary-btn" type="button" onClick={ai.cancel}>
              <CircleStop size={16} aria-hidden="true" />
              {translate("fanAtlasAI.stop")}
            </button>
          ) : (
            <button className="primary-btn" type="submit" disabled={!ai.input.trim()}>
              <Send size={16} aria-hidden="true" />
              {translate("fanAtlasAI.send")}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}

function AIStructuredOutput({ output, translate }: { output: TravelStructuredOutput; translate: (key: string) => string }) {
  switch (output.type) {
    case "weather_result":
      return (
        <section className="fanatlas-ai-structured-card" aria-label={translate("fanAtlasAI.current.weather")}>
          <h3>{translate("fanAtlasAI.current.weather")}</h3>
          <p><strong dir="auto">{output.destination}</strong> · {output.forecastStart} – {output.forecastEnd}</p>
          <ul>
            {output.daily.map((day) => (
              <li key={day.date}>
                <span>{day.date}</span>
                <span dir="auto">{day.condition}</span>
                <span>{formatTemperature(day.temperatureMin, day.temperatureMax, output.units)}</span>
                <span>{translate("fanAtlasAI.current.precipitation")}: {day.precipitationChance ?? "--"}%</span>
              </li>
            ))}
          </ul>
          <Freshness output={output} translate={translate} />
        </section>
      );
    case "currency_result":
      return (
        <section className="fanatlas-ai-structured-card" aria-label={translate("fanAtlasAI.current.currency")}>
          <h3>{translate("fanAtlasAI.current.currency")}</h3>
          <p>
            <strong>{output.amount === undefined ? `1 ${output.baseCurrency}` : `${output.amount} ${output.baseCurrency}`}</strong>
            {" = "}
            <strong>{output.convertedAmount === undefined ? output.rate : output.convertedAmount} {output.targetCurrency}</strong>
          </p>
          <p>{translate("fanAtlasAI.current.rate")}: {output.rate} · {output.rateDate}</p>
          <p className="subtle">{translate("fanAtlasAI.current.ratesMayChange")}</p>
          <Freshness output={output} translate={translate} />
        </section>
      );
    case "emergency_information":
      return (
        <section className="fanatlas-ai-structured-card emergency" aria-label={translate("fanAtlasAI.current.emergency")}>
          <h3>{translate("fanAtlasAI.current.emergency")}</h3>
          <p><strong dir="auto">{output.country}</strong> · {translate(`fanAtlasAI.current.${output.category}`)}</p>
          <a className="fanatlas-ai-emergency-number" href={`tel:${output.phoneNumber.split(" / ")[0]}`}>{output.phoneNumber}</a>
          <p>{output.availabilityNote}</p>
          <a className="secondary-btn" href={output.sosPath}>{translate("fanAtlasAI.current.openSOS")}</a>
          <Freshness output={output} translate={translate} />
        </section>
      );
    case "current_information_result":
      return (
        <section className="fanatlas-ai-structured-card" aria-label={translate("fanAtlasAI.current.officialUpdates")}>
          <h3>{translate("fanAtlasAI.current.officialUpdates")}</h3>
          <p><strong dir="auto">{output.destination}</strong> · {output.category}</p>
          <ul>
            {output.findings.map((finding) => (
              <li key={`${finding.source}-${finding.title}`}>
                <a href={finding.url} target="_blank" rel="noopener noreferrer">{finding.title}</a>
                <span>{finding.fact}</span>
                <small>{finding.sourceQuality}</small>
              </li>
            ))}
          </ul>
          <Freshness output={output} translate={translate} />
        </section>
      );
    default:
      return null;
  }
}

function Freshness({ output, translate }: { output: { retrievedAt: string; freshness: string }; translate: (key: string) => string }) {
  return (
    <p className="fanatlas-ai-freshness">
      {translate("fanAtlasAI.current.checkedSources")} · {translate("fanAtlasAI.current.retrieved")}: {output.retrievedAt} · {translate(`fanAtlasAI.current.freshness.${output.freshness}`)}
    </p>
  );
}

function formatTemperature(min: number | null, max: number | null, units: "metric" | "imperial") {
  const suffix = units === "imperial" ? "F" : "C";
  return `${min ?? "--"}°${suffix} / ${max ?? "--"}°${suffix}`;
}
