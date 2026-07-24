import { useMemo, useState } from "react";
import { Heart, MapPin, Trash2 } from "lucide-react";
import { Tab } from "../main";
import { getFanZoneDestination, getStadiumDestination, MapDestination } from "../mapDestinations";
import { FavoriteItem, removeFavorite } from "../services/favorites";
import { type SavedPlace } from "../lib/savedPlaces";
import { TravelIntelligenceProvider, useTravelIntelligence } from "../contexts/TravelIntelligenceContext";
import { getSavedPlaceActions, type SavedPlaceAction } from "../lib/savedPlaceActions";
import { SavedPlaceSecondaryActions } from "../components/SavedPlaceSecondaryActions";
import { useLanguage } from "../LanguageContext";
import { usePlaceCollections } from "../hooks/usePlaceCollections";
import { useTripDrafts } from "../hooks/useTripDrafts";
import { AddToCollectionControl } from "../components/AddToCollectionControl";
import { AddToTripDraftControl } from "../components/AddToTripDraftControl";

type Props = {
  userId: string;
  setExploreCategory: (category: string) => void;
  setMapDestination: (destination: MapDestination | null) => void;
  setSelectedRestaurant: (restaurant: any) => void;
  setSelectedStadium: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
};

function typeLabel(type: string | undefined) {
  if (type === "fan-zone") return "Fan Zone";
  if (type === "fan_zone") return "Fan Zone";
  if (!type) return "Place";
  return type.replace("_", " ").charAt(0).toUpperCase() + type.replace("_", " ").slice(1);
}

function iconFor(type: string | undefined) {
  if (type === "stadium") return "🏟";
  if (type === "restaurant") return "🍽";
  if (type === "hotel") return "🏨";
  return "🎉";
}

export function FavoritesPage({
  userId,
  ...props
}: Props) {
  return (
    <TravelIntelligenceProvider userId={userId}>
      <FavoritesPageContent {...props} />
    </TravelIntelligenceProvider>
  );
}

function FavoritesPageContent({
  setExploreCategory,
  setMapDestination,
  setSelectedRestaurant,
  setSelectedStadium,
  setTab
}: Omit<Props, "userId">) {
  const { t } = useLanguage();
  const {
    savedPlaces,
    isLoading,
    limitations,
    refreshSavedPlaces
  } = useTravelIntelligence();
  const [deleteError, setDeleteError] = useState("");
  const {
    collections,
    error: collectionError,
    createCollection,
    addPlaceToCollection
  } = usePlaceCollections(savedPlaces);
  const {
    drafts,
    draftPlaceMembership,
    addPlaceToDraft,
    createDraftWithPlace
  } = useTripDrafts(savedPlaces);
  const savedPlaceRows = useMemo(
    () => savedPlaces.map((place) => ({
      place,
      actions: getSavedPlaceActions(place)
    })),
    [savedPlaces]
  );
  const translateAction = (key: string) => {
    const labels = t as Record<string, string>;
    return labels[key] || key;
  };

  async function deleteFavorite(place: SavedPlace) {
    const supabaseReference = place.storageReferences.find((reference) => reference.source === "supabase_favorite");
    const itemType = supabaseReference?.itemType as FavoriteItem["item_type"] | undefined;
    if (!itemType) return;

    try {
      setDeleteError("");
      await removeFavorite(itemType, supabaseReference.persistedId);
      await refreshSavedPlaces();
    } catch (err: any) {
      setDeleteError(err?.message || "Could not remove favorite.");
    }
  }

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

  return (
    <div className="favorites-page">
      <div className="topbar">
        <div>
          <div className="brand">Saved Places <span>{savedPlaces.length}</span></div>
          <div className="subtle">Places you saved for your journey.</div>
        </div>
        <div className="saved-places-top-actions">
          <button className="mini-btn" onClick={() => setTab("collections")} type="button">
            {translateAction("collections.title")}
          </button>
          <button className="mini-btn" onClick={refreshSavedPlaces} disabled={isLoading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="favorites-hero">
        <Heart size={28} />
        <div>
          <h1>Saved Places</h1>
          <p>Save restaurants, hotels, and attractions to find them here.</p>
        </div>
      </div>

      {isLoading && <div className="card-dark">Loading favorites...</div>}

      {limitations.favoritesUnavailable && (
        <div className="route-status error">
          Could not load favorites.
        </div>
      )}

      {deleteError && (
        <div className="route-status error">
          {deleteError}
        </div>
      )}

      {collectionError && (
        <div className="route-status error">
          {translateAction(`savedPlaces.collections.errors.${collectionError}`)}
        </div>
      )}

      {!isLoading && savedPlaces.length === 0 && !limitations.favoritesUnavailable && (
        <div className="card-dark">
          <strong>{limitations.hasUnresolvedExploreSaves ? "Your saved places could not be loaded for this destination." : "No saved places yet."}</strong>
          <p className="subtle">{limitations.hasUnresolvedExploreSaves ? "Saved places from other destinations may appear when that destination is active." : "Save restaurants, hotels, and attractions to find them here."}</p>
          <button className="secondary-btn" onClick={() => setTab("collections")} type="button">
            {translateAction("collections.title")}
          </button>
        </div>
      )}

      {savedPlaces.length > 0 && limitations.hasUnresolvedExploreSaves && (
        <div className="route-status">
          Some saved places are unavailable for the current destination.
        </div>
      )}

      <div className="favorites-list">
        {savedPlaceRows.map(({ place: item, actions }) => (
          <article className="favorite-card" key={item.id}>
            {item.image ? <img src={item.image} alt={item.name} /> : <div className="favorite-icon">{iconFor(item.itemType || item.type)}</div>}
            <div className="favorite-card-main">
              <span>{typeLabel(item.itemType || item.type)}</span>
              <strong>{item.name}</strong>
              <p>{[item.city, item.country].filter(Boolean).join(", ") || "FanAtlas"}</p>
            </div>
            <div className="favorite-card-actions">
              {actions.primary && (
                <button className="secondary-btn" onClick={() => executeAction(actions.primary!)}>
                  <MapPin size={15} /> View
                </button>
              )}
              {item.storageReferences.some((reference) => reference.source === "supabase_favorite") && (
                <button className="favorite-delete-btn" onClick={() => deleteFavorite(item)} aria-label={`Remove ${item.name}`}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <SavedPlaceSecondaryActions actions={actions.secondary} compact translate={translateAction} />
            <AddToCollectionControl
              collections={collections}
              onAddToCollection={(collectionId, place) => {
                addPlaceToCollection(collectionId, place);
              }}
              onCreateCollection={(name) => createCollection({ name })}
              place={item}
              translate={translateAction}
            />
            <AddToTripDraftControl
              drafts={drafts}
              membership={draftPlaceMembership}
              onAdd={addPlaceToDraft}
              onCreateAndAdd={(name, place) => createDraftWithPlace({ name, place })}
              place={item}
              translate={translateAction}
            />
          </article>
        ))}
      </div>
    </div>
  );
}
