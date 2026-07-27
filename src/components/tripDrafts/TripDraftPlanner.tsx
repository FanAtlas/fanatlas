import { useState } from "react";
import { BackButton } from "../BackButton";
import { useTravelIntelligence } from "../../contexts/TravelIntelligenceContext";
import { useTripDrafts } from "../../hooks/useTripDrafts";
import { useLanguage } from "../../LanguageContext";
import type { Tab } from "../../main";
import { getFanZoneDestination, getStadiumDestination, type MapDestination } from "../../mapDestinations";
import type {
  HydratedTripDraft,
  TripDraft,
  TripDraftMutationError,
  TripItineraryDay,
  TripTimeBlock
} from "../../lib/tripDrafts";
import type { SavedPlaceAction } from "../../lib/savedPlaceActions";
import { createDefaultMissingDayTitles, formatTimeBlockSuccess, translateTripDraftError } from "./displayUtils";
import { TripDraftDetailView } from "./TripDraftDetailView";
import { TripDraftListView } from "./TripDraftListView";
import { TripStatusMessage } from "./TripStatusMessage";

export type TripDraftPlannerProps = {
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

export function TripDraftPlanner({
  onBack,
  setExploreCategory,
  setMapDestination,
  setSelectedRestaurant,
  setSelectedStadium,
  setTab
}: TripDraftPlannerProps) {
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
    createMissingDays,
    renameDay,
    deleteDay,
    movePlace,
    movePlaceGroup,
    movePlaceWithinSection,
    setPlaceTimeBlock,
    updateDetails
  } = useTripDrafts(savedPlaces);
  const [view, setView] = useState<TripDraftsView>({ mode: "list" });
  const [newDraftName, setNewDraftName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDetailsId, setEditingDetailsId] = useState<string | null>(null);
  const [detailsDestination, setDetailsDestination] = useState("");
  const [detailsStartDate, setDetailsStartDate] = useState("");
  const [detailsEndDate, setDetailsEndDate] = useState("");
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

  function startEditDetails(draft: TripDraft) {
    setEditingDetailsId(draft.id);
    setDetailsDestination(draft.destination?.label || "");
    setDetailsStartDate(draft.travelDates?.startDate || "");
    setDetailsEndDate(draft.travelDates?.endDate || "");
    setLocalError("");
    setLocalMessage("");
  }

  function cancelEditDetails() {
    setEditingDetailsId(null);
    setDetailsDestination("");
    setDetailsStartDate("");
    setDetailsEndDate("");
    setLocalError("");
  }

  function submitTripDetails(draftId: string) {
    const destination = detailsDestination.trim()
      ? { label: detailsDestination }
      : null;
    const travelDates = detailsStartDate
      ? { startDate: detailsStartDate, endDate: detailsEndDate || undefined }
      : detailsEndDate
        ? { startDate: "", endDate: detailsEndDate }
        : null;
    const result = updateDetails(draftId, { destination, travelDates });
    if (!result.ok) {
      setLocalError(translateTripDraftError(result.error || "storage_write_failed", translate));
      return;
    }
    setEditingDetailsId(null);
    setLocalError("");
    setLocalMessage(translate("tripDrafts.details.saved"));
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

  function submitCreateMissingDays(draft: HydratedTripDraft) {
    const missingDayCount = draft.context.dateAlignment?.unusedTripDates || 0;
    const existingDayCount = draft.draft.itineraryDays.length;
    const titles = createDefaultMissingDayTitles(existingDayCount, missingDayCount, translate);
    const result = createMissingDays(draft.draft.id, titles);
    if (!result.ok || !result.value) {
      setLocalError(translateTripDraftError(result.error || "storage_write_failed", translate));
      return;
    }
    setLocalError("");
    setLocalMessage(
      result.value.createdDays.length === 1
        ? translate("tripDrafts.details.createdOneDaySuccess")
        : translate("tripDrafts.details.createdManyDaysSuccess").replace("{count}", String(result.value.createdDays.length))
    );
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

  function submitMovePlaceWithinSection(draftId: string, logicalPlaceId: string, direction: "up" | "down", placeName: string) {
    const result = movePlaceWithinSection(draftId, logicalPlaceId, direction);
    if (!result.ok) {
      setLocalError(translateTripDraftError(result.error || "place_not_found", translate));
      return;
    }
    if (!result.value) return;
    setLocalError("");
    setLocalMessage(
      translate(direction === "up" ? "tripDrafts.itinerary.movedUpSuccess" : "tripDrafts.itinerary.movedDownSuccess").replace("{name}", placeName)
    );
  }

  function submitSetPlaceTimeBlock(draftId: string, logicalPlaceId: string, timeBlock: TripTimeBlock | null, placeName: string) {
    const result = setPlaceTimeBlock(draftId, logicalPlaceId, timeBlock);
    if (!result.ok) {
      setLocalError(translateTripDraftError(result.error || "invalid_time_block", translate));
      return;
    }
    if (!result.value) {
      setLocalError("");
      setLocalMessage("");
      return;
    }
    setLocalError("");
    setLocalMessage(formatTimeBlockSuccess(timeBlock, placeName, translate));
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

      <TripStatusMessage isError message={localError || translateTripDraftError(error, translate)} />

      <TripStatusMessage message={localMessage} />

      {limitations.favoritesUnavailable && (
        <TripStatusMessage message={translate("tripDrafts.limitedData")} />
      )}

      {view.mode === "detail" && selected ? (
        <TripDraftDetailView
          deleteId={deleteId}
          deleteDayId={deleteDayId}
          draft={selected}
          editingId={editingId}
          editingDetailsId={editingDetailsId}
          editingDayId={editingDayId}
          editingDayTitle={editingDayTitle}
          editingName={editingName}
          detailsDestination={detailsDestination}
          detailsEndDate={detailsEndDate}
          detailsStartDate={detailsStartDate}
          isLoadingPlaces={isLoading}
          language={language}
          newDayTitle={newDayTitle}
          onCancelDelete={() => setDeleteId(null)}
          onCancelDeleteDay={() => setDeleteDayId(null)}
          onCancelEdit={() => {
            setEditingId(null);
            setEditingName("");
          }}
          onCancelEditDetails={cancelEditDetails}
          onCancelEditDay={() => {
            setEditingDayId(null);
            setEditingDayTitle("");
          }}
          onConfirmDeleteDay={confirmDeleteDay}
          onCreateDay={submitCreateDay}
          onCreateMissingDays={submitCreateMissingDays}
          onConfirmDelete={confirmDelete}
          onDeleteRequest={setDeleteId}
          onDayDeleteRequest={setDeleteDayId}
          onDuplicate={submitDuplicate}
          onEditDayTitle={setEditingDayTitle}
          onEditName={setEditingName}
          onEditDetailsDestination={setDetailsDestination}
          onEditDetailsEndDate={setDetailsEndDate}
          onEditDetailsStartDate={setDetailsStartDate}
          onExecuteAction={executeAction}
          onMovePlaceGroup={(draftId, request) => {
            const result = movePlaceGroup(draftId, {
              memberIds: request.memberIds,
              expectedSourceDayId: request.expectedSourceDayId,
              expectedSourceTimeBlock: request.expectedSourceTimeBlock,
              destinationDayId: request.destinationDayId,
              destinationTimeBlock: request.destinationTimeBlock
            });
            if (!result.ok) {
              setLocalError(translateTripDraftError(result.error || "storage_write_failed", translate));
              setLocalMessage("");
              return false;
            }
            if (!result.value) {
              setLocalError("");
              setLocalMessage("");
              return false;
            }
            setLocalError("");
            setLocalMessage(
              translate("tripDrafts.nearbyGroups.movedSuccess")
                .replace("{count}", String(request.memberIds.length))
                .replace("{destination}", request.destinationLabel)
            );
            return true;
          }}
          onMovePlace={submitMovePlace}
          onMovePlaceWithinSection={submitMovePlaceWithinSection}
          onSetPlaceTimeBlock={submitSetPlaceTimeBlock}
          onNewDayTitleChange={setNewDayTitle}
          onRemovePlace={(placeId) => removePlaceFromDraft(selected.draft.id, placeId)}
          onRenameDay={submitRenameDay}
          onRename={submitRename}
          onSaveDetails={submitTripDetails}
          onStartEditDetails={startEditDetails}
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
          language={language}
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
