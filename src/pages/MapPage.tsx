import { useState } from "react";
import { Tab } from "../main";

type Place = {
  name: string;
  type: string;
  emoji: string;
  city: string;
  top: string;
  left: string;
};

const places: Place[] = [
  {
    name: "MetLife Stadium",
    type: "stadium",
    emoji: "🏟",
    city: "New York/New Jersey",
    top: "27%",
    left: "70%"
  },
  {
    name: "Estadio Azteca",
    type: "stadium",
    emoji: "🏟",
    city: "Mexico City",
    top: "77%",
    left: "38%"
  },
  {
    name: "Times Square Fan Park",
    type: "fan zone",
    emoji: "🎉",
    city: "New York",
    top: "22%",
    left: "73%"
  },
  {
    name: "Hospital",
    type: "hospital",
    emoji: "🏥",
    city: "New York",
    top: "32%",
    left: "67%"
  },
  {
    name: "LA Cafe",
    type: "cafe",
    emoji: "☕",
    city: "Los Angeles",
    top: "48%",
    left: "15%"
  },
  {
    name: "Miami Restaurant",
    type: "restaurant",
    emoji: "🍽",
    city: "Miami",
    top: "72%",
    left: "73%"
  }
];

const travelModes = [
  {
    id: "walk",
    icon: "🚶",
    label: "Walk",
    eta: "18 min",
    distance: "1.4 km"
  },
  {
    id: "car",
    icon: "🚗",
    label: "Car",
    eta: "9 min",
    distance: "3.2 km"
  },
  {
    id: "train",
    icon: "🚆",
    label: "Train",
    eta: "28 min",
    distance: "8.1 km"
  },
  {
    id: "bus",
    icon: "🚌",
    label: "Bus",
    eta: "34 min",
    distance: "6.8 km"
  }
];

export function MapPage({ setTab }: { setTab: (tab: Tab) => void }) {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mode, setMode] = useState("walk");

  const selectedMode = travelModes.find((m) => m.id === mode);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">
            FanAtlas <span>2026</span>
          </div>
          <div className="subtle">In-app navigation</div>
        </div>

        <div className="language-pill">🌐 English</div>
      </div>

      <div className="map-screen">
        <div className="chip-scroll map-chips">
          {["All", "🏟 stadium", "🎉 fan zone", "🍽 restaurant", "☕ cafe", "🏨 hotel", "🏥 hospital", "🚓 police"].map(
            (chip, index) => (
              <span className={`chip ${index === 0 ? "active" : ""}`} key={chip}>
                {chip}
              </span>
            )
          )}
        </div>

        {places.map((place) => (
          <button
            className="map-pin"
            style={{ top: place.top, left: place.left }}
            key={place.name}
            onClick={() => setSelectedPlace(place)}
          >
            {place.emoji} {place.name}
          </button>
        ))}

        <button className="find-nearby">➤ Find Nearby</button>
      </div>

      {selectedPlace && (
        <div className="navigation-panel">
          <div className="nav-drag"></div>

          <div className="nav-place-header">
            <div>
              <h2>
                {selectedPlace.emoji} {selectedPlace.name}
              </h2>
              <p>{selectedPlace.city}</p>
            </div>

            <button onClick={() => setSelectedPlace(null)}>×</button>
          </div>

          <div className="travel-mode-row">
            {travelModes.map((travel) => (
              <button
                key={travel.id}
                className={`travel-mode ${mode === travel.id ? "active" : ""}`}
                onClick={() => setMode(travel.id)}
              >
                <span>{travel.icon}</span>
                <strong>{travel.label}</strong>
                <small>{travel.eta}</small>
              </button>
            ))}
          </div>

          <div className="route-summary">
            <h3>
              {selectedMode?.icon} {selectedMode?.label} Route
            </h3>

            <p>
              ETA: <strong>{selectedMode?.eta}</strong>
            </p>

            <p>
              Distance: <strong>{selectedMode?.distance}</strong>
            </p>

            <p>
              Route type: <strong>Safest route recommended</strong>
            </p>
          </div>

          <div className="route-steps">
            <h3>Directions</h3>

            <div className="route-step">
              <span>1</span>
              <p>Start from your current location.</p>
            </div>

            <div className="route-step">
              <span>2</span>
              <p>Follow the safest main streets toward {selectedPlace.name}.</p>
            </div>

            <div className="route-step">
              <span>3</span>
              <p>Avoid crowded exits and unofficial shortcuts.</p>
            </div>

            <div className="route-step">
              <span>4</span>
              <p>Arrive at {selectedPlace.name}.</p>
            </div>
          </div>

          <button className="primary-btn full-width" onClick={() => setTab("matches")}>
            Use for Match Day Plan
          </button>
        </div>
      )}

      {!selectedPlace && (
        <div className="feature-card blue">
          <span className="feature-emoji">🧭</span>
          <div>
            <h3>Tap any place on the map</h3>
            <p>Choose walking, car, train, or bus directions inside FanAtlas.</p>
          </div>
        </div>
      )}
    </>
  );
}
