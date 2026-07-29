import { useEffect, useId, useRef, useState } from "react";
import { PLANNING_ACTION_MAX_LENGTH, normalizePlanningActionText } from "../../lib/tripDrafts";
import type { TripPlannerTranslate } from "./types";

export function PlanningActionEditor({
  initialText,
  language,
  onCancel,
  onSave,
  translate
}: {
  initialText: string;
  language: string;
  onCancel: () => void;
  onSave: (text: string) => boolean;
  translate: TripPlannerTranslate;
}) {
  const inputId = useId();
  const countId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState(initialText);
  const normalizedInitial = normalizePlanningActionText(initialText) || "";
  const normalizedText = normalizePlanningActionText(text) || "";
  const isUnchanged = normalizedText === normalizedInitial;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="planning-action-editor">
      <label className="planning-action-editor__field" htmlFor={inputId}>
        <span>{translate("tripDrafts.planningActions.action")}</span>
        <input
          aria-describedby={countId}
          className="planning-action-editor__input"
          id={inputId}
          maxLength={PLANNING_ACTION_MAX_LENGTH}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel();
          }}
          ref={inputRef}
          value={text}
        />
      </label>
      <div className="planning-action-editor__count" id={countId}>
        {translate("tripDrafts.planningActions.characterCount")
          .replace("{current}", formatPlanningActionNumber(text.length, language))
          .replace("{maximum}", formatPlanningActionNumber(PLANNING_ACTION_MAX_LENGTH, language))}
      </div>
      <div className="planning-action-editor__actions">
        <button
          className="primary-btn"
          disabled={isUnchanged || text.length > PLANNING_ACTION_MAX_LENGTH}
          onClick={() => {
            if (onSave(text)) setText("");
          }}
          type="button"
        >
          {translate("tripDrafts.planningActions.save")}
        </button>
        <button className="secondary-btn" onClick={onCancel} type="button">
          {translate("tripDrafts.cancel")}
        </button>
      </div>
    </div>
  );
}

export function formatPlanningActionNumber(value: number, language: string) {
  try {
    return new Intl.NumberFormat(localeForLanguage(language), { maximumFractionDigits: 0 }).format(value);
  } catch {
    return String(value);
  }
}

function localeForLanguage(language: string) {
  if (language === "es") return "es-ES";
  if (language === "fr") return "fr-FR";
  if (language === "ar") return "ar";
  if (language === "pt") return "pt-BR";
  return "en-US";
}
