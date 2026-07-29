import { useId, useState } from "react";
import { normalizeTripPlacePlanningNote, TRIP_PLACE_NOTE_MAX_LENGTH } from "../../lib/tripDrafts";
import type { TripPlannerTranslate } from "./types";

export function TripPlaceNoteEditor({
  initialNote,
  language,
  onCancel,
  onRemove,
  onSave,
  translate
}: {
  initialNote: string;
  language: string;
  onCancel: () => void;
  onRemove?: () => void;
  onSave: (note: string) => void;
  translate: TripPlannerTranslate;
}) {
  const textareaId = useId();
  const countId = useId();
  const [draftNote, setDraftNote] = useState(initialNote);
  const normalizedInitial = normalizeTripPlacePlanningNote(initialNote) || "";
  const normalizedDraft = normalizeTripPlacePlanningNote(draftNote) || "";
  const isUnchanged = normalizedDraft === normalizedInitial;
  const isTooLong = draftNote.length > TRIP_PLACE_NOTE_MAX_LENGTH;

  return (
    <div className="trip-place-note-editor">
      <label className="trip-place-note-editor__field" htmlFor={textareaId}>
        <span>{translate("tripDrafts.notes.placeNote")}</span>
        <textarea
          aria-describedby={countId}
          className="trip-place-note-editor__textarea"
          id={textareaId}
          maxLength={TRIP_PLACE_NOTE_MAX_LENGTH}
          onChange={(event) => setDraftNote(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel();
          }}
          rows={4}
          value={draftNote}
        />
      </label>
      <div className="trip-place-note-editor__count" id={countId}>
        {translate("tripDrafts.notes.characterCount")
          .replace("{current}", formatNoteCount(draftNote.length, language))
          .replace("{maximum}", formatNoteCount(TRIP_PLACE_NOTE_MAX_LENGTH, language))}
      </div>
      <div className="trip-place-note-editor__actions">
        <button
          className="primary-btn"
          disabled={isTooLong || isUnchanged}
          onClick={() => onSave(draftNote)}
          type="button"
        >
          {translate("tripDrafts.notes.save")}
        </button>
        <button className="secondary-btn" onClick={onCancel} type="button">
          {translate("tripDrafts.cancel")}
        </button>
        {onRemove && (
          <button className="secondary-btn danger trip-place-note-editor__remove" onClick={onRemove} type="button">
            {translate("tripDrafts.notes.remove")}
          </button>
        )}
      </div>
    </div>
  );
}

function formatNoteCount(value: number, language: string) {
  try {
    return new Intl.NumberFormat(localeForLanguage(language)).format(value);
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
