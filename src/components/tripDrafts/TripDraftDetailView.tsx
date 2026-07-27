import { useMemo } from "react";
import { Copy, Edit3, Trash2 } from "lucide-react";
import type { HydratedTripDraft, TripDraft, TripItineraryDay, TripTimeBlock } from "../../lib/tripDrafts";
import { UNSCHEDULED_TRIP_DAY_ID } from "../../lib/tripDrafts";
import type { SavedPlaceAction } from "../../lib/savedPlaceActions";
import { getTripAlignmentNotice, getTripContextLines } from "./displayUtils";
import { CreateMissingTripDaysControl } from "./CreateMissingTripDaysControl";
import { TripDetailsEditor } from "./TripDetailsEditor";
import { DeleteTripDraftConfirm, InlineTripDraftNameEditor } from "./TripInlineControls";
import { TripItinerary } from "./TripItinerary";
import type { TripNearbyGroupMoveRequest, TripPlannerTranslate } from "./types";

export function TripDraftDetailView({
  deleteId,
  deleteDayId,
  detailsDestination,
  detailsEndDate,
  detailsStartDate,
  draft,
  editingDetailsId,
  editingId,
  editingDayId,
  editingDayTitle,
  editingName,
  isLoadingPlaces,
  language,
  newDayTitle,
  onCancelDelete,
  onCancelDeleteDay,
  onCancelEdit,
  onCancelEditDetails,
  onCancelEditDay,
  onConfirmDelete,
  onConfirmDeleteDay,
  onCreateDay,
  onCreateMissingDays,
  onDayDeleteRequest,
  onDeleteRequest,
  onDuplicate,
  onEditDayTitle,
  onEditDetailsDestination,
  onEditDetailsEndDate,
  onEditDetailsStartDate,
  onEditName,
  onExecuteAction,
  onMovePlaceGroup,
  onMovePlace,
  onMovePlaceWithinSection,
  onSetPlaceTimeBlock,
  onNewDayTitleChange,
  onRemovePlace,
  onRename,
  onRenameDay,
  onSaveDetails,
  onStartEditDetails,
  onStartRename,
  onStartRenameDay,
  translate
}: {
  deleteId: string | null;
  deleteDayId: string | null;
  detailsDestination: string;
  detailsEndDate: string;
  detailsStartDate: string;
  draft: HydratedTripDraft;
  editingDetailsId: string | null;
  editingId: string | null;
  editingDayId: string | null;
  editingDayTitle: string;
  editingName: string;
  isLoadingPlaces: boolean;
  language: string;
  newDayTitle: string;
  onCancelDelete: () => void;
  onCancelDeleteDay: () => void;
  onCancelEdit: () => void;
  onCancelEditDetails: () => void;
  onCancelEditDay: () => void;
  onConfirmDelete: (draftId: string) => void;
  onConfirmDeleteDay: (draftId: string, dayId: string) => void;
  onCreateDay: (draftId: string) => void;
  onCreateMissingDays: (draft: HydratedTripDraft) => void;
  onDayDeleteRequest: (dayId: string) => void;
  onDeleteRequest: (draftId: string) => void;
  onDuplicate: (draft: TripDraft) => void;
  onEditDayTitle: (title: string) => void;
  onEditDetailsDestination: (destination: string) => void;
  onEditDetailsEndDate: (date: string) => void;
  onEditDetailsStartDate: (date: string) => void;
  onEditName: (name: string) => void;
  onExecuteAction: (action: SavedPlaceAction) => void;
  onMovePlaceGroup: (draftId: string, request: TripNearbyGroupMoveRequest) => boolean;
  onMovePlace: (draftId: string, logicalPlaceId: string, dayId: string) => void;
  onMovePlaceWithinSection: (draftId: string, logicalPlaceId: string, direction: "up" | "down", placeName: string) => void;
  onSetPlaceTimeBlock: (draftId: string, logicalPlaceId: string, timeBlock: TripTimeBlock | null, placeName: string) => void;
  onNewDayTitleChange: (title: string) => void;
  onRemovePlace: (logicalPlaceId: string) => void;
  onRename: (draftId: string) => void;
  onRenameDay: (draftId: string, dayId: string) => void;
  onSaveDetails: (draftId: string) => void;
  onStartEditDetails: (draft: TripDraft) => void;
  onStartRename: (draft: TripDraft) => void;
  onStartRenameDay: (day: TripItineraryDay) => void;
  translate: TripPlannerTranslate;
}) {
  const unavailable = isLoadingPlaces ? 0 : draft.counts.unavailable;
  const contextLines = getTripContextLines(draft, language, translate);
  const alignmentNotice = getTripAlignmentNotice(draft, translate);
  const moveOptions = useMemo(
    () => [
      { id: UNSCHEDULED_TRIP_DAY_ID, label: translate("tripDrafts.itinerary.unscheduled") },
      ...draft.draft.itineraryDays.map((day) => ({ id: day.id, label: day.title }))
    ],
    [draft.draft.itineraryDays, translate]
  );

  return (
    <>
      <section className="collection-detail-hero">
        <div>
          {editingId === draft.draft.id ? (
            <InlineTripDraftNameEditor
              name={editingName}
              onCancel={onCancelEdit}
              onChange={onEditName}
              onSave={() => onRename(draft.draft.id)}
              translate={translate}
            />
          ) : (
            <>
              <h1>{draft.draft.name}</h1>
              <p>{translate("tripDrafts.draftStatus")}</p>
              {contextLines.map((line) => <p key={line}>{line}</p>)}
              {draft.draft.source?.collectionNameSnapshot && (
                <p>{translate("tripDrafts.sourceCollection").replace("{name}", draft.draft.source.collectionNameSnapshot)}</p>
              )}
            </>
          )}
          <div className="collection-count-row">
            <span>{draft.counts.total} {translate("tripDrafts.places")}</span>
            <span>{draft.counts.days} {translate("tripDrafts.itinerary.title")}</span>
            <span>{isLoadingPlaces ? translate("tripDrafts.loadingPlaces") : `${draft.counts.available} ${translate("tripDrafts.available")}`}</span>
            {unavailable > 0 && <span>{unavailable} {translate("tripDrafts.unavailable")}</span>}
          </div>
        </div>
        <div className="collection-detail-actions">
          <button className="secondary-btn" onClick={() => onStartRename(draft.draft)} type="button">
            <Edit3 size={14} aria-hidden="true" />
            {translate("tripDrafts.rename")}
          </button>
          <button className="secondary-btn" onClick={() => onStartEditDetails(draft.draft)} type="button">
            <Edit3 size={14} aria-hidden="true" />
            {translate("tripDrafts.details.edit")}
          </button>
          <button className="secondary-btn" onClick={() => onDuplicate(draft.draft)} type="button">
            <Copy size={14} aria-hidden="true" />
            {translate("tripDrafts.duplicate")}
          </button>
          <button className="secondary-btn" onClick={() => onDeleteRequest(draft.draft.id)} type="button">
            <Trash2 size={14} aria-hidden="true" />
            {translate("tripDrafts.delete")}
          </button>
        </div>
      </section>

      {editingDetailsId === draft.draft.id && (
        <TripDetailsEditor
          destination={detailsDestination}
          endDate={detailsEndDate}
          onCancel={onCancelEditDetails}
          onDestinationChange={onEditDetailsDestination}
          onEndDateChange={onEditDetailsEndDate}
          onSave={() => onSaveDetails(draft.draft.id)}
          onStartDateChange={onEditDetailsStartDate}
          startDate={detailsStartDate}
          translate={translate}
        />
      )}

      {alignmentNotice && <div className="route-status">{alignmentNotice}</div>}

      {draft.context.dateAlignment && draft.context.dateAlignment.unusedTripDates > 0 && (
        <CreateMissingTripDaysControl
          count={draft.context.dateAlignment.unusedTripDates}
          onCreate={() => onCreateMissingDays(draft)}
          translate={translate}
        />
      )}

      {deleteId === draft.draft.id && (
        <DeleteTripDraftConfirm draft={draft.draft} onCancel={onCancelDelete} onConfirm={() => onConfirmDelete(draft.draft.id)} translate={translate} />
      )}

      {unavailable > 0 && (
        <div className="route-status">
          {translate("tripDrafts.unavailableNotice").replace("{count}", String(unavailable))}
        </div>
      )}

      <TripItinerary
        deleteDayId={deleteDayId}
        draft={draft}
        editingDayId={editingDayId}
        editingDayTitle={editingDayTitle}
        isLoadingPlaces={isLoadingPlaces}
        language={language}
        moveOptions={moveOptions}
        newDayTitle={newDayTitle}
        onCancelDeleteDay={onCancelDeleteDay}
        onCancelEditDay={onCancelEditDay}
        onConfirmDeleteDay={onConfirmDeleteDay}
        onCreateDay={onCreateDay}
        onDayDeleteRequest={onDayDeleteRequest}
        onEditDayTitle={onEditDayTitle}
        onExecuteAction={onExecuteAction}
        onMovePlaceGroup={onMovePlaceGroup}
        onMovePlace={onMovePlace}
        onMovePlaceWithinSection={onMovePlaceWithinSection}
        onNewDayTitleChange={onNewDayTitleChange}
        onRemovePlace={onRemovePlace}
        onRenameDay={onRenameDay}
        onSetPlaceTimeBlock={onSetPlaceTimeBlock}
        onStartRenameDay={onStartRenameDay}
        translate={translate}
      />
    </>
  );
}
