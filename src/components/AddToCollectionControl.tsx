import { Check, FolderPlus, Plus, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useState } from "react";
import { PLACE_COLLECTION_LIMITS, type PlaceCollection } from "../lib/placeCollections";
import type { SavedPlace } from "../lib/savedPlaces";

type AddToCollectionControlProps = {
  place: SavedPlace;
  collections: PlaceCollection[];
  translate: (key: string) => string;
  onCreateCollection: (name: string) => PlaceCollection | null;
  onAddToCollection: (collectionId: string, place: SavedPlace) => void;
};

export function AddToCollectionControl({
  place,
  collections,
  translate,
  onCreateCollection,
  onAddToCollection
}: AddToCollectionControlProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const trimmedName = name.trim().slice(0, PLACE_COLLECTION_LIMITS.maxNameLength);

  function addToCollection(collection: PlaceCollection) {
    onAddToCollection(collection.id, place);
    setMessage(translate("savedPlaces.collections.saved"));
  }

  function createAndAdd() {
    if (!trimmedName) {
      setMessage(translate("savedPlaces.collections.empty"));
      return;
    }

    const collection = onCreateCollection(trimmedName);
    if (!collection) {
      setMessage(translate("savedPlaces.collections.empty"));
      return;
    }

    onAddToCollection(collection.id, place);
    setName("");
    setMessage(translate("savedPlaces.collections.saved"));
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
    <div className="add-to-collection-control">
      <button className="saved-place-collection-trigger" onClick={() => setOpen((current) => !current)} type="button" aria-expanded={open}>
        <FolderPlus size={14} aria-hidden="true" />
        <span>{translate("savedPlaces.collections.add")}</span>
      </button>

      {open && (
        <div className="collection-picker-panel">
          <div className="collection-picker-heading">
            <strong>{translate("savedPlaces.collections.addToCollection")}</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label={translate("savedPlaces.collections.cancel")}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="collection-picker-list">
            {collections.length === 0 && (
              <p className="subtle">{translate("savedPlaces.collections.empty")}</p>
            )}
            {collections.map((collection) => {
              const added = collection.placeReferences.some((reference) => reference.logicalPlaceId === place.id);
              return (
                <button
                  className={added ? "collection-picker-option added" : "collection-picker-option"}
                  key={collection.id}
                  onClick={() => !added && addToCollection(collection)}
                  type="button"
                  aria-pressed={added}
                >
                  <span>{collection.name}</span>
                  <small>{added ? translate("savedPlaces.collections.added") : translate("savedPlaces.collections.add")}</small>
                  {added && <Check size={14} aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <label className="collection-create-field">
            <span>{translate("savedPlaces.collections.collectionName")}</span>
            <input
              maxLength={PLACE_COLLECTION_LIMITS.maxNameLength}
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
            <span>{translate("savedPlaces.collections.create")}</span>
          </button>
          {message && <div className="collection-picker-message">{message}</div>}
        </div>
      )}
    </div>
  );
}
