import { useMemo } from "react";
import { Edit3, Trash2 } from "lucide-react";
import type { HydratedTripItinerarySection, TripItineraryDay, TripPlaceVisitStatus, TripTimeBlock } from "../../lib/tripDrafts";
import type { SavedPlaceAction } from "../../lib/savedPlaceActions";
import { formatLongIsoDate, getTripPlaceActionRows } from "./displayUtils";
import { DeleteTripDayConfirm, InlineTripDayTitleEditor } from "./TripInlineControls";
import { TripItineraryTimeBlock } from "./TripItineraryTimeBlock";
import { TripPlaceCardList } from "./TripPlaceCardList";
import type { PlanningActionCallbacks, TripDayDestinationOption, TripNearbyGroupMoveRequest, TripPhotoCallbacks, TripPlannerTranslate } from "./types";

export function TripItinerarySection({
  deleteDayId,
  draftId,
  editingDayId,
  editingDayTitle,
  isLoadingPlaces,
  language,
  moveOptions,
  onCancelDeleteDay,
  onCancelEditDay,
  onConfirmDeleteDay,
  onDayDeleteRequest,
  onEditDayTitle,
  onExecuteAction,
  onMovePlaceGroup,
  onMovePlace,
  onMovePlaceWithinSection,
  onSetPlaceTimeBlock,
  onUpdatePlaceNote,
  onUpdatePlaceVisitStatus,
  placePlanningActionCallbacks,
  photoCallbacks,
  addingPhotosPlaceId,
  onRemovePlace,
  onRenameDay,
  onStartRenameDay,
  section,
  translate
}: {
  deleteDayId: string | null;
  draftId: string;
  editingDayId: string | null;
  editingDayTitle: string;
  isLoadingPlaces: boolean;
  language: string;
  moveOptions: TripDayDestinationOption[];
  onCancelDeleteDay: () => void;
  onCancelEditDay: () => void;
  onConfirmDeleteDay: (draftId: string, dayId: string) => void;
  onDayDeleteRequest: (dayId: string) => void;
  onEditDayTitle: (title: string) => void;
  onExecuteAction: (action: SavedPlaceAction) => void;
  onMovePlaceGroup: (draftId: string, request: TripNearbyGroupMoveRequest) => boolean;
  onMovePlace: (draftId: string, logicalPlaceId: string, dayId: string) => void;
  onMovePlaceWithinSection: (draftId: string, logicalPlaceId: string, direction: "up" | "down", placeName: string) => void;
  onSetPlaceTimeBlock: (draftId: string, logicalPlaceId: string, timeBlock: TripTimeBlock | null, placeName: string) => void;
  onUpdatePlaceNote: (draftId: string, logicalPlaceId: string, note: string | null, expectedCurrentNote: string | null) => boolean;
  onUpdatePlaceVisitStatus: (draftId: string, logicalPlaceId: string, status: TripPlaceVisitStatus) => boolean;
  placePlanningActionCallbacks: (draftId: string, logicalPlaceId: string) => PlanningActionCallbacks;
  photoCallbacks: (draftId: string, logicalPlaceId: string) => TripPhotoCallbacks;
  addingPhotosPlaceId: string | null;
  onRemovePlace: (logicalPlaceId: string) => void;
  onRenameDay: (draftId: string, dayId: string) => void;
  onStartRenameDay: (day: TripItineraryDay) => void;
  section: HydratedTripItinerarySection;
  translate: TripPlannerTranslate;
}) {
  const actionRows = useMemo(
    () => getTripPlaceActionRows(section.places),
    [section.places]
  );
  const unavailable = isLoadingPlaces ? 0 : section.counts.unavailable;
  const title = section.kind === "unscheduled" ? translate("tripDrafts.itinerary.unscheduled") : section.title;

  return (
    <section className="trip-itinerary-section">
      <div className="trip-itinerary-section-header">
        <div>
          {section.kind === "day" && editingDayId === section.id ? (
            <InlineTripDayTitleEditor
              title={editingDayTitle}
              onCancel={onCancelEditDay}
              onChange={onEditDayTitle}
              onSave={() => onRenameDay(draftId, section.id)}
              translate={translate}
            />
          ) : (
            <>
              <h2>{title}</h2>
              {section.kind === "day" && section.date && (
                <p>{formatLongIsoDate(section.date, language)}</p>
              )}
              <p>{section.kind === "unscheduled" ? translate("tripDrafts.itinerary.unscheduledDescription") : translate("tripDrafts.itinerary.currentSection")}</p>
            </>
          )}
          <div className="collection-count-row">
            <span>{section.counts.total} {translate("tripDrafts.places")}</span>
            <span>{isLoadingPlaces ? translate("tripDrafts.loadingPlaces") : `${section.counts.available} ${translate("tripDrafts.available")}`}</span>
            {unavailable > 0 && <span>{unavailable} {translate("tripDrafts.unavailable")}</span>}
          </div>
        </div>
        {section.kind === "day" && section.day && (
          <div className="collection-detail-actions">
            <button className="secondary-btn" onClick={() => onStartRenameDay(section.day!)} type="button">
              <Edit3 size={14} aria-hidden="true" />
              {translate("tripDrafts.itinerary.renameDay")}
            </button>
            <button className="secondary-btn" onClick={() => onDayDeleteRequest(section.id)} type="button">
              <Trash2 size={14} aria-hidden="true" />
              {translate("tripDrafts.itinerary.deleteDay")}
            </button>
          </div>
        )}
      </div>

      {deleteDayId === section.id && section.kind === "day" && section.day && (
        <DeleteTripDayConfirm
          day={section.day}
          onCancel={onCancelDeleteDay}
          onConfirm={() => onConfirmDeleteDay(draftId, section.id)}
          translate={translate}
        />
      )}

      {section.kind === "unscheduled" && unavailable > 0 && (
        <div className="route-status">
          {translate("tripDrafts.itinerary.unavailableInSection").replace("{count}", String(unavailable))}
        </div>
      )}

      {section.isOutsideTravelDateRange && (
        <div className="route-status">
          {translate("tripDrafts.details.outsideDateRange")}
        </div>
      )}

      {section.kind === "unscheduled" && !isLoadingPlaces && actionRows.length === 0 && unavailable === 0 && (
        <div className="card-dark">
          <strong>{translate("tripDrafts.itinerary.noPlaces")}</strong>
        </div>
      )}

      {section.kind === "unscheduled" ? (
        <TripPlaceCardList
          actionRows={actionRows}
          draftId={draftId}
          language={language}
          places={section.places}
          moveOptions={moveOptions}
          onExecuteAction={onExecuteAction}
          onMovePlace={onMovePlace}
          onMovePlaceWithinSection={onMovePlaceWithinSection}
          onRemovePlace={onRemovePlace}
          onUpdatePlaceNote={onUpdatePlaceNote}
          onUpdatePlaceVisitStatus={onUpdatePlaceVisitStatus}
          placePlanningActionCallbacks={placePlanningActionCallbacks}
          photoCallbacks={photoCallbacks}
          addingPhotosPlaceId={addingPhotosPlaceId}
          translate={translate}
        />
      ) : (
        <div className="trip-time-blocks">
          {(section.timeBlocks || []).filter((block) => block.timeBlock || block.counts.total > 0).map((block) => (
            <div key={block.id}>
              <TripItineraryTimeBlock
                block={block}
                dayId={section.id}
                draftId={draftId}
                isLoadingPlaces={isLoadingPlaces}
                language={language}
                moveOptions={moveOptions}
                onExecuteAction={onExecuteAction}
                onMovePlaceGroup={onMovePlaceGroup}
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
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
