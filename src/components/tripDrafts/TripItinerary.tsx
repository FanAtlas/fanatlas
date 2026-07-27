import { Plus } from "lucide-react";
import type { HydratedTripDraft, TripItineraryDay, TripTimeBlock } from "../../lib/tripDrafts";
import type { SavedPlaceAction } from "../../lib/savedPlaceActions";
import { TripItinerarySection } from "./TripItinerarySection";
import type { TripDayDestinationOption, TripNearbyGroupMoveRequest, TripPlannerTranslate } from "./types";

export function TripItinerary({
  deleteDayId,
  draft,
  editingDayId,
  editingDayTitle,
  isLoadingPlaces,
  language,
  moveOptions,
  newDayTitle,
  onCancelDeleteDay,
  onCancelEditDay,
  onConfirmDeleteDay,
  onCreateDay,
  onDayDeleteRequest,
  onEditDayTitle,
  onExecuteAction,
  onMovePlaceGroup,
  onMovePlace,
  onMovePlaceWithinSection,
  onNewDayTitleChange,
  onRemovePlace,
  onRenameDay,
  onSetPlaceTimeBlock,
  onStartRenameDay,
  translate
}: {
  deleteDayId: string | null;
  draft: HydratedTripDraft;
  editingDayId: string | null;
  editingDayTitle: string;
  isLoadingPlaces: boolean;
  language: string;
  moveOptions: TripDayDestinationOption[];
  newDayTitle: string;
  onCancelDeleteDay: () => void;
  onCancelEditDay: () => void;
  onConfirmDeleteDay: (draftId: string, dayId: string) => void;
  onCreateDay: (draftId: string) => void;
  onDayDeleteRequest: (dayId: string) => void;
  onEditDayTitle: (title: string) => void;
  onExecuteAction: (action: SavedPlaceAction) => void;
  onMovePlaceGroup: (draftId: string, request: TripNearbyGroupMoveRequest) => boolean;
  onMovePlace: (draftId: string, logicalPlaceId: string, dayId: string) => void;
  onMovePlaceWithinSection: (draftId: string, logicalPlaceId: string, direction: "up" | "down", placeName: string) => void;
  onNewDayTitleChange: (title: string) => void;
  onRemovePlace: (logicalPlaceId: string) => void;
  onRenameDay: (draftId: string, dayId: string) => void;
  onSetPlaceTimeBlock: (draftId: string, logicalPlaceId: string, timeBlock: TripTimeBlock | null, placeName: string) => void;
  onStartRenameDay: (day: TripItineraryDay) => void;
  translate: TripPlannerTranslate;
}) {
  return (
    <>
      <section className="trip-itinerary-create collection-detail-hero">
        <div>
          <strong>{translate("tripDrafts.itinerary.newDay")}</strong>
          <p>{translate("tripDrafts.emptyDraftDescription")}</p>
        </div>
        <label>
          <span>{translate("tripDrafts.itinerary.dayTitle")}</span>
          <input
            maxLength={80}
            onChange={(event) => onNewDayTitleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onCreateDay(draft.draft.id);
              if (event.key === "Escape") onNewDayTitleChange("");
            }}
            value={newDayTitle}
          />
        </label>
        <button className="primary-btn" onClick={() => onCreateDay(draft.draft.id)} type="button">
          <Plus size={15} aria-hidden="true" />
          {translate("tripDrafts.itinerary.createDay")}
        </button>
      </section>

      <div className="trip-itinerary-sections">
        {draft.sections.map((section) => (
          <div key={section.id}>
            <TripItinerarySection
              deleteDayId={deleteDayId}
              draftId={draft.draft.id}
              editingDayId={editingDayId}
              editingDayTitle={editingDayTitle}
              isLoadingPlaces={isLoadingPlaces}
              moveOptions={moveOptions}
              onCancelDeleteDay={onCancelDeleteDay}
              onCancelEditDay={onCancelEditDay}
              onConfirmDeleteDay={onConfirmDeleteDay}
              onDayDeleteRequest={onDayDeleteRequest}
              onEditDayTitle={onEditDayTitle}
              onExecuteAction={onExecuteAction}
              onMovePlaceGroup={onMovePlaceGroup}
              onMovePlace={onMovePlace}
              onMovePlaceWithinSection={onMovePlaceWithinSection}
              onSetPlaceTimeBlock={onSetPlaceTimeBlock}
              onRemovePlace={onRemovePlace}
              onRenameDay={onRenameDay}
              onStartRenameDay={onStartRenameDay}
              section={section}
              language={language}
              translate={translate}
            />
          </div>
        ))}
      </div>
    </>
  );
}
