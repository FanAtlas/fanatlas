import { useEffect, useState } from "react";
import { Heart, MapPin, Trash2 } from "lucide-react";
import { Tab } from "../main";
import { getFanZoneDestination, getPlaceDestination, getStadiumDestination, MapDestination } from "../mapDestinations";
import { FavoriteItem, listFavorites, removeFavorite } from "../services/favorites";

type Props = {
  setExploreCategory: (category: string) => void;
  setMapDestination: (destination: MapDestination | null) => void;
  setSelectedRestaurant: (restaurant: any) => void;
  setSelectedStadium: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
};

function typeLabel(type: FavoriteItem["item_type"]) {
  if (type === "fan-zone") return "Fan Zone";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function iconFor(type: FavoriteItem["item_type"]) {
  if (type === "stadium") return "🏟";
  if (type === "restaurant") return "🍽";
  if (type === "hotel") return "🏨";
  return "🎉";
}

export function FavoritesPage({
  setExploreCategory,
  setMapDestination,
  setSelectedRestaurant,
  setSelectedStadium,
  setTab
}: Props) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadFavorites() {
    try {
      setLoading(true);
      setError("");
      setFavorites(await listFavorites());
    } catch (err: any) {
      setError(err?.message || "Could not load favorites.");
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFavorites();
  }, []);

  async function deleteFavorite(item: FavoriteItem) {
    try {
      await removeFavorite(item.item_type, item.item_id);
      setFavorites((current) => current.filter((favorite) => (
        favorite.item_type !== item.item_type || favorite.item_id !== item.item_id
      )));
    } catch (err: any) {
      setError(err?.message || "Could not remove favorite.");
    }
  }

  function viewFavorite(item: FavoriteItem) {
    if (item.item_type === "stadium") {
      setSelectedStadium(getStadiumDestination(item.name, item.city || "") || item.metadata?.destination || null);
      setTab("stadium");
      return;
    }

    if (item.item_type === "restaurant") {
      setSelectedRestaurant({
        name: item.name,
        city: item.city || "",
        ...(item.metadata || {})
      });
      setTab("restaurant");
      return;
    }

    if (item.item_type === "hotel") {
      setMapDestination(getPlaceDestination(item.name, item.city || "") || item.metadata?.destination || null);
      setTab("map");
      return;
    }

    setMapDestination(getFanZoneDestination(item.name) || item.metadata?.destination || null);
    setExploreCategory("fanzones");
    setTab("fanzones");
  }

  return (
    <div className="favorites-page">
      <div className="topbar">
        <div>
          <div className="brand">Favorites <span>Saved</span></div>
          <div className="subtle">Stadiums, restaurants, hotels, and fan zones</div>
        </div>
        <button className="mini-btn" onClick={loadFavorites} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="favorites-hero">
        <Heart size={28} />
        <div>
          <h1>View Favorites</h1>
          <p>Saved items are stored in your Supabase profile account.</p>
        </div>
      </div>

      {loading && <div className="card-dark">Loading favorites...</div>}

      {error && (
        <div className="route-status error">
          {error}
        </div>
      )}

      {!loading && favorites.length === 0 && !error && (
        <div className="card-dark">
          <strong>No favorites yet</strong>
          <p className="subtle">Tap the heart on stadiums, restaurants, hotels, or fan zones to save them.</p>
        </div>
      )}

      <div className="favorites-list">
        {favorites.map((item) => (
          <article className="favorite-card" key={`${item.item_type}-${item.item_id}`}>
            {item.image ? <img src={item.image} alt={item.name} /> : <div className="favorite-icon">{iconFor(item.item_type)}</div>}
            <div className="favorite-card-main">
              <span>{typeLabel(item.item_type)}</span>
              <strong>{item.name}</strong>
              <p>{item.city || "FanAtlas"}</p>
            </div>
            <div className="favorite-card-actions">
              <button className="secondary-btn" onClick={() => viewFavorite(item)}>
                <MapPin size={15} /> View
              </button>
              <button className="favorite-delete-btn" onClick={() => deleteFavorite(item)} aria-label={`Remove ${item.name}`}>
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
