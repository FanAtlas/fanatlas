import { Tab } from "../main";
import { getPlaceDestination, MapDestination } from "../mapDestinations";

type Restaurant = {
  name: string;
  city: string;
  rating: number;
  price: string;
  cuisine: string;
};

export function RestaurantDetailPage({
  restaurant,
  setMapDestination,
  setTab
}: {
  restaurant: Restaurant | null;
  setMapDestination: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
}) {
  if (!restaurant) {
    return (
      <>
        <h2>No restaurant selected</h2>
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <button
          className="small-dark-btn"
          onClick={() => setTab("explore")}
        >
          ← Back
        </button>
      </div>

      <div className="detail-hero">
        <h1>{restaurant.name}</h1>

        <p>
          ⭐ {restaurant.rating}
        </p>

        <p>
          🍽 {restaurant.cuisine}
        </p>

        <p>
          📍 {restaurant.city}
        </p>

        <p>
          💰 {restaurant.price}
        </p>
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
        <h3>Opening Hours</h3>

        <p>10:00 AM - 11:00 PM</p>
      </div>

      <div className="detail-card">
        <h3>FanAtlas Recommendation</h3>

        <p>
          Great place for fans before or after the match.
        </p>
      </div>
<div className="nav-app-buttons">
  <a className="buy-btn" href="https://www.opentable.com" target="_blank">
    Reserve Table
  </a>

  <a className="buy-btn" href="https://www.ubereats.com" target="_blank">
    Order Uber Eats
  </a>

  <a className="buy-btn" href="https://www.doordash.com" target="_blank">
    Order DoorDash
  </a>
</div>
      <button
        className="primary-btn"
        onClick={() => {
          setMapDestination(getPlaceDestination(restaurant.name, restaurant.city) || null);
          setTab("map");
        }}
      >
        📍 Get Directions
      </button>
    </>
  );
}
