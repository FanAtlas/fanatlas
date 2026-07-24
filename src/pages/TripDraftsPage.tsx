import { useEffect, useMemo, useState } from "react";
import { Copy, Edit3, MapPin, MinusCircle, Plus, Route, Trash2, X } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { SavedPlaceSecondaryActions } from "../components/SavedPlaceSecondaryActions";
import { TravelIntelligenceProvider, useTravelIntelligence } from "../contexts/TravelIntelligenceContext";
import { useTripDrafts } from "../hooks/useTripDrafts";
import { useLanguage } from "../LanguageContext";
import type { Tab } from "../main";
import { getFanZoneDestination, getStadiumDestination, type MapDestination } from "../mapDestinations";
import type { HydratedTripDraft, HydratedTripItinerarySection, TripDraft, TripDraftMutationError, TripItineraryDay } from "../lib/tripDrafts";
import { UNSCHEDULED_TRIP_DAY_ID } from "../lib/tripDrafts";
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

type TripDraftsView =
  | { mode: "list" }
  | { mode: "detail"; draftId: string };

export function TripDraftsPage({
  userId,
  ...props
}: Props) {
  return (
    <TravelIntelligenceProvider userId={userId}>
      <TripDraftsPageContent {...props} />
    </TravelIntelligenceProvider>
  );
}

