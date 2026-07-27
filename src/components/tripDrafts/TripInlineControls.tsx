import { X } from "lucide-react";
import type { TripDraft, TripItineraryDay } from "../../lib/tripDrafts";
import type { TripPlannerTranslate } from "./types";

export function InlineTripDayTitleEditor({
  title,
  onCancel,
  onChange,
  onSave,
  translate
}: {
  title: string;
  onCancel: () => void;
  onChange: (title: string) => void;
  onSave: () => void;
  translate: TripPlannerTranslate;
}) {
  return (
    <div className="collection-inline-editor">
      <label>
        <span>{translate("tripDrafts.itinerary.dayTitle")}</span>
        <input
          autoFocus
          maxLength={80}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSave();
            if (event.key === "Escape") onCancel();
          }}
          value={title}
        />
      </label>
      <div>
        <button className="secondary-btn" onClick={onSave} type="button">{translate("tripDrafts.save")}</button>
        <button className="secondary-btn" onClick={onCancel} type="button">
          <X size={14} aria-hidden="true" />
          {translate("tripDrafts.cancel")}
        </button>
      </div>
    </div>
  );
}

export function InlineTripDraftNameEditor({
  name,
  onCancel,
  onChange,
  onSave,
  translate
}: {
  name: string;
  onCancel: () => void;
  onChange: (name: string) => void;
  onSave: () => void;
  translate: TripPlannerTranslate;
}) {
  return (
    <div className="collection-inline-editor">
      <label>
        <span>{translate("tripDrafts.name")}</span>
        <input
          autoFocus
          maxLength={100}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSave();
            if (event.key === "Escape") onCancel();
          }}
          value={name}
        />
      </label>
      <div>
        <button className="secondary-btn" onClick={onSave} type="button">{translate("tripDrafts.save")}</button>
        <button className="secondary-btn" onClick={onCancel} type="button">
          <X size={14} aria-hidden="true" />
          {translate("tripDrafts.cancel")}
        </button>
      </div>
    </div>
  );
}

export function DeleteTripDayConfirm({
  day,
  onCancel,
  onConfirm,
  translate
}: {
  day: TripItineraryDay;
  onCancel: () => void;
  onConfirm: () => void;
  translate: TripPlannerTranslate;
}) {
  return (
    <div className="collection-delete-confirm" role="group" aria-label={translate("tripDrafts.itinerary.deleteDayConfirm.title")}>
      <strong>{translate("tripDrafts.itinerary.deleteDayConfirm.title")}</strong>
      <p>{translate("tripDrafts.itinerary.deleteDayConfirm.description").replace("{title}", day.title)}</p>
      <div>
        <button className="secondary-btn" onClick={onConfirm} type="button">{translate("tripDrafts.itinerary.deleteDayConfirm.confirm")}</button>
        <button className="secondary-btn" onClick={onCancel} type="button">{translate("tripDrafts.itinerary.deleteDayConfirm.cancel")}</button>
      </div>
    </div>
  );
}

export function DeleteTripDraftConfirm({
  draft,
  onCancel,
  onConfirm,
  translate
}: {
  draft: TripDraft;
  onCancel: () => void;
  onConfirm: () => void;
  translate: TripPlannerTranslate;
}) {
  return (
    <div className="collection-delete-confirm" role="group" aria-label={translate("tripDrafts.deleteConfirm.title")}>
      <strong>{translate("tripDrafts.deleteConfirm.title")}</strong>
      <p>{translate("tripDrafts.deleteConfirm.description").replace("{name}", draft.name)}</p>
      <div>
        <button className="secondary-btn" onClick={onConfirm} type="button">{translate("tripDrafts.deleteConfirm.confirm")}</button>
        <button className="secondary-btn" onClick={onCancel} type="button">{translate("tripDrafts.deleteConfirm.cancel")}</button>
      </div>
    </div>
  );
}
