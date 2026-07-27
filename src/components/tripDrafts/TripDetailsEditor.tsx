import { X } from "lucide-react";
import type { TripPlannerTranslate } from "./types";

export function TripDetailsEditor({
  destination,
  endDate,
  onCancel,
  onDestinationChange,
  onEndDateChange,
  onSave,
  onStartDateChange,
  startDate,
  translate
}: {
  destination: string;
  endDate: string;
  onCancel: () => void;
  onDestinationChange: (destination: string) => void;
  onEndDateChange: (date: string) => void;
  onSave: () => void;
  onStartDateChange: (date: string) => void;
  startDate: string;
  translate: TripPlannerTranslate;
}) {
  return (
    <section className="trip-details-editor collection-detail-hero">
      <div>
        <strong>{translate("tripDrafts.details.title")}</strong>
        <p>{translate("tripDrafts.details.description")}</p>
      </div>
      <div className="trip-details-fields">
        <label>
          <span>{translate("tripDrafts.details.destination")}</span>
          <input
            maxLength={120}
            onChange={(event) => onDestinationChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onCancel();
            }}
            placeholder={translate("tripDrafts.details.destinationPlaceholder")}
            value={destination}
          />
        </label>
        <label>
          <span>{translate("tripDrafts.details.startDate")}</span>
          <input
            onChange={(event) => onStartDateChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onCancel();
            }}
            type="date"
            value={startDate}
          />
        </label>
        <label>
          <span>{translate("tripDrafts.details.endDate")}</span>
          <input
            min={startDate || undefined}
            onChange={(event) => onEndDateChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onCancel();
            }}
            type="date"
            value={endDate}
          />
        </label>
      </div>
      <div className="collection-detail-actions">
        <button className="secondary-btn" onClick={() => onDestinationChange("")} type="button">
          {translate("tripDrafts.details.clearDestination")}
        </button>
        <button className="secondary-btn" onClick={() => {
          onStartDateChange("");
          onEndDateChange("");
        }} type="button">
          {translate("tripDrafts.details.clearDates")}
        </button>
        <button className="secondary-btn" onClick={onSave} type="button">{translate("tripDrafts.details.save")}</button>
        <button className="secondary-btn" onClick={onCancel} type="button">
          <X size={14} aria-hidden="true" />
          {translate("tripDrafts.details.cancel")}
        </button>
      </div>
    </section>
  );
}
