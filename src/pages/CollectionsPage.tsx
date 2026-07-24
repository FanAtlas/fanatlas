import { useMemo, useState } from "react";
import { Edit3, Folder, FolderMinus, MapPin, Plus, Route, Trash2, X } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { SavedPlaceSecondaryActions } from "../components/SavedPlaceSecondaryActions";
import { useLanguage } from "../LanguageContext";
import { Tab } from "../main";
import { getFanZoneDestination, getStadiumDestination, type MapDestination } from "../mapDestinations";
import { TravelIntelligenceProvider, useTravelIntelligence } from "../contexts/TravelIntelligenceContext";
import { usePlaceCollections } from "../hooks/usePlaceCollections";
import { useTripDrafts } from "../hooks/useTripDrafts";
import type { HydratedPlaceCollection, PlaceCollection } from "../lib/placeCollections";
import type { SavedPlace } from "../lib/savedPlaces";
import { getSavedPlaceActions, type SavedPlaceAction } from "../lib/savedPlaceActions";

type Props = {
  userId: string;
  onBack: () => void;
  setExploreCategory: (category: string) => void;
  setMapDestination: (destination: MapDestination | null) => void;
  setSelectedRestaurant: (restaurant: unknown) => void;
  setSelectedStadium: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
};

type CollectionsView =
  | { mode: "list" }
  | { mode: "detail"; collectionId: string };

export function CollectionsPage({
  userId,
  ...props
}: Props) {
  return (
    <TravelIntelligenceProvider userId={userId}>
      <CollectionsPageContent {...props} />
    </TravelIntelligenceProvider>
  );
}