function TripDraftsPageContent({
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
    hydratedDrafts,
    error,
    createDraft,
    renameDraft,
    duplicateDraft,
    deleteDraft,
    removePlaceFromDraft,
    createDay,
    renameDay,
    deleteDay,
    movePlace
  } = useTripDrafts(savedPlaces);
  const [view, setView] = useState<TripDraftsView>({ mode: "list" });
  const [newDraftName, setNewDraftName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newDayTitle, setNewDayTitle] = useState("");
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayTitle, setEditingDayTitle] = useState("");
  const [deleteDayId, setDeleteDayId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [localError, setLocalError] = useState("");
  const [localMessage, setLocalMessage] = useState("");
  const labels = t as Record<string, string>;
  const translate = (key: string) => labels[key] || key;
  const selected = view.mode === "detail"
    ? hydratedDrafts.find((draft) => draft.draft.id === view.draftId)
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

  function submitNewDraft() {
    const draft = createDraft({ name: newDraftName });
    if (!draft) {
      setLocalError(translate("tripDrafts.errors.invalidName"));
      return;
    }
    setNewDraftName("");
    setLocalError("");
    setLocalMessage(translate("tripDrafts.createdSuccess"));
    setView({ mode: "detail", draftId: draft.id });
  }

  function startRename(draft: TripDraft) {
    setEditingId(draft.id);
    setEditingName(draft.name);
    setLocalError("");
    setLocalMessage("");
  }

  function submitRename(draftId: string) {
    if (!renameDraft(draftId, { name: editingName })) {
      setLocalError(translate("tripDrafts.errors.invalidName"));
      return;
    }
    setEditingId(null);
    setEditingName("");
    setLocalError("");
  }

  function submitDuplicate(draft: TripDraft) {
    const copyName = `${draft.name} ${translate("tripDrafts.copySuffix")}`.trim();
    const copy = duplicateDraft(draft.id, { name: copyName });
    if (!copy) {
      setLocalError(translate("tripDrafts.errors.writeFailed"));
      return;
    }
    setLocalError("");
    setLocalMessage(translate("tripDrafts.duplicatedSuccess"));
  }

  function confirmDelete(draftId: string) {
    if (!deleteDraft(draftId)) {
      setLocalError(translate("tripDrafts.errors.notFound"));
      return;
    }
    setDeleteId(null);
    if (view.mode === "detail" && view.draftId === draftId) setView({ mode: "list" });
  }

  function submitCreateDay(draftId: string) {
    if (!createDay(draftId, { title: newDayTitle })) {
      setLocalError("");
      return;
    }
    setNewDayTitle("");
    setLocalError("");
  }

  function startRenameDay(day: TripItineraryDay) {
    setEditingDayId(day.id);
    setEditingDayTitle(day.title);
    setLocalError("");
    setLocalMessage("");
  }

  function submitRenameDay(draftId: string, dayId: string) {
    if (!renameDay(draftId, dayId, { title: editingDayTitle })) {
      setLocalError("");
      return;
    }
    setEditingDayId(null);
    setEditingDayTitle("");
    setLocalError("");
  }

  function confirmDeleteDay(draftId: string, dayId: string) {
    if (!deleteDay(draftId, dayId)) {
      setLocalError("");
      return;
    }
    setDeleteDayId(null);
    setLocalError("");
  }

  function submitMovePlace(draftId: string, logicalPlaceId: string, dayId: string) {
    if (!movePlace(draftId, logicalPlaceId, { dayId })) {
      setLocalError("");
      return;
    }
    setLocalError("");
  }

  return (
    <div className="collections-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="collections-topbar">
        <BackButton onBack={view.mode === "detail" ? () => setView({ mode: "list" }) : onBack} />
        <div>
          <span>{translate("tripDrafts.title")}</span>
          <strong>{view.mode === "detail" && selected ? selected.draft.name : translate("tripDrafts.subtitle")}</strong>
        </div>
      </div>

      {(localError || error) && (
        <div className="route-status error">
          {localError || translateTripDraftError(error, translate)}
        </div>
      )}

      {localMessage && <div className="route-status">{localMessage}</div>}

      {limitations.favoritesUnavailable && (
        <div className="route-status">
          {translate("tripDrafts.limitedData")}
        </div>
      )}

      {view.mode === "detail" && selected ? (
        <TripDraftDetailView
          deleteId={deleteId}
          deleteDayId={deleteDayId}
          draft={selected}
          editingId={editingId}
          editingDayId={editingDayId}
          editingDayTitle={editingDayTitle}
          editingName={editingName}
          isLoadingPlaces={isLoading}
          newDayTitle={newDayTitle}
          onCancelDelete={() => setDeleteId(null)}
          onCancelDeleteDay={() => setDeleteDayId(null)}
          onCancelEdit={() => {
            setEditingId(null);
            setEditingName("");
          }}
          onCancelEditDay={() => {
            setEditingDayId(null);
            setEditingDayTitle("");
          }}
          onConfirmDeleteDay={confirmDeleteDay}
          onCreateDay={submitCreateDay}
          onConfirmDelete={confirmDelete}
          onDeleteRequest={setDeleteId}
          onDayDeleteRequest={setDeleteDayId}
          onDuplicate={submitDuplicate}
          onEditDayTitle={setEditingDayTitle}
          onEditName={setEditingName}
          onExecuteAction={executeAction}
          onMovePlace={submitMovePlace}
          onNewDayTitleChange={setNewDayTitle}
          onRemovePlace={(placeId) => removePlaceFromDraft(selected.draft.id, placeId)}
          onRenameDay={submitRenameDay}
          onRename={submitRename}
          onStartRenameDay={startRenameDay}
          onStartRename={startRename}
          translate={translate}
        />
      ) : (
        <TripDraftListView
          deleteId={deleteId}
          drafts={hydratedDrafts}
          editingId={editingId}
          editingName={editingName}
          isLoadingPlaces={isLoading}
          newDraftName={newDraftName}
          onCancelDelete={() => setDeleteId(null)}
          onCancelEdit={() => {
            setEditingId(null);
            setEditingName("");
          }}
          onConfirmDelete={confirmDelete}
          onCreate={submitNewDraft}
          onDeleteRequest={setDeleteId}
          onDuplicate={submitDuplicate}
          onEditName={setEditingName}
          onNewNameChange={setNewDraftName}
          onOpen={(draftId) => setView({ mode: "detail", draftId })}
          onRename={submitRename}
          onStartRename={startRename}
          onViewCollections={() => setTab("collections")}
          translate={translate}
        />
      )}
    </div>
  );
}

