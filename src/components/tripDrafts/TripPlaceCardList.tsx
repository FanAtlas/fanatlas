import type { TripTimeBlock } from "../../lib/tripDrafts";
import type { SavedPlaceAction } from "../../lib/savedPlaceActions";
import { TripPlaceCard } from "./TripPlaceCard";
import type { TripDayDestinationOption, TripPlaceActionRow, TripPlannerTranslate } from "./types";

export function TripPlaceCardList({
  actionRows,
  draftId,
  moveOptions,
  onExecuteAction,
  onMovePlace,
  onMovePlaceWithinSection,
  onRemovePlace,
  onSetPlaceTimeBlock,
  translate
}: {
  actionRows: TripPlaceActionRow[];
  draftId: string;
  moveOptions: TripDayDestinationOption[];
  onExecuteAction: (action: SavedPlaceAction) => void;
  onMovePlace: (draftId: string, logicalPlaceId: string, dayId: string) => void;
  onMovePlaceWithinSection: (draftId: string, logicalPlaceId: string, direction: "up" | "down", placeName: string) => void;
  onRemovePlace: (logicalPlaceId: string) => void;
  onSetPlaceTimeBlock?: (draftId: string, logicalPlaceId: string, timeBlock: TripTimeBlock | null, placeName: string) => void;
  translate: TripPlannerTranslate;
}) {
  return (
    <div className="collection-place-list">
      {actionRows.map(({ reference, place, actions, position }) => (
        <div key={place.id}>
          <TripPlaceCard
            actions={actions}
            canMoveDown={position.canMoveDown}
            canMoveUp={position.canMoveUp}
            currentDayId={reference.dayId}
            currentTimeBlock={reference.timeBlock || null}
            moveOptions={moveOptions}
            onExecuteAction={onExecuteAction}
            place={place}
            planningActions={{
              onMoveToDay: (dayId) => onMovePlace(draftId, place.id, dayId),
              onMoveDown: () => onMovePlaceWithinSection(draftId, place.id, "down", place.name),
              onMoveUp: () => onMovePlaceWithinSection(draftId, place.id, "up", place.name),
              onRemove: () => onRemovePlace(place.id),
              onSetTimeBlock: onSetPlaceTimeBlock ? (timeBlock) => onSetPlaceTimeBlock(draftId, place.id, timeBlock, place.name) : undefined
            }}
            translate={translate}
          />
        </div>
      ))}
    </div>
  );
}
