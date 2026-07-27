import { useEffect, useState } from "react";
import type { TripDayDestinationOption, TripPlannerTranslate } from "./types";

export function TripMoveToControl({
  currentDayId,
  moveOptions,
  onMove,
  translate
}: {
  currentDayId: string;
  moveOptions: TripDayDestinationOption[];
  onMove: (dayId: string) => void;
  translate: TripPlannerTranslate;
}) {
  const [selectedDayId, setSelectedDayId] = useState(currentDayId);

  useEffect(() => {
    setSelectedDayId(currentDayId);
  }, [currentDayId]);

  return (
    <div className="trip-place-move-control">
      <label>
        <span>{translate("tripDrafts.itinerary.moveTo")}</span>
        <select
          onChange={(event) => setSelectedDayId(event.target.value)}
          value={selectedDayId}
        >
          {moveOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </label>
      <button
        className="secondary-btn"
        disabled={selectedDayId === currentDayId}
        onClick={() => onMove(selectedDayId)}
        type="button"
      >
        {translate("tripDrafts.itinerary.move")}
      </button>
    </div>
  );
}