function TripDraftListView({
  deleteId,
  drafts,
  editingId,
  editingName,
  isLoadingPlaces,
  newDraftName,
  onCancelDelete,
  onCancelEdit,
  onConfirmDelete,
  onCreate,
  onDeleteRequest,
  onDuplicate,
  onEditName,
  onNewNameChange,
  onOpen,
  onRename,
  onStartRename,
  onViewCollections,
  translate
}: {
  deleteId: string | null;
  drafts: HydratedTripDraft[];
  editingId: string | null;
  editingName: string;
  isLoadingPlaces: boolean;
  newDraftName: string;
  onCancelDelete: () => void;
  onCancelEdit: () => void;
  onConfirmDelete: (draftId: string) => void;
  onCreate: () => void;
  onDeleteRequest: (draftId: string) => void;
  onDuplicate: (draft: TripDraft) => void;
  onEditName: (name: string) => void;
  onNewNameChange: (name: string) => void;
  onOpen: (draftId: string) => void;
  onRename: (draftId: string) => void;
  onStartRename: (draft: TripDraft) => void;
  onViewCollections: () => void;
  translate: (key: string) => string;
}) {
  return (
    <>
      <section className="collections-create-card">
        <div>
          <strong>{translate("tripDrafts.new")}</strong>
          <p>{translate("tripDrafts.deviceLocal")}</p>
        </div>
        <label>
          <span>{translate("tripDrafts.name")}</span>
          <input
            maxLength={100}
            onChange={(event) => onNewNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onCreate();
            }}
            value={newDraftName}
          />
        </label>
        <button className="primary-btn" onClick={onCreate} type="button">
          <Plus size={15} aria-hidden="true" />
          {translate("tripDrafts.create")}
        </button>
      </section>

      {drafts.length === 0 && (
        <section className="card-dark collections-empty-state">
          <Route size={28} aria-hidden="true" />
          <strong>{translate("tripDrafts.empty.title")}</strong>
          <p className="subtle">{translate("tripDrafts.empty.description")}</p>
          <button className="secondary-btn" onClick={onViewCollections} type="button">
            {translate("tripDrafts.viewCollections")}
          </button>
        </section>
      )}

      <div className="collections-grid">
        {drafts.map((draft) => (
          <div key={draft.draft.id}>
            <TripDraftCard
              deleteId={deleteId}
              draft={draft}
              editingId={editingId}
              editingName={editingName}
              isLoadingPlaces={isLoadingPlaces}
              onCancelDelete={onCancelDelete}
              onCancelEdit={onCancelEdit}
              onConfirmDelete={onConfirmDelete}
              onDeleteRequest={onDeleteRequest}
              onDuplicate={onDuplicate}
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

function TripDraftCard(props: {
  deleteId: string | null;
  draft: HydratedTripDraft;
  editingId: string | null;
  editingName: string;
  isLoadingPlaces: boolean;
  onCancelDelete: () => void;
  onCancelEdit: () => void;
  onConfirmDelete: (draftId: string) => void;
  onDeleteRequest: (draftId: string) => void;
  onDuplicate: (draft: TripDraft) => void;
  onEditName: (name: string) => void;
  onOpen: (draftId: string) => void;
  onRename: (draftId: string) => void;
  onStartRename: (draft: TripDraft) => void;
  translate: (key: string) => string;
}) {
  const { draft, translate } = props;
  const item = draft.draft;
  const unavailable = props.isLoadingPlaces ? 0 : draft.counts.unavailable;

  return (
    <article className="collection-card">
      <div className="collection-card-main">
        <Route size={22} aria-hidden="true" />
        <div>
          {props.editingId === item.id ? (
            <InlineTripDraftNameEditor
              name={props.editingName}
              onCancel={props.onCancelEdit}
              onChange={props.onEditName}
              onSave={() => props.onRename(item.id)}
              translate={translate}
            />
          ) : (
            <>
              <strong>{item.name}</strong>
              <p>{translate("tripDrafts.draftStatus")}</p>
              {item.source?.collectionNameSnapshot && (
                <p>{translate("tripDrafts.sourceCollection").replace("{name}", item.source.collectionNameSnapshot)}</p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="collection-count-row">
        <span>{draft.counts.total} {translate("tripDrafts.places")}</span>
        <span>{props.isLoadingPlaces ? translate("tripDrafts.loadingPlaces") : `${draft.counts.available} ${translate("tripDrafts.available")}`}</span>
        {unavailable > 0 && <span>{unavailable} {translate("tripDrafts.unavailable")}</span>}
      </div>

      {props.deleteId === item.id && (
        <DeleteTripDraftConfirm draft={item} onCancel={props.onCancelDelete} onConfirm={() => props.onConfirmDelete(item.id)} translate={translate} />
      )}

      <div className="collection-card-actions">
        <button className="secondary-btn" onClick={() => props.onOpen(item.id)} type="button">{translate("tripDrafts.open")}</button>
        <button className="secondary-btn" onClick={() => props.onStartRename(item)} type="button">
          <Edit3 size={14} aria-hidden="true" />
          {translate("tripDrafts.rename")}
        </button>
        <button className="secondary-btn" onClick={() => props.onDuplicate(item)} type="button">
          <Copy size={14} aria-hidden="true" />
          {translate("tripDrafts.duplicate")}
        </button>
        <button className="secondary-btn" onClick={() => props.onDeleteRequest(item.id)} type="button">
          <Trash2 size={14} aria-hidden="true" />
          {translate("tripDrafts.delete")}
        </button>
      </div>
    </article>
  );
}

function TripDraftDetailView({
  deleteId,
  deleteDayId,
  draft,
  editingId,
  editingDayId,
  editingDayTitle,
  editingName,
  isLoadingPlaces,
  newDayTitle,
  onCancelDelete,
  onCancelDeleteDay,
  onCancelEdit,
  onCancelEditDay,
  onConfirmDelete,
  onConfirmDeleteDay,
  onCreateDay,
  onDayDeleteRequest,
  onDeleteRequest,
  onDuplicate,
  onEditDayTitle,
  onEditName,
  onExecuteAction,
  onMovePlace,
  onNewDayTitleChange,
  onRemovePlace,
  onRename,
  onRenameDay,
  onStartRename,
  onStartRenameDay,
  translate
}: {
  deleteId: string | null;
  deleteDayId: string | null;
  draft: HydratedTripDraft;
  editingId: string | null;
  editingDayId: string | null;
  editingDayTitle: string;
  editingName: string;
  isLoadingPlaces: boolean;
  newDayTitle: string;
  onCancelDelete: () => void;
  onCancelDeleteDay: () => void;
  onCancelEdit: () => void;
  onCancelEditDay: () => void;
  onConfirmDelete: (draftId: string) => void;
  onConfirmDeleteDay: (draftId: string, dayId: string) => void;
  onCreateDay: (draftId: string) => void;
  onDayDeleteRequest: (dayId: string) => void;
  onDeleteRequest: (draftId: string) => void;
  onDuplicate: (draft: TripDraft) => void;
  onEditDayTitle: (title: string) => void;
  onEditName: (name: string) => void;
  onExecuteAction: (action: SavedPlaceAction) => void;
  onMovePlace: (draftId: string, logicalPlaceId: string, dayId: string) => void;
  onNewDayTitleChange: (title: string) => void;
  onRemovePlace: (logicalPlaceId: string) => void;
  onRename: (draftId: string) => void;
  onRenameDay: (draftId: string, dayId: string) => void;
  onStartRename: (draft: TripDraft) => void;
  onStartRenameDay: (day: TripItineraryDay) => void;
  translate: (key: string) => string;
}) {
  const unavailable = isLoadingPlaces ? 0 : draft.counts.unavailable;
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

      {deleteId === draft.draft.id && (
        <DeleteTripDraftConfirm draft={draft.draft} onCancel={onCancelDelete} onConfirm={() => onConfirmDelete(draft.draft.id)} translate={translate} />
      )}

      {unavailable > 0 && (
        <div className="route-status">
          {translate("tripDrafts.unavailableNotice").replace("{count}", String(unavailable))}
        </div>
      )}

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
              onMovePlace={onMovePlace}
              onRemovePlace={onRemovePlace}
              onRenameDay={onRenameDay}
              onStartRenameDay={onStartRenameDay}
              section={section}
              translate={translate}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function TripItinerarySection({
  deleteDayId,
  draftId,
  editingDayId,
  editingDayTitle,
  isLoadingPlaces,
  moveOptions,
  onCancelDeleteDay,
  onCancelEditDay,
  onConfirmDeleteDay,
  onDayDeleteRequest,
  onEditDayTitle,
  onExecuteAction,
  onMovePlace,
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
  moveOptions: Array<{ id: string; label: string }>;
  onCancelDeleteDay: () => void;
  onCancelEditDay: () => void;
  onConfirmDeleteDay: (draftId: string, dayId: string) => void;
  onDayDeleteRequest: (dayId: string) => void;
  onEditDayTitle: (title: string) => void;
  onExecuteAction: (action: SavedPlaceAction) => void;
  onMovePlace: (draftId: string, logicalPlaceId: string, dayId: string) => void;
  onRemovePlace: (logicalPlaceId: string) => void;
  onRenameDay: (draftId: string, dayId: string) => void;
  onStartRenameDay: (day: TripItineraryDay) => void;
  section: HydratedTripItinerarySection;
  translate: (key: string) => string;
}) {
  const actionRows = useMemo(
    () => section.places.flatMap((item) => item.place ? [{ reference: item.reference, place: item.place, actions: getSavedPlaceActions(item.place) }] : []),
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

      {unavailable > 0 && (
        <div className="route-status">
          {translate("tripDrafts.itinerary.unavailableInSection").replace("{count}", String(unavailable))}
        </div>
      )}

      {!isLoadingPlaces && actionRows.length === 0 && unavailable === 0 && (
        <div className="card-dark">
          <strong>{translate("tripDrafts.itinerary.noPlaces")}</strong>
        </div>
      )}

      <div className="collection-place-list">
        {actionRows.map(({ reference, place, actions }) => (
          <div key={place.id}>
            <TripDraftPlaceCard
              actions={actions}
              currentDayId={reference.dayId}
              moveOptions={moveOptions}
              onExecuteAction={onExecuteAction}
              onMove={(dayId) => onMovePlace(draftId, place.id, dayId)}
              onRemove={() => onRemovePlace(place.id)}
              place={place}
              translate={translate}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function TripDraftPlaceCard({
  actions,
  currentDayId,
  moveOptions,
  onExecuteAction,
  onMove,
  onRemove,
  place,
  translate
}: {
  actions: ReturnType<typeof getSavedPlaceActions>;
  currentDayId: string;
  moveOptions: Array<{ id: string; label: string }>;
  onExecuteAction: (action: SavedPlaceAction) => void;
  onMove: (dayId: string) => void;
  onRemove: () => void;
  place: SavedPlace;
  translate: (key: string) => string;
}) {
  const [selectedDayId, setSelectedDayId] = useState(currentDayId);

  useEffect(() => {
    setSelectedDayId(currentDayId);
  }, [currentDayId]);

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
        <button className="secondary-btn" onClick={onRemove} type="button">
          <MinusCircle size={15} aria-hidden="true" />
          {translate("tripDrafts.removeFromDraft")}
        </button>
      </div>
      <div className="trip-place-move-control">
        <label>
          <span>{translate("tripDrafts.itinerary.moveTo")}</span>
          <select
            onChange={(event) => setSelectedDayId(event.target.value)}
            value={selectedDayId}
          >
            {moveOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        <button
          className="secondary-btn"
          disabled={selectedDayId === currentDayId}
          onClick={() => onMove(selectedDayId)}
          type="button"
        >
          {translate("tripDrafts.itinerary.move")}
        </button>
      </div>
      <SavedPlaceSecondaryActions actions={actions.secondary} compact translate={translate} />
    </article>
  );
}

function InlineTripDayTitleEditor({
  title,
  onCancel,
  onChange,
  onSave,
  translate
}: {
  title: string;
  onCancel: () => void;
  onChange: (title: string) => void;
  onSave: () => void;
  translate: (key: string) => string;
}) {
  return (
    <div className="collection-inline-editor">
      <label>
        <span>{translate("tripDrafts.itinerary.dayTitle")}</span>
        <input
          autoFocus
          maxLength={80}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSave();
            if (event.key === "Escape") onCancel();
          }}
          value={title}
        />
      </label>
      <div>
        <button className="secondary-btn" onClick={onSave} type="button">{translate("tripDrafts.save")}</button>
        <button className="secondary-btn" onClick={onCancel} type="button">
          <X size={14} aria-hidden="true" />
          {translate("tripDrafts.cancel")}
        </button>
      </div>
    </div>
  );
}

function DeleteTripDayConfirm({
  day,
  onCancel,
  onConfirm,
  translate
}: {
  day: TripItineraryDay;
  onCancel: () => void;
  onConfirm: () => void;
  translate: (key: string) => string;
}) {
  return (
    <div className="collection-delete-confirm" role="group" aria-label={translate("tripDrafts.itinerary.deleteDayConfirm.title")}>
      <strong>{translate("tripDrafts.itinerary.deleteDayConfirm.title")}</strong>
      <p>{translate("tripDrafts.itinerary.deleteDayConfirm.description").replace("{title}", day.title)}</p>
      <div>
        <button className="secondary-btn" onClick={onConfirm} type="button">{translate("tripDrafts.itinerary.deleteDayConfirm.confirm")}</button>
        <button className="secondary-btn" onClick={onCancel} type="button">{translate("tripDrafts.itinerary.deleteDayConfirm.cancel")}</button>
      </div>
    </div>
  );
}

function InlineTripDraftNameEditor({
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
        <span>{translate("tripDrafts.name")}</span>
        <input
          autoFocus
          maxLength={100}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSave();
            if (event.key === "Escape") onCancel();
          }}
          value={name}
        />
      </label>
      <div>
        <button className="secondary-btn" onClick={onSave} type="button">{translate("tripDrafts.save")}</button>
        <button className="secondary-btn" onClick={onCancel} type="button">
          <X size={14} aria-hidden="true" />
          {translate("tripDrafts.cancel")}
        </button>
      </div>
    </div>
  );
}

function DeleteTripDraftConfirm({
  draft,
  onCancel,
  onConfirm,
  translate
}: {
  draft: TripDraft;
  onCancel: () => void;
  onConfirm: () => void;
  translate: (key: string) => string;
}) {
  return (
    <div className="collection-delete-confirm" role="group" aria-label={translate("tripDrafts.deleteConfirm.title")}>
      <strong>{translate("tripDrafts.deleteConfirm.title")}</strong>
      <p>{translate("tripDrafts.deleteConfirm.description").replace("{name}", draft.name)}</p>
      <div>
        <button className="secondary-btn" onClick={onConfirm} type="button">{translate("tripDrafts.deleteConfirm.confirm")}</button>
        <button className="secondary-btn" onClick={onCancel} type="button">{translate("tripDrafts.deleteConfirm.cancel")}</button>
      </div>
    </div>
  );
}

function translateTripDraftError(error: TripDraftMutationError | null, translate: (key: string) => string) {
  if (!error) return "";
  if (error === "invalid_name") return translate("tripDrafts.errors.invalidName");
  if (error === "invalid_day_title") return translate("tripDrafts.itinerary.errors.invalidTitle");
  if (error === "draft_not_found") return translate("tripDrafts.errors.notFound");
  if (error === "day_not_found") return translate("tripDrafts.itinerary.errors.dayNotFound");
  if (error === "draft_limit_reached") return translate("tripDrafts.errors.limitReached");
  if (error === "day_limit_reached") return translate("tripDrafts.itinerary.errors.dayLimitReached");
  if (error === "place_limit_reached") return translate("tripDrafts.errors.limitReached");
  if (error === "invalid_destination_day") return translate("tripDrafts.itinerary.errors.invalidDestination");
  if (error === "place_not_found") return translate("tripDrafts.itinerary.errors.placeNotFound");
  if (error === "reserved_day_operation") return translate("tripDrafts.itinerary.errors.dayNotFound");
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
