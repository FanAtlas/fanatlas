import { useEffect, useMemo, useState } from "react";
import { UNSCHEDULED_TRIP_DAY_ID, type TripTimeBlock } from "../../lib/tripDrafts";
import { timeBlockLabel } from "./displayUtils";
import type {
  TripDayDestinationOption,
  TripNearbyGroupMoveRequest,
  TripNearbyPlaceGroupItem,
  TripPlannerTranslate
} from "./types";

const TIME_BLOCK_OPTIONS: Array<{ value: ""; timeBlock: TripTimeBlock | null } | { value: TripTimeBlock; timeBlock: TripTimeBlock }> = [
  { value: "", timeBlock: null },
  { value: "morning", timeBlock: "morning" },
  { value: "afternoon", timeBlock: "afternoon" },
  { value: "evening", timeBlock: "evening" }
];

export function TripNearbyGroupPlanner({
  group,
  moveOptions,
  onCancel,
  onMoveGroup,
  translate
}: {
  group: TripNearbyPlaceGroupItem;
  moveOptions: TripDayDestinationOption[];
  onCancel: () => void;
  onMoveGroup: (request: TripNearbyGroupMoveRequest) => boolean;
  translate: TripPlannerTranslate;
}) {
  const [destinationDayId, setDestinationDayId] = useState(group.sourceDayId);
  const [destinationTimeBlockValue, setDestinationTimeBlockValue] = useState<"" | TripTimeBlock>(group.sourceTimeBlock || "");
  const destinationIsUnscheduled = destinationDayId === UNSCHEDULED_TRIP_DAY_ID;
  const destinationTimeBlock = destinationIsUnscheduled ? null : destinationTimeBlockValue || null;
  const destinationOption = useMemo(
    () => moveOptions.find((option) => option.id === destinationDayId) || moveOptions[0],
    [destinationDayId, moveOptions]
  );
  const destinationTimeBlockLabel = destinationIsUnscheduled
    ? ""
    : timeBlockLabel(destinationTimeBlock, translate);
  const destinationLabel = destinationIsUnscheduled || !destinationTimeBlockLabel
    ? destinationOption?.label || ""
    : `${destinationOption?.label || ""}, ${destinationTimeBlockLabel}`;
  const isNoChange = destinationDayId === group.sourceDayId &&
    (destinationIsUnscheduled || (destinationTimeBlockValue || "") === (group.sourceTimeBlock || ""));
  const confirmLabel = translate(destinationDayId === group.sourceDayId
    ? "tripDrafts.nearbyGroups.assignPlaces"
    : "tripDrafts.nearbyGroups.movePlaces")
    .replace("{count}", String(group.memberIds.length));

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="trip-nearby-group-planner">
      <p>{translate("tripDrafts.nearbyGroups.description")}</p>
      <div className="trip-nearby-group-planner__places" aria-label={translate("tripDrafts.nearbyGroups.currentLocation")}>
        {group.placeNames.map((placeName, index) => (
          <span key={`${group.id}-planner-place-${index}`}>{placeName}</span>
        ))}
      </div>

      <div className="trip-nearby-group-planner__fields">
        <label className="trip-nearby-group-planner__field">
          <span>{translate("tripDrafts.nearbyGroups.destinationDay")}</span>
          <select
            onChange={(event) => {
              const nextDayId = event.target.value;
              setDestinationDayId(nextDayId);
              if (nextDayId === UNSCHEDULED_TRIP_DAY_ID) setDestinationTimeBlockValue("");
            }}
            value={destinationDayId}
          >
            {moveOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>

        {!destinationIsUnscheduled && (
          <label className="trip-nearby-group-planner__field">
            <span>{translate("tripDrafts.nearbyGroups.destinationTimeBlock")}</span>
            <select
              onChange={(event) => setDestinationTimeBlockValue(event.target.value as "" | TripTimeBlock)}
              value={destinationTimeBlockValue}
            >
              {TIME_BLOCK_OPTIONS.map((option) => (
                <option key={option.value || "unassigned"} value={option.value}>
                  {timeBlockLabel(option.timeBlock, translate)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {isNoChange && (
        <p className="trip-nearby-group-planner__message">
          {translate("tripDrafts.nearbyGroups.noChangesSelected")}
        </p>
      )}

      <div className="trip-nearby-group-planner__actions">
        <button className="secondary-btn" onClick={onCancel} type="button">
          {translate("tripDrafts.cancel")}
        </button>
        <button
          className="secondary-btn"
          disabled={isNoChange}
          onClick={() => {
            const moved = onMoveGroup({
              memberIds: group.memberIds,
              expectedSourceDayId: group.sourceDayId,
              expectedSourceTimeBlock: group.sourceTimeBlock,
              destinationDayId,
              destinationTimeBlock,
              destinationLabel
            });
            if (moved) onCancel();
          }}
          type="button"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
