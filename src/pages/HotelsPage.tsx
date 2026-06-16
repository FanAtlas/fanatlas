import { useState } from "react";
import { Tab } from "../main";
import { getPlaceDestination, MapDestination } from "../mapDestinations";

export function HotelsPage({
  setMapDestination,
  setTab
}: {
  setMapDestination: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
}) {
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null);
  const hotels = [
    {
      name: "Ibis Mexico City",
      city: "Mexico City",
      type: "Budget",
      distance: "0.9 km from stadium",
      price: "$80/night",
      bestFor: "Fans who want a clean room close to transit",
      amenities: ["Metro access", "Breakfast", "24h desk"]
    },
    {
      name: "Holiday Inn",
      city: "Los Angeles",
      type: "Mid Range",
      distance: "1.2 km from stadium",
      price: "$145/night",
      bestFor: "Groups who need predictable comfort",
      amenities: ["Parking", "Shuttle area", "Family rooms"]
    },
    {
      name: "Marriott Times Square",
      city: "New York",
      type: "Luxury",
      distance: "0.5 km from fan zone",
      price: "$220/night",
      bestFor: "Fans who want premium service near events",
      amenities: ["Concierge", "Late dining", "Lounge"]
    }
  ];

  const sections = [
    {
      name: "Budget",
      summary: "Simple stays near transit with the best nightly value.",
      from: "From $80"
    },
    {
      name: "Mid Range",
      summary: "Reliable hotels for families, friend groups, and longer stays.",
      from: "From $145"
    },
    {
      name: "Luxury",
      summary: "Premium locations and services near fan zones and stadium routes.",
      from: "From $220"
    }
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">Hotels</div>
          <div className="subtle">Stay near stadiums and fan zones</div>
        </div>
      </div>

      {sections.map((section) => (
        <section className="hotel-section" key={section.name}>
          <div className="hotel-tier-header">
            <div>
              <h3>{section.name}</h3>
              <p>{section.summary}</p>
            </div>
            <span>{section.from}</span>
          </div>

          {hotels
            .filter((hotel) => hotel.type === section.name)
            .map((hotel) => (
              <div className="product-card" key={hotel.name}>
                <div className="thumb">🏨</div>

                <div className="product-info">
                  <strong>{hotel.name}</strong>
                  <p>{hotel.city} · {hotel.distance}</p>
                  <p>{hotel.bestFor}</p>
                  <div className="hotel-amenities">
                    {hotel.amenities.map((amenity) => (
                      <span key={amenity}>{amenity}</span>
                    ))}
                  </div>
                  {expandedHotel === hotel.name && (
                    <div className="hotel-detail-panel">
                      <p>Good fit: {hotel.bestFor.toLowerCase()}.</p>
                      <p>Use Navigate to preview the route from fan areas before booking.</p>
                    </div>
                  )}
                  <span className="price">{hotel.price}</span>
                </div>

                <div className="hotel-actions">
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setExpandedHotel(expandedHotel === hotel.name ? null : hotel.name)}
                  >
                    Details
                  </button>
                  <button
                    className="buy-btn"
                    onClick={() => {
                      setMapDestination(getPlaceDestination(hotel.name, hotel.city) || null);
                      setTab("map");
                    }}
                  >
                    Navigate
                  </button>
                </div>
              </div>
            ))}
        </section>
      ))}
    </>
  );
}
