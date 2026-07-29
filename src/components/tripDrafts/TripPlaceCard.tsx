import { useId, useState } from "react";
import { ArrowDown, ArrowUp, MapPin, MinusCircle } from "lucide-react";
import { SavedPlaceSecondaryActions } from "../SavedPlaceSecondaryActions";
import { normalizeTripPlaceVisitStatus, type PlanningAction, type TripPlaceVisitStatus, type TripTimeBlock } from "../../lib/tripDrafts";
import type { SavedPlace } from "../../lib/savedPlaces";
import type { SavedPlaceAction } from "../../lib/savedPlaceActions";
import { iconFor, typeLabel } from "./displayUtils";
import { PlacePlanningActions } from "./PlacePlanningActions";
import { TripPlacePhotos } from "./TripPlacePhotos";
import { TripMoveToControl } from "./TripMoveToControl";
import { TripPlaceNoteEditor } from "./TripPlaceNoteEditor";
import { TripPlaceVisitStatusControl } from "./TripPlaceVisitStatusControl";
import { TripTimeBlockSelector } from "./TripTimeBlockSelector";
import type { PlanningActionCallbacks, TripDayDestinationOption, TripPhotoCallbacks, TripPlacePlanningActions, TripPlannerTranslate } from "./types";

export function TripPlaceCard({
  actions,
  canMoveDown,
  canMoveUp,
  currentDayId,
  currentTimeBlock,
  language,
  moveOptions,
  onExecuteAction,
  place,
  placePlanningActions,
  placePlanningActionCallbacks,
  photoCallbacks,
  photoIds,
  isAddingPhotos,
  planningActions,
  planningNote,
  visitStatus,
  translate
}: {
  actions: {
    primary?: SavedPlaceAction;
    secondary: SavedPlaceAction[];
  };
  canMoveDown: boolean;
  canMoveUp: boolean;
  currentDayId: string;
  currentTimeBlock: TripTimeBlock | null;
  language: string;
  moveOptions: TripDayDestinationOption[];
  onExecuteAction: (action: SavedPlaceAction) => void;
  place: SavedPlace;
  placePlanningActions: readonly PlanningAction[];
  placePlanningActionCallbacks: PlanningActionCallbacks;
  photoCallbacks: TripPhotoCallbacks;
  photoIds: readonly string[];
  isAddingPhotos?: boolean;
  planningActions: TripPlacePlanningActions & {
    onRemove: () => void;
  };
  planningNote?: string;
  visitStatus?: TripPlaceVisitStatus;
  translate: TripPlannerTranslate;
}) {
  const noteEditorId = useId();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [expectedNote, setExpectedNote] = useState<string | null>(null);
  const [isConfirmingPhotoPlaceRemove, setIsConfirmingPhotoPlaceRemove] = useState(false);
  const currentNote = planningNote || "";
  const hasNote = Boolean(currentNote);
  const hasPhotos = photoIds.length > 0;

  function openNoteEditor() {
    setExpectedNote(currentNote || null);
    setIsEditingNote(true);
  }

  function saveNote(note: string | null) {
    if (!planningActions.onUpdateNote) return;
    const saved = planningActions.onUpdateNote(note, expectedNote);
    if (saved) setIsEditingNote(false);
  }

  return (
    <article className="collection-place-card">
      {place.image ? <img src={place.image} alt={place.name} /> : <div className="favorite-icon">{iconFor(place.itemType || place.type)}</div>}
      <div className="favorite-card-main">
        <span>{typeLabel(place.itemType || place.type)}</span>
        <strong>{place.name}</strong>
        <p>{[place.city, place.country].filter(Boolean).join(", ") || place.address || "FanAtlas"}</p>
      </div>
      <div className="favorite-card-actions">
        {actions.primary && (
          <button className="secondary-btn" onClick={() => onExecuteAction(actions.primary!)} type="button">
            <MapPin size={15} aria-hidden="true" />
            {translate("tripDrafts.view")}
          </button>
        )}
        <button
          className="secondary-btn"
          onClick={() => {
            if (hasPhotos) {
              setIsConfirmingPhotoPlaceRemove(true);
              return;
            }
            planningActions.onRemove();
          }}
          type="button"
        >
          <MinusCircle size={15} aria-hidden="true" />
          {translate("tripDrafts.removeFromDraft")}
        </button>
      </div>
      {isConfirmingPhotoPlaceRemove && (
        <div className="collection-delete-confirm trip-photo-place-remove-confirm" role="group" aria-label={translate("tripDrafts.photos.removePlacePhotosTitle")}>
          <strong>{translate("tripDrafts.photos.removePlacePhotosTitle")}</strong>
          <p>{translate("tripDrafts.photos.removePlacePhotosDescription")}</p>
          <div>
            <button className="secondary-btn trip-photo-thumbnail__remove" onClick={planningActions.onRemove} type="button">
              {translate("tripDrafts.photos.removePlaceAndPhotos")}
            </button>
            <button className="secondary-btn" onClick={() => setIsConfirmingPhotoPlaceRemove(false)} type="button">
              {translate("tripDrafts.cancel")}
            </button>
          </div>
        </div>
      )}
      {planningActions.onUpdateVisitStatus && (
        <TripPlaceVisitStatusControl
          onChange={planningActions.onUpdateVisitStatus}
          status={normalizeTripPlaceVisitStatus(visitStatus)}
          translate={translate}
        />
      )}
      <TripMoveToControl
        currentDayId={currentDayId}
        moveOptions={moveOptions}
        onMove={planningActions.onMoveToDay}
        translate={translate}
      />
      {planningActions.onSetTimeBlock && (
        <TripTimeBlockSelector
          onChange={planningActions.onSetTimeBlock}
          placeName={place.name}
          translate={translate}
          value={currentTimeBlock}
        />
      )}
      <div className="trip-place-order-controls">
        <button
          aria-label={translate("tripDrafts.itinerary.moveUpPlace").replace("{name}", place.name)}
          className="secondary-btn"
          disabled={!canMoveUp}
          onClick={planningActions.onMoveUp}
          type="button"
        >
          <ArrowUp size={14} aria-hidden="true" />
          {translate("tripDrafts.itinerary.moveUp")}
        </button>
        <button
          aria-label={translate("tripDrafts.itinerary.moveDownPlace").replace("{name}", place.name)}
          className="secondary-btn"
          disabled={!canMoveDown}
          onClick={planningActions.onMoveDown}
          type="button"
        >
          <ArrowDown size={14} aria-hidden="true" />
          {translate("tripDrafts.itinerary.moveDown")}
        </button>
      </div>
      <SavedPlaceSecondaryActions actions={actions.secondary} compact translate={translate} />
      <div className="trip-place-note">
        {hasNote && !isEditingNote && (
          <>
            <h4 className="trip-place-note__heading">{translate("tripDrafts.notes.heading")}</h4>
            <p className="trip-place-note__text">{currentNote}</p>
          </>
        )}
        {planningActions.onUpdateNote && !isEditingNote && (
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
        {planningActions.onUpdateNote && isEditingNote && (
          <div id={noteEditorId}>
            <TripPlaceNoteEditor
              initialNote={currentNote}
              language={language}
              onCancel={() => setIsEditingNote(false)}
              onRemove={hasNote ? () => saveNote(null) : undefined}
              onSave={(note) => saveNote(note)}
              translate={translate}
            />
          </div>
        )}
      </div>
      <PlacePlanningActions
        actions={placePlanningActions}
        callbacks={placePlanningActionCallbacks}
        language={language}
        translate={translate}
      />
      <TripPlacePhotos
        callbacks={photoCallbacks}
        isAdding={isAddingPhotos}
        language={language}
        photoIds={photoIds}
        placeName={place.name}
        translate={translate}
      />
    </article>
  );
}
