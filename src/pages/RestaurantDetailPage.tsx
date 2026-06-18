import { Clock, MapPin, ShoppingBag, Star, Utensils } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { FavoriteButton } from "../components/FavoriteButton";
import { Tab } from "../main";
import { getPlaceDestination, MapDestination } from "../mapDestinations";

type Restaurant = {
  name: string;
  city: string;
  rating: number;
  price: string;
  cuisine: string;
  category?: string;
  busy?: string;
  distance?: string;
  image?: string;
  reserveUrl?: string;
  uberEatsUrl?: string;
  doorDashUrl?: string;
};

function restaurantSearchUrl(provider: "reserve" | "uber" | "doordash", restaurant: Restaurant) {
  const query = encodeURIComponent(`${restaurant.name} ${restaurant.city}`);

  if (provider === "reserve") return restaurant.reserveUrl || `https://www.opentable.com/s?term=${query}`;
  if (provider === "uber") return restaurant.uberEatsUrl || `https://www.ubereats.com/search?q=${query}`;
  return restaurant.doorDashUrl || `https://www.doordash.com/search/store/${query}/`;
}

function busyLabel(value = "moderate") {
  return value.replace("_", " ");
}

export function RestaurantDetailPage({
  onBack,
  restaurant,
  setMapDestination,
  setTab
}: {
  onBack: () => void;
  restaurant: Restaurant | null;
  setMapDestination: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
}) {
  if (!restaurant) {
    return (
      <>
        <BackButton onBack={onBack} />
        <h2>No restaurant selected</h2>
        <button className="primary-btn" onClick={() => setTab("explore")}>Explore Restaurants</button>
      </>
    );
  }

  return (
    <div className="restaurant-detail-page">
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div className="brand">Restaurant <span>Revenue</span></div>
      </div>

      <div className="restaurant-detail-hero">
        <img src={restaurant.image} alt={restaurant.name} />
        <div className="restaurant-detail-overlay">
          <h1>{restaurant.name}</h1>
          <p>{restaurant.city} · {restaurant.cuisine || restaurant.category}</p>
        </div>
      </div>

      <FavoriteButton
        item={{
          item_type: "restaurant",
          item_id: restaurant.name,
          name: restaurant.name,
          city: restaurant.city,
          image: restaurant.image,
          metadata: restaurant
        }}
      />

      <div className="restaurant-metrics">
        <span><Star size={15} /> {restaurant.rating}</span>
        <span><Clock size={15} /> {busyLabel(restaurant.busy)}</span>
        <span><MapPin size={15} /> {restaurant.distance || "Nearby"}</span>
        <span><Utensils size={15} /> {restaurant.price}</span>
      </div>

      <div className="restaurant-action-grid">
        <a className="buy-btn" href={restaurantSearchUrl("reserve", restaurant)} target="_blank" rel="noreferrer">
          Reserve Table
        </a>

        <a className="buy-btn" href={restaurantSearchUrl("uber", restaurant)} target="_blank" rel="noreferrer">
          Order Uber Eats
        </a>

        <a className="buy-btn" href={restaurantSearchUrl("doordash", restaurant)} target="_blank" rel="noreferrer">
          Order DoorDash
        </a>

        <button
          className="primary-btn"
          onClick={() => {
            setMapDestination(getPlaceDestination(restaurant.name, restaurant.city) || null);
            setTab("map");
          }}
        >
          Navigate
        </button>
      </div>

      <div className="detail-card">
        <h3>Popular Dishes</h3>
        <ul>
          <li>Chef Special</li>
          <li>Most Ordered Dish</li>
          <li>Local Favorite</li>
        </ul>
      </div>

      <div className="detail-card">
        <h3>Revenue Ready</h3>
        <p>
          Reservation and delivery buttons use restaurant-specific partner URLs and can be replaced with tracked affiliate links.
        </p>
      </div>

      <div className="action-note">
        <ShoppingBag size={18} />
        <span>Users stay in FanAtlas for details and navigation. Ordering links open only when selected.</span>
      </div>
    </div>
  );
}
