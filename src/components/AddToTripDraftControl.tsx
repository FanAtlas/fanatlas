import { Check, Plus, Route, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useState } from "react";
import { TRIP_DRAFT_LIMITS, type TripDraft, type TripDraftMutationResult } from "../lib/tripDrafts";
import type { SavedPlace } from "../lib/savedPlaces";

type AddToTripDraftControlProps = {
  place: SavedPlace;
  drafts: TripDraft[];
  membership: Map<string, Set<string>>;
  translate: (key: string) => string;
  onAdd: (draftId: string, place: SavedPlace) => TripDraftMutationResult<unknown>;
  onCreateAndAdd: (name: string, place: SavedPlace) => TripDraftMutationResult<unknown>;
};

export function AddToTripDraftControl({
  place,
  drafts,
  membership,
  translate,
  onAdd,
  onCreateAndAdd
}: AddToTripDraftControlProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const trimmedName = name.trim().slice(0, TRIP_DRAFT_LIMITS.maxNameLength);

  function addToDraft(draft: TripDraft) {
    const result = onAdd(draft.id, place);
    if (!result.ok) {
      setMessage(translateTripDraftAddError(result.error, translate));
      return;
    }
    setMessage(translate("tripDrafts.addPlace.success").replace("{name}", draft.name));
  }

  function createAndAdd() {
    if (!trimmedName) {
      setMessage(translate("tripDrafts.addPlace.errors.invalidName"));
      return;
    }

    const result = onCreateAndAdd(trimmedName, place);
    if (!result.ok) {
      setMessage(translateTripDraftAddError(result.error, translate));
      return;
    }

    setName("");
    setMessage(translate("tripDrafts.addPlace.createdSuccess").replace("{name}", trimmedName));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      createAndAdd();
    }
    if (event.key === "Escape") {
      setOpen(false);
      setMessage("");
    }
  }

  return (
    <div className="add-to-trip-draft-control">
      <button className="saved-place-collection-trigger" onClick={() => setOpen((current) => !current)} type="button" aria-expanded={open}>
        <Route size={14} aria-hidden="true" />
        <span>{translate("tripDrafts.addPlace.trigger")}</span>
      </button>

      {open && (
        <div className="collection-picker-panel">
          <div className="collection-picker-heading">
            <strong>{translate("tripDrafts.addPlace.title")}</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label={translate("savedPlaces.collections.cancel")}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <p className="subtle">{translate("tripDrafts.addPlace.unscheduledNotice")}</p>

          <div className="collection-picker-list">
            {drafts.length === 0 && (
              <p className="subtle">{translate("tripDrafts.addPlace.noDrafts")}</p>
            )}
            {drafts.map((draft) => {
              const added = membership.get(draft.id)?.has(place.id) || false;
              const full = draft.placeReferences.length >= TRIP_DRAFT_LIMITS.maxPlacesPerDraft;
              const disabled = added || full;
              return (
                <button
                  className={added ? "collection-picker-option added" : "collection-picker-option"}
                  disabled={disabled}
                  key={draft.id}
                  onClick={() => !disabled && addToDraft(draft)}
                  type="button"
                  aria-pressed={added}
                >
                  <span>{draft.name}</span>
                  <small>
                    {added
                      ? translate("tripDrafts.addPlace.added")
                      : full
                        ? translate("tripDrafts.addPlace.placeLimitReached")
                        : translate("tripDrafts.addPlace.add")}
                  </small>
                  {added && <Check size={14} aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <label className="collection-create-field">
            <span>{translate("tripDrafts.addPlace.newDraftName")}</span>
            <input
              maxLength={TRIP_DRAFT_LIMITS.maxNameLength}
              onChange={(event) => {
                setName(event.target.value);
                setMessage("");
              }}
              onKeyDown={handleKeyDown}
              value={name}
            />
          </label>
          <button className="collection-create-button" onClick={createAndAdd} type="button">
            <Plus size={14} aria-hidden="true" />
            <span>{translate("tripDrafts.addPlace.createAndAdd")}</span>
          </button>
          {message && <div className="collection-picker-message">{message}</div>}
        </div>
      )}
    </div>
  );
}

function translateTripDraftAddError(error: string | undefined, translate: (key: string) => string) {
  if (error === "invalid_place_reference") return translate("tripDrafts.addPlace.errors.invalidReference");
  if (error === "place_already_in_draft") return translate("tripDrafts.addPlace.errors.alreadyInDraft");
  if (error === "draft_not_found") return translate("tripDrafts.addPlace.errors.draftNotFound");
  if (error === "invalid_name") return translate("tripDrafts.addPlace.errors.invalidName");
  if (error === "draft_limit_reached") return translate("tripDrafts.addPlace.errors.draftLimitReached");
  if (error === "place_limit_reached") return translate("tripDrafts.addPlace.errors.placeLimitReached");
  if (error === "storage_unavailable") return translate("tripDrafts.addPlace.errors.storageUnavailable");
  return translate("tripDrafts.addPlace.errors.writeFailed");
}
