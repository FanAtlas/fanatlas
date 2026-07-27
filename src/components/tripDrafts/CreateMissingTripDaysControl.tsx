import { Plus } from "lucide-react";
import type { TripPlannerTranslate } from "./types";

export function CreateMissingTripDaysControl({
  count,
  onCreate,
  translate
}: {
  count: number;
  onCreate: () => void;
  translate: TripPlannerTranslate;
}) {
  const buttonText = count === 1
    ? translate("tripDrafts.details.createOneMissingDay")
    : translate("tripDrafts.details.createManyMissingDays").replace("{count}", String(count));

  return (
    <div className="trip-missing-days-control route-status">
      <span>{translate("tripDrafts.details.missingDayExplanation").replace("{count}", String(count))}</span>
      <button
        aria-label={translate("tripDrafts.details.createMissingDays").replace("{count}", String(count))}
        className="secondary-btn"
        onClick={onCreate}
        type="button"
      >
        <Plus size={15} aria-hidden="true" />
        {buttonText}
      </button>
    </div>
  );
}
