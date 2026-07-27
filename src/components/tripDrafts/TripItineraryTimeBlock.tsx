import { useMemo } from "react";
import type { HydratedTripTimeBlockSection, TripTimeBlock } from "../../lib/tripDrafts";
import type { SavedPlaceAction } from "../../lib/savedPlaceActions";
import { emptyTimeBlockLabel, getTripNearbyPlaceGroupItems, getTripPlaceActionRows, timeBlockLabel } from "./displayUtils";
import { TripNearbyPlaceGroups } from "./TripNearbyPlaceGroups";
import { TripPlaceCardList } from "./TripPlaceCardList";
import type { TripDayDestinationOption, TripNearbyGroupMoveRequest, TripPlannerTranslate } from "./types";

export function TripItineraryTimeBlock({
  block,
  dayId,
  draftId,
  isLoadingPlaces,
  language,
  moveOptions,
  onExecuteAction,
  onMovePlaceGroup,
  onMovePlace,
  onMovePlaceWithinSection,
  onRemovePlace,
  onSetPlaceTimeBlock,
  translate
}: {
  block: HydratedTripTimeBlockSection;
  dayId: string;
  draftId: string;
  isLoadingPlaces: boolean;
  language: string;
  moveOptions: TripDayDestinationOption[];
  onExecuteAction: (action: SavedPlaceAction) => void;
  onMovePlaceGroup: (draftId: string, request: TripNearbyGroupMoveRequest) => boolean;
  onMovePlace: (draftId: string, logicalPlaceId: string, dayId: string) => void;
  onMovePlaceWithinSection: (draftId: string, logicalPlaceId: string, direction: "up" | "down", placeName: string) => void;
  onRemovePlace: (logicalPlaceId: string) => void;
  onSetPlaceTimeBlock: (draftId: string, logicalPlaceId: string, timeBlock: TripTimeBlock | null, placeName: string) => void;
  translate: TripPlannerTranslate;
}) {
  const actionRows = useMemo(
    () => getTripPlaceActionRows(block.places),
    [block.places]
  );
  const nearbyGroupItems = useMemo(
    () => getTripNearbyPlaceGroupItems(block.places, dayId, block.timeBlock, language, translate),
    [block.places, block.timeBlock, dayId, language, translate]
  );
  const unavailable = isLoadingPlaces ? 0 : block.counts.unavailable;
  const isNamedEmptyBlock = block.timeBlock && actionRows.length === 0 && unavailable === 0;

  return (
    <section className="trip-time-block-section" aria-labelledby={`trip-time-block-${draftId}-${block.id}`}>
      <div className="trip-time-block-heading">
        <h3 id={`trip-time-block-${draftId}-${block.id}`}>{timeBlockLabel(block.timeBlock, translate)}</h3>
        <span>{block.counts.total} {translate("tripDrafts.places")}</span>
      </div>

      {unavailable > 0 && (
        <div className="route-status">
          {translate("tripDrafts.itinerary.unavailableInSection").replace("{count}", String(unavailable))}
        </div>
      )}

      {isNamedEmptyBlock && (
        <div className="trip-time-block-empty">
          {emptyTimeBlockLabel(block.timeBlock, translate)}
        </div>
      )}

      <TripPlaceCardList
        actionRows={actionRows}
        draftId={draftId}
        moveOptions={moveOptions}
        onExecuteAction={onExecuteAction}
        onMovePlace={onMovePlace}
        onMovePlaceWithinSection={onMovePlaceWithinSection}
        onRemovePlace={onRemovePlace}
        onSetPlaceTimeBlock={onSetPlaceTimeBlock}
        translate={translate}
      />

      <TripNearbyPlaceGroups
        items={nearbyGroupItems}
        moveOptions={moveOptions}
        onMoveGroup={(request) => onMovePlaceGroup(draftId, request)}
        translate={translate}
        title={translate("tripDrafts.nearbyGroups")}
      />
    </section>
  );
}
