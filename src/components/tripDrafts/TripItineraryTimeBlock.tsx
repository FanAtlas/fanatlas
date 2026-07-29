import { useMemo } from "react";
import type { HydratedTripTimeBlockSection, TripPlaceVisitStatus, TripTimeBlock } from "../../lib/tripDrafts";
import type { SavedPlaceAction } from "../../lib/savedPlaceActions";
import { emptyTimeBlockLabel, getTripNearbyPlaceGroupItems, getTripPlaceActionRows, timeBlockLabel } from "./displayUtils";
import { TripNearbyPlaceGroups } from "./TripNearbyPlaceGroups";
import { TripPlaceCardList } from "./TripPlaceCardList";
import type { PlanningActionCallbacks, TripDayDestinationOption, TripNearbyGroupMoveRequest, TripPhotoCallbacks, TripPlannerTranslate } from "./types";

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
  onUpdatePlaceNote,
  onUpdatePlaceVisitStatus,
  placePlanningActionCallbacks,
  photoCallbacks,
  addingPhotosPlaceId,
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
  onUpdatePlaceNote: (draftId: string, logicalPlaceId: string, note: string | null, expectedCurrentNote: string | null) => boolean;
  onUpdatePlaceVisitStatus: (draftId: string, logicalPlaceId: string, status: TripPlaceVisitStatus) => boolean;
  placePlanningActionCallbacks: (draftId: string, logicalPlaceId: string) => PlanningActionCallbacks;
  photoCallbacks: (draftId: string, logicalPlaceId: string) => TripPhotoCallbacks;
  addingPhotosPlaceId: string | null;
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
        language={language}
        places={block.places}
        moveOptions={moveOptions}
        onExecuteAction={onExecuteAction}
        onMovePlace={onMovePlace}
        onMovePlaceWithinSection={onMovePlaceWithinSection}
        onRemovePlace={onRemovePlace}
        onSetPlaceTimeBlock={onSetPlaceTimeBlock}
        onUpdatePlaceNote={onUpdatePlaceNote}
        onUpdatePlaceVisitStatus={onUpdatePlaceVisitStatus}
        placePlanningActionCallbacks={placePlanningActionCallbacks}
        photoCallbacks={photoCallbacks}
        addingPhotosPlaceId={addingPhotosPlaceId}
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
