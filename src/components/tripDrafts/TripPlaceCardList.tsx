import { useId, useState } from "react";
import { normalizeTripPlaceVisitStatus, type HydratedTripDraftPlace, type TripPlaceVisitStatus, type TripTimeBlock } from "../../lib/tripDrafts";
import type { SavedPlaceAction } from "../../lib/savedPlaceActions";
import { PlacePlanningActions } from "./PlacePlanningActions";
import { TripPlacePhotos } from "./TripPlacePhotos";
import { TripPlaceNoteEditor } from "./TripPlaceNoteEditor";
import { TripPlaceCard } from "./TripPlaceCard";
import { TripPlaceVisitStatusControl } from "./TripPlaceVisitStatusControl";
import type { PlanningActionCallbacks, TripDayDestinationOption, TripPhotoCallbacks, TripPlaceActionRow, TripPlannerTranslate } from "./types";

export function TripPlaceCardList({
  actionRows,
  draftId,
  language,
  places,
  moveOptions,
  onExecuteAction,
  onMovePlace,
  onMovePlaceWithinSection,
  onUpdatePlaceVisitStatus,
  onUpdatePlaceNote,
  placePlanningActionCallbacks,
  photoCallbacks,
  addingPhotosPlaceId,
  onRemovePlace,
  onSetPlaceTimeBlock,
  translate
}: {
  actionRows: TripPlaceActionRow[];
  draftId: string;
  language: string;
  places: HydratedTripDraftPlace[];
  moveOptions: TripDayDestinationOption[];
  onExecuteAction: (action: SavedPlaceAction) => void;
  onMovePlace: (draftId: string, logicalPlaceId: string, dayId: string) => void;
  onMovePlaceWithinSection: (draftId: string, logicalPlaceId: string, direction: "up" | "down", placeName: string) => void;
  onUpdatePlaceVisitStatus: (draftId: string, logicalPlaceId: string, status: TripPlaceVisitStatus) => boolean;
  onUpdatePlaceNote: (draftId: string, logicalPlaceId: string, note: string | null, expectedCurrentNote: string | null) => boolean;
  placePlanningActionCallbacks: (draftId: string, logicalPlaceId: string) => PlanningActionCallbacks;
  photoCallbacks: (draftId: string, logicalPlaceId: string) => TripPhotoCallbacks;
  addingPhotosPlaceId: string | null;
  onRemovePlace: (logicalPlaceId: string) => void;
  onSetPlaceTimeBlock?: (draftId: string, logicalPlaceId: string, timeBlock: TripTimeBlock | null, placeName: string) => void;
  translate: TripPlannerTranslate;
}) {
  const rowsByPlaceId = new Map(actionRows.map((row) => [row.place.id, row]));

  return (
    <div className="collection-place-list">
      {places.map(({ reference, place }) => {
        if (!place) {
          return (
            <div key={reference.logicalPlaceId}>
              <TripUnavailablePlaceReferenceCard
                note={reference.planningNote}
                language={language}
                onUpdateVisitStatus={(status) => onUpdatePlaceVisitStatus(draftId, reference.logicalPlaceId, status)}
                onUpdateNote={(note, expectedCurrentNote) => onUpdatePlaceNote(draftId, reference.logicalPlaceId, note, expectedCurrentNote)}
                planningActionCallbacks={placePlanningActionCallbacks(draftId, reference.logicalPlaceId)}
                planningActions={reference.planningActions || []}
                photoCallbacks={photoCallbacks(draftId, reference.logicalPlaceId)}
                photoIds={reference.photoIds || []}
                isAddingPhotos={addingPhotosPlaceId === reference.logicalPlaceId}
                translate={translate}
                visitStatus={normalizeTripPlaceVisitStatus(reference.visitStatus)}
              />
            </div>
          );
        }
        const row = rowsByPlaceId.get(place.id);
        if (!row) return null;
        const { actions, position } = row;
        return (
          <div key={place.id}>
            <TripPlaceCard
              actions={actions}
              canMoveDown={position.canMoveDown}
              canMoveUp={position.canMoveUp}
              currentDayId={reference.dayId}
              currentTimeBlock={reference.timeBlock || null}
              language={language}
              moveOptions={moveOptions}
              onExecuteAction={onExecuteAction}
              place={place}
              placePlanningActionCallbacks={placePlanningActionCallbacks(draftId, place.id)}
              placePlanningActions={reference.planningActions || []}
              photoCallbacks={photoCallbacks(draftId, place.id)}
              photoIds={reference.photoIds || []}
              isAddingPhotos={addingPhotosPlaceId === place.id}
              planningActions={{
                onMoveToDay: (dayId) => onMovePlace(draftId, place.id, dayId),
                onMoveDown: () => onMovePlaceWithinSection(draftId, place.id, "down", place.name),
                onMoveUp: () => onMovePlaceWithinSection(draftId, place.id, "up", place.name),
                onRemove: () => onRemovePlace(place.id),
                onSetTimeBlock: onSetPlaceTimeBlock ? (timeBlock) => onSetPlaceTimeBlock(draftId, place.id, timeBlock, place.name) : undefined,
                onUpdateNote: (note, expectedCurrentNote) => onUpdatePlaceNote(draftId, place.id, note, expectedCurrentNote),
                onUpdateVisitStatus: (status) => onUpdatePlaceVisitStatus(draftId, place.id, status)
              }}
              planningNote={reference.planningNote}
              translate={translate}
              visitStatus={normalizeTripPlaceVisitStatus(reference.visitStatus)}
            />
          </div>
        );
      })}
    </div>
  );
}

