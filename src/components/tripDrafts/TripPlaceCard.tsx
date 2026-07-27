import { ArrowDown, ArrowUp, MapPin, MinusCircle } from "lucide-react";
import { SavedPlaceSecondaryActions } from "../SavedPlaceSecondaryActions";
import type { TripTimeBlock } from "../../lib/tripDrafts";
import type { SavedPlace } from "../../lib/savedPlaces";
import type { SavedPlaceAction } from "../../lib/savedPlaceActions";
import { iconFor, typeLabel } from "./displayUtils";
import { TripMoveToControl } from "./TripMoveToControl";
import { TripTimeBlockSelector } from "./TripTimeBlockSelector";
import type { TripDayDestinationOption, TripPlacePlanningActions, TripPlannerTranslate } from "./types";

export function TripPlaceCard({
  actions,
  canMoveDown,
  canMoveUp,
  currentDayId,
  currentTimeBlock,
  moveOptions,
  onExecuteAction,
  place,
  planningActions,
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
  moveOptions: TripDayDestinationOption[];
  onExecuteAction: (action: SavedPlaceAction) => void;
  place: SavedPlace;
  planningActions: TripPlacePlanningActions & {
    onRemove: () => void;
  };
  translate: TripPlannerTranslate;
}) {
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
        <button className="secondary-btn" onClick={planningActions.onRemove} type="button">
          <MinusCircle size={15} aria-hidden="true" />
          {translate("tripDrafts.removeFromDraft")}
        </button>
      </div>
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
    </article>
  );
}
