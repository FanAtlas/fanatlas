import type { TripTimeBlock } from "../../lib/tripDrafts";
import type { TripPlannerTranslate } from "./types";

export function TripTimeBlockSelector({
  onChange,
  placeName,
  translate,
  value
}: {
  onChange: (timeBlock: TripTimeBlock | null) => void;
  placeName: string;
  translate: TripPlannerTranslate;
  value: TripTimeBlock | null;
}) {
  return (
    <div className="trip-time-block-selector">
      <label>
        <span>{translate("tripDrafts.timeBlocks.select")}</span>
        <select
          aria-label={translate("tripDrafts.timeBlocks.selectForPlace").replace("{name}", placeName)}
          onChange={(event) => onChange(parseTimeBlockSelectValue(event.target.value))}
          value={value || ""}
        >
          <option value="">{translate("tripDrafts.timeBlocks.unassigned")}</option>
          <option value="morning">{translate("tripDrafts.timeBlocks.morning")}</option>
          <option value="afternoon">{translate("tripDrafts.timeBlocks.afternoon")}</option>
          <option value="evening">{translate("tripDrafts.timeBlocks.evening")}</option>
        </select>
      </label>
    </div>
  );
}

function parseTimeBlockSelectValue(value: string): TripTimeBlock | null {
  if (value === "morning" || value === "afternoon" || value === "evening") return value;
  return null;
}
