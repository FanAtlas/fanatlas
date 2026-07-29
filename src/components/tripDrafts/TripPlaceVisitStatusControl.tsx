import { useId } from "react";
import type { TripPlaceVisitStatus } from "../../lib/tripDrafts";
import type { TripPlannerTranslate } from "./types";

const TRIP_PLACE_VISIT_STATUS_OPTIONS: TripPlaceVisitStatus[] = ["planned", "visited", "skipped"];

export function TripPlaceVisitStatusControl({
  onChange,
  status,
  translate
}: {
  onChange: (status: TripPlaceVisitStatus) => void;
  status: TripPlaceVisitStatus;
  translate: TripPlannerTranslate;
}) {
  const groupId = useId();

  return (
    <fieldset className="trip-place-status">
      <legend className="trip-place-status__legend">{translate("tripDrafts.visitStatus.title")}</legend>
      <div className="trip-place-status__options">
        {TRIP_PLACE_VISIT_STATUS_OPTIONS.map((option) => {
          const id = `${groupId}-${option}`;
          return (
            <div className="trip-place-status__option" key={option}>
              <input
                checked={status === option}
                id={id}
                name={groupId}
                onChange={() => {
                  if (status !== option) onChange(option);
                }}
                type="radio"
                value={option}
              />
              <label className="trip-place-status__label" htmlFor={id}>
                {statusLabel(option, translate)}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function statusLabel(status: TripPlaceVisitStatus, translate: TripPlannerTranslate) {
  if (status === "visited") return translate("tripDrafts.visitStatus.visited");
  if (status === "skipped") return translate("tripDrafts.visitStatus.skipped");
  return translate("tripDrafts.visitStatus.planned");
}