function TripUnavailablePlaceReferenceCard({
  language,
  note,
  onUpdateNote,
  onUpdateVisitStatus,
  planningActionCallbacks,
  planningActions,
  photoCallbacks,
  photoIds,
  isAddingPhotos,
  translate,
  visitStatus
}: {
  language: string;
  note?: string;
  onUpdateNote: (note: string | null, expectedCurrentNote: string | null) => boolean;
  onUpdateVisitStatus: (status: TripPlaceVisitStatus) => boolean;
  planningActionCallbacks: PlanningActionCallbacks;
  planningActions: HydratedTripDraftPlace["reference"]["planningActions"];
  photoCallbacks: TripPhotoCallbacks;
  photoIds: readonly string[];
  isAddingPhotos?: boolean;
  translate: TripPlannerTranslate;
  visitStatus: TripPlaceVisitStatus;
}) {
  const noteEditorId = useId();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [expectedNote, setExpectedNote] = useState<string | null>(null);
  const currentNote = note || "";
  const hasNote = Boolean(currentNote);

  function openNoteEditor() {
    setExpectedNote(currentNote || null);
    setIsEditingNote(true);
  }

  function saveNote(nextNote: string | null) {
    const saved = onUpdateNote(nextNote, expectedNote);
    if (saved) setIsEditingNote(false);
  }

  return (
    <article className="collection-place-card trip-place-unavailable-card">
      <div className="favorite-icon">?</div>
      <div className="favorite-card-main">
        <span>{translate("tripDrafts.unavailable")}</span>
        <strong>{translate("tripDrafts.notes.unavailablePlace")}</strong>
        <p>{translate("tripDrafts.unavailableNotice").replace("{count}", "1")}</p>
      </div>
      <TripPlaceVisitStatusControl
        onChange={onUpdateVisitStatus}
        status={visitStatus}
        translate={translate}
      />
      <div className="trip-place-note">
        {hasNote && !isEditingNote && (
          <>
            <h4 className="trip-place-note__heading">{translate("tripDrafts.notes.heading")}</h4>
            <p className="trip-place-note__text">{currentNote}</p>
          </>
        )}
        {!isEditingNote && (
          <button
            aria-controls={noteEditorId}
            aria-expanded={isEditingNote}
            className="secondary-btn trip-place-note__action"
            onClick={openNoteEditor}
            type="button"
          >
            {translate(hasNote ? "tripDrafts.notes.edit" : "tripDrafts.notes.add")}
          </button>
        )}
        {isEditingNote && (
          <div id={noteEditorId}>
            <TripPlaceNoteEditor
              initialNote={currentNote}
              language={language}
              onCancel={() => setIsEditingNote(false)}
              onRemove={hasNote ? () => saveNote(null) : undefined}
              onSave={(nextNote) => saveNote(nextNote)}
              translate={translate}
            />
          </div>
        )}
      </div>
      <PlacePlanningActions
        actions={planningActions || []}
        callbacks={planningActionCallbacks}
        language={language}
        translate={translate}
      />
      <TripPlacePhotos
        callbacks={photoCallbacks}
        isAdding={isAddingPhotos}
        language={language}
        photoIds={photoIds}
        placeName={translate("tripDrafts.notes.unavailablePlace")}
        translate={translate}
      />
    </article>
  );
}