function CollectionsPageContent({
  onBack,
  setExploreCategory,
  setMapDestination,
  setSelectedRestaurant,
  setSelectedStadium,
  setTab
}: Omit<Props, "userId">) {
  const { language, t } = useLanguage();
  const { savedPlaces, isLoading, limitations } = useTravelIntelligence();
  const {
    collections,
    hydratedCollections,
    error,
    createCollection,
    renameCollection,
    deleteCollection,
    removePlaceFromCollection
  } = usePlaceCollections(savedPlaces);
  const {
    createDraftFromCollection,
    error: tripDraftError
  } = useTripDrafts(savedPlaces);
  const [view, setView] = useState<CollectionsView>({ mode: "list" });
  const [newCollectionName, setNewCollectionName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [localError, setLocalError] = useState("");
  const [localMessage, setLocalMessage] = useState("");
  const labels = t as Record<string, string>;
  const translate = (key: string) => labels[key] || key;
  const selected = view.mode === "detail"
    ? hydratedCollections.find((collection) => collection.collection.id === view.collectionId)
    : undefined;

  function executeAction(action: SavedPlaceAction) {
    switch (action.kind) {
      case "open_restaurant":
        setSelectedRestaurant(action.payload);
        setTab("restaurant");
        return;
      case "open_hotel":
        if (!action.payload.destination) return;
        setMapDestination(action.payload.destination);
        setTab("map");
        return;
      case "open_map":
        setMapDestination(action.payload);
        setTab("map");
        return;
      case "open_stadium":
        setSelectedStadium(getStadiumDestination(action.payload.name, action.payload.city || "") || action.payload.destination || null);
        setTab("stadium");
        return;
      case "open_fan_zone":
        setMapDestination(getFanZoneDestination(action.payload.name) || action.payload.destination || null);
        setExploreCategory("fanzones");
        setTab("fanzones");
        return;
      case "open_event":
        if (!action.payload.destination) return;
        setMapDestination(action.payload.destination);
        setTab("map");
        return;
      case "call":
      case "open_website":
      case "search_web":
        window.open(action.href, "_blank", "noopener,noreferrer");
        return;
      default: {
        const exhaustive: never = action;
        return exhaustive;
      }
    }
  }

  function submitNewCollection() {
    const collection = createCollection({ name: newCollectionName });
    if (!collection) {
      setLocalError(translate("collections.errors.invalidName"));
      return;
    }
    setNewCollectionName("");
    setLocalError("");
  }

  function startRename(collection: PlaceCollection) {
    setEditingId(collection.id);
    setEditingName(collection.name);
    setLocalError("");
  }

  function submitRename(collectionId: string) {
    if (!renameCollection(collectionId, { name: editingName })) {
      setLocalError(translate("collections.errors.invalidName"));
      return;
    }
    setEditingId(null);
    setEditingName("");
    setLocalError("");
  }

  function confirmDelete(collectionId: string) {
    if (!deleteCollection(collectionId)) {
      setLocalError(translate("collections.errors.notFound"));
      return;
    }
    setDeleteId(null);
    if (view.mode === "detail" && view.collectionId === collectionId) setView({ mode: "list" });
  }

  function submitCreateTripDraft(collection: PlaceCollection) {
    const name = `${collection.name} ${translate("tripDrafts.collectionDraftSuffix")}`.trim();
    const draft = createDraftFromCollection(collection, { name });
    if (!draft) {
      setLocalError(translate("tripDrafts.errors.writeFailed"));
      return;
    }
    setLocalError("");
    setLocalMessage(translate("tripDrafts.createdSuccess"));
  }

  return (
    <div className="collections-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="collections-topbar">
        <BackButton onBack={view.mode === "detail" ? () => setView({ mode: "list" }) : onBack} />
        <div>
          <span>{translate("collections.title")}</span>
          <strong>{view.mode === "detail" && selected ? selected.collection.name : translate("collections.subtitle")}</strong>
        </div>
        <button className="secondary-btn" onClick={() => setTab("tripDrafts")} type="button">
          <Route size={15} aria-hidden="true" />
          {translate("tripDrafts.title")}
        </button>
      </div>

      {(localError || error || tripDraftError) && (
        <div className="route-status error">
          {localError || translateCollectionError(error, translate) || translateTripDraftError(tripDraftError, translate)}
        </div>
      )}

      {localMessage && <div className="route-status">{localMessage}</div>}

      {limitations.favoritesUnavailable && (
        <div className="route-status">
          {translate("collections.limitedData")}
        </div>
      )}

      {view.mode === "detail" && selected ? (
        <CollectionDetailView
          collection={selected}
          deleteId={deleteId}
          editingId={editingId}
          editingName={editingName}
          isLoadingPlaces={isLoading}
          onCancelDelete={() => setDeleteId(null)}
          onCancelEdit={() => {
            setEditingId(null);
            setEditingName("");
          }}
          onConfirmDelete={confirmDelete}
          onDeleteRequest={setDeleteId}
          onEditName={setEditingName}
          onExecuteAction={executeAction}
          onCreateTripDraft={submitCreateTripDraft}
          onRemovePlace={(placeId) => removePlaceFromCollection(selected.collection.id, placeId)}
          onRename={submitRename}
          onStartRename={startRename}
          translate={translate}
        />
      ) : (
        <CollectionsListView
          collections={hydratedCollections}
          deleteId={deleteId}
          editingId={editingId}
          editingName={editingName}
          isLoadingPlaces={isLoading}
          newCollectionName={newCollectionName}
          onCancelDelete={() => setDeleteId(null)}
          onCancelEdit={() => {
            setEditingId(null);
            setEditingName("");
          }}
          onConfirmDelete={confirmDelete}
          onCreate={submitNewCollection}
          onDeleteRequest={setDeleteId}
          onEditName={setEditingName}
          onCreateTripDraft={submitCreateTripDraft}
          onNewNameChange={setNewCollectionName}
          onOpen={(collectionId) => setView({ mode: "detail", collectionId })}
          onRename={submitRename}
          onStartRename={startRename}
          onViewSavedPlaces={() => setTab("favorites")}
          translate={translate}
        />
      )}
    </div>
  );
}

function CollectionsListView({
  collections,
  deleteId,
  editingId,
  editingName,
  isLoadingPlaces,
  newCollectionName,
  onCancelDelete,
  onCancelEdit,
  onConfirmDelete,
  onCreate,
  onCreateTripDraft,
  onDeleteRequest,
  onEditName,
  onNewNameChange,
  onOpen,
  onRename,
  onStartRename,
  onViewSavedPlaces,
  translate
}: {
  collections: HydratedPlaceCollection[];
  deleteId: string | null;
  editingId: string | null;
  editingName: string;
  isLoadingPlaces: boolean;
  newCollectionName: string;
  onCancelDelete: () => void;
  onCancelEdit: () => void;
  onConfirmDelete: (collectionId: string) => void;
  onCreate: () => void;
  onCreateTripDraft: (collection: PlaceCollection) => void;
  onDeleteRequest: (collectionId: string) => void;
  onEditName: (name: string) => void;
  onNewNameChange: (name: string) => void;
  onOpen: (collectionId: string) => void;
  onRename: (collectionId: string) => void;
  onStartRename: (collection: PlaceCollection) => void;
  onViewSavedPlaces: () => void;
  translate: (key: string) => string;
}) {
  return (
    <>
      <section className="collections-create-card">
        <div>
          <strong>{translate("collections.new")}</strong>
          <p>{translate("collections.deviceLocal")}</p>
        </div>
        <label>
          <span>{translate("collections.name")}</span>
          <input
            maxLength={80}
            onChange={(event) => onNewNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onCreate();
            }}
            value={newCollectionName}
          />
        </label>
        <button className="primary-btn" onClick={onCreate} type="button">
          <Plus size={15} aria-hidden="true" />
          {translate("collections.create")}
        </button>
      </section>

      {collections.length === 0 && (
        <section className="card-dark collections-empty-state">
          <Folder size={28} aria-hidden="true" />
          <strong>{translate("collections.empty.title")}</strong>
          <p className="subtle">{translate("collections.empty.description")}</p>
          <button className="secondary-btn" onClick={onViewSavedPlaces} type="button">
            {translate("collections.viewSavedPlaces")}
          </button>
        </section>
      )}

      <div className="collections-grid">
        {collections.map((item) => (
          <div key={item.collection.id}>
            <CollectionCard
              collection={item}
              deleteId={deleteId}
              editingId={editingId}
              editingName={editingName}
              isLoadingPlaces={isLoadingPlaces}
              onCancelDelete={onCancelDelete}
              onCancelEdit={onCancelEdit}
              onConfirmDelete={onConfirmDelete}
              onCreateTripDraft={onCreateTripDraft}
              onDeleteRequest={onDeleteRequest}
              onEditName={onEditName}
              onOpen={onOpen}
              onRename={onRename}
              onStartRename={onStartRename}
              translate={translate}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function CollectionCard(props: {
  collection: HydratedPlaceCollection;
  deleteId: string | null;
  editingId: string | null;
  editingName: string;
  isLoadingPlaces: boolean;
  onCancelDelete: () => void;
  onCancelEdit: () => void;
  onConfirmDelete: (collectionId: string) => void;
  onCreateTripDraft: (collection: PlaceCollection) => void;
  onDeleteRequest: (collectionId: string) => void;
  onEditName: (name: string) => void;
  onOpen: (collectionId: string) => void;
  onRename: (collectionId: string) => void;
  onStartRename: (collection: PlaceCollection) => void;
  translate: (key: string) => string;
}) {
  const { collection, translate } = props;
  const item = collection.collection;
  const unavailable = props.isLoadingPlaces ? 0 : collection.counts.unavailable;

  return (
    <article className="collection-card">
      <div className="collection-card-main">
        <Folder size={22} aria-hidden="true" />
        <div>
          {props.editingId === item.id ? (
            <InlineNameEditor
              name={props.editingName}
              onCancel={props.onCancelEdit}
              onChange={props.onEditName}
              onSave={() => props.onRename(item.id)}
              translate={translate}
            />
          ) : (
            <>
              <strong>{item.name}</strong>
              {item.description && <p>{item.description}</p>}
            </>
          )}
        </div>
      </div>

      <div className="collection-count-row">
        <span>{collection.counts.total} {translate("collections.places")}</span>
        <span>{props.isLoadingPlaces ? translate("collections.loadingPlaces") : `${collection.counts.available} ${translate("collections.available")}`}</span>
        {unavailable > 0 && <span>{unavailable} {translate("collections.unavailable")}</span>}
      </div>

      {props.deleteId === item.id && (
        <DeleteCollectionConfirm collection={item} onCancel={props.onCancelDelete} onConfirm={() => props.onConfirmDelete(item.id)} translate={translate} />
      )}

      <div className="collection-card-actions">
        <button className="secondary-btn" onClick={() => props.onOpen(item.id)} type="button">{translate("collections.open")}</button>
        <button className="secondary-btn" onClick={() => props.onCreateTripDraft(item)} type="button">
          <Route size={14} aria-hidden="true" />
          {translate("tripDrafts.createFromCollection")}
        </button>
        <button className="secondary-btn" onClick={() => props.onStartRename(item)} type="button">
          <Edit3 size={14} aria-hidden="true" />
          {translate("collections.rename")}
        </button>
        <button className="secondary-btn" onClick={() => props.onDeleteRequest(item.id)} type="button">
          <Trash2 size={14} aria-hidden="true" />
          {translate("collections.delete")}
        </button>
      </div>
    </article>
  );
}

function CollectionDetailView({
  collection,
  deleteId,
  editingId,
  editingName,
  isLoadingPlaces,
  onCancelDelete,
  onCancelEdit,
  onConfirmDelete,
  onCreateTripDraft,
  onDeleteRequest,
  onEditName,
  onExecuteAction,
  onRemovePlace,
  onRename,
  onStartRename,
  translate
}: {
  collection: HydratedPlaceCollection;
  deleteId: string | null;
  editingId: string | null;
  editingName: string;
  isLoadingPlaces: boolean;
  onCancelDelete: () => void;
  onCancelEdit: () => void;
  onConfirmDelete: (collectionId: string) => void;
  onCreateTripDraft: (collection: PlaceCollection) => void;
  onDeleteRequest: (collectionId: string) => void;
  onEditName: (name: string) => void;
  onExecuteAction: (action: SavedPlaceAction) => void;
  onRemovePlace: (logicalPlaceId: string) => void;
  onRename: (collectionId: string) => void;
  onStartRename: (collection: PlaceCollection) => void;
  translate: (key: string) => string;
}) {
  const actionRows = useMemo(
    () => collection.availablePlaces.map((place) => ({ place, actions: getSavedPlaceActions(place) })),
    [collection.availablePlaces]
  );
  const unavailable = isLoadingPlaces ? 0 : collection.counts.unavailable;

  return (
    <>
      <section className="collection-detail-hero">
        <div>
          {editingId === collection.collection.id ? (
            <InlineNameEditor
              name={editingName}
              onCancel={onCancelEdit}
              onChange={onEditName}
              onSave={() => onRename(collection.collection.id)}
              translate={translate}
            />
          ) : (
            <>
              <h1>{collection.collection.name}</h1>
              {collection.collection.description && <p>{collection.collection.description}</p>}
            </>
          )}
          <div className="collection-count-row">
            <span>{collection.counts.total} {translate("collections.places")}</span>
            <span>{isLoadingPlaces ? translate("collections.loadingPlaces") : `${collection.counts.available} ${translate("collections.available")}`}</span>
            {unavailable > 0 && <span>{unavailable} {translate("collections.unavailable")}</span>}
          </div>
        </div>
        <div className="collection-detail-actions">
          <button className="secondary-btn" onClick={() => onStartRename(collection.collection)} type="button">
            <Edit3 size={14} aria-hidden="true" />
            {translate("collections.rename")}
          </button>
          <button className="secondary-btn" onClick={() => onCreateTripDraft(collection.collection)} type="button">
            <Route size={14} aria-hidden="true" />
            {translate("tripDrafts.createFromCollection")}
          </button>
          <button className="secondary-btn" onClick={() => onDeleteRequest(collection.collection.id)} type="button">
            <Trash2 size={14} aria-hidden="true" />
            {translate("collections.delete")}
          </button>
        </div>
      </section>

      {deleteId === collection.collection.id && (
        <DeleteCollectionConfirm collection={collection.collection} onCancel={onCancelDelete} onConfirm={() => onConfirmDelete(collection.collection.id)} translate={translate} />
      )}

      {unavailable > 0 && (
        <div className="route-status">
          {translate("collections.unavailableNotice").replace("{count}", String(unavailable))}
        </div>
      )}

      {!isLoadingPlaces && actionRows.length === 0 && unavailable === 0 && (
        <div className="card-dark">
          <strong>{translate("collections.emptyCollection")}</strong>
          <p className="subtle">{translate("collections.emptyCollectionDescription")}</p>
        </div>
      )}

      <div className="collection-place-list">
        {actionRows.map(({ place, actions }) => (
          <div key={place.id}>
            <CollectionPlaceCard
              actions={actions}
              onExecuteAction={onExecuteAction}
              onRemove={() => onRemovePlace(place.id)}
              place={place}
              translate={translate}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function CollectionPlaceCard({
  actions,
  onExecuteAction,
  onRemove,
  place,
  translate
}: {
  actions: ReturnType<typeof getSavedPlaceActions>;
  onExecuteAction: (action: SavedPlaceAction) => void;
  onRemove: () => void;
  place: SavedPlace;
  translate: (key: string) => string;
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
            {translate("collections.view")}
          </button>
        )}
        <button className="secondary-btn" onClick={onRemove} type="button">
          <FolderMinus size={15} aria-hidden="true" />
          {translate("collections.removeFromCollection")}
        </button>
      </div>
      <SavedPlaceSecondaryActions actions={actions.secondary} compact translate={translate} />
    </article>
  );
}

function InlineNameEditor({
  name,
  onCancel,
  onChange,
  onSave,
  translate
}: {
  name: string;
  onCancel: () => void;
  onChange: (name: string) => void;
  onSave: () => void;
  translate: (key: string) => string;
}) {
  return (
    <div className="collection-inline-editor">
      <label>
        <span>{translate("collections.name")}</span>
        <input
          autoFocus
          maxLength={80}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSave();
            if (event.key === "Escape") onCancel();
          }}
          value={name}
        />
      </label>
      <div>
        <button className="secondary-btn" onClick={onSave} type="button">{translate("collections.save")}</button>
        <button className="secondary-btn" onClick={onCancel} type="button">
          <X size={14} aria-hidden="true" />
          {translate("collections.cancel")}
        </button>
      </div>
    </div>
  );
}

function DeleteCollectionConfirm({
  collection,
  onCancel,
  onConfirm,
  translate
}: {
  collection: PlaceCollection;
  onCancel: () => void;
  onConfirm: () => void;
  translate: (key: string) => string;
}) {
  return (
    <div className="collection-delete-confirm" role="group" aria-label={translate("collections.deleteConfirm.title")}>
      <strong>{translate("collections.deleteConfirm.title")}</strong>
      <p>{translate("collections.deleteConfirm.description").replace("{name}", collection.name)}</p>
      <div>
        <button className="secondary-btn" onClick={onConfirm} type="button">{translate("collections.deleteConfirm.confirm")}</button>
        <button className="secondary-btn" onClick={onCancel} type="button">{translate("collections.deleteConfirm.cancel")}</button>
      </div>
    </div>
  );
}

function translateCollectionError(error: string | null, translate: (key: string) => string) {
  if (!error) return "";
  if (error === "invalid_name") return translate("collections.errors.invalidName");
  if (error === "collection_not_found") return translate("collections.errors.notFound");
  if (error === "collection_limit_reached") return translate("collections.errors.limitReached");
  if (error === "place_limit_reached") return translate("collections.errors.limitReached");
  if (error === "storage_unavailable") return translate("collections.errors.storageUnavailable");
  return translate("collections.errors.writeFailed");
}

function translateTripDraftError(error: string | null, translate: (key: string) => string) {
  if (!error) return "";
  if (error === "invalid_name") return translate("tripDrafts.errors.invalidName");
  if (error === "draft_not_found") return translate("tripDrafts.errors.notFound");
  if (error === "draft_limit_reached") return translate("tripDrafts.errors.limitReached");
  if (error === "place_limit_reached") return translate("tripDrafts.errors.limitReached");
  if (error === "storage_unavailable") return translate("tripDrafts.errors.storageUnavailable");
  return translate("tripDrafts.errors.writeFailed");
}

function typeLabel(type: string | undefined) {
  if (type === "fan-zone" || type === "fan_zone") return "Fan Zone";
  if (!type) return "Place";
  return type.replace("_", " ").charAt(0).toUpperCase() + type.replace("_", " ").slice(1);
}

function iconFor(type: string | undefined) {
  if (type === "stadium") return "🏟";
  if (type === "restaurant") return "🍽";
  if (type === "hotel") return "🏨";
  return "🎉";
}
