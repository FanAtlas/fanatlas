import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import { Tab } from "../main";

type Place = {
  const matchedPlace =
  selectedMatch &&
  places.find((p) =>
    selectedMatch.stadium?.toLowerCase().includes(p.name.toLowerCase())
  );
  name: string;
  type: string;
  city: string;
  lat: number;
  lng: number;
  emoji: string;
};

const places: Place[] = [
  { name: "MetLife Stadium", type: "stadium", city: "New York/New Jersey", lat: 40.8135, lng: -74.0745, emoji: "🏟" },
  { name: "Estadio Azteca", type: "stadium", city: "Mexico City", lat: 19.3029, lng: -99.1505, emoji: "🏟" },
  { name: "SoFi Stadium", type: "stadium", city: "Los Angeles", lat: 33.9535, lng: -118.3392, emoji: "🏟" },
  { name: "Times Square Fan Park", type: "fan zone", city: "New York", lat: 40.758, lng: -73.9855, emoji: "🎉" },
  { name: "LA Cafe", type: "cafe", city: "Los Angeles", lat: 34.0522, lng: -118.2437, emoji: "☕" },
  { name: "Nearby Hospital NYC", type: "hospital", city: "New York", lat: 40.7648, lng: -73.9808, emoji: "🏥" }
];

const iconFor = (emoji: string) =>
  L.divIcon({
    html: `<div class="real-map-marker">${emoji}</div>`,
    className: "",
    iconSize: [38, 38]
  });

export function MapPage({
  setTab,
  selectedMatch
}: {
  setTab: (tab: Tab) => void;
  selectedMatch?: any;
}) {
  const [userLocation, setUserLocation] = useState<[number, number]>([40.758, -73.9855]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [mode, setMode] = useState<"walking" | "driving" | "train" | "bus">("walking");
  const [route, setRoute] = useState<[number, number][]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        console.log("Location permission denied. Using default location.");
      }
    );
  }, []);

  async function buildRoute(place: Place, selectedMode: typeof mode) {
    setSelected(place);
    setMode(selectedMode);
    setRoute([]);
    setSteps([]);

    if (selectedMode === "train" || selectedMode === "bus") {
      setDistance("Transit route");
      setDuration("Coming soon");
      setSteps([
        "Walk to the nearest official transit station.",
        "Use public transit toward the stadium or fan zone.",
        "Follow official event signs after arrival.",
        "Avoid unofficial taxis or street rides."
      ]);
      return;
    }

    const profile = selectedMode === "walking" ? "foot" : "car";

    const url = `https://router.project-osrm.org/route/v1/${profile}/${userLocation[1]},${userLocation[0]};${place.lng},${place.lat}?overview=full&geometries=geojson&steps=true`;

    const res = await fetch(url);
    const data = await res.json();

    const firstRoute = data.routes?.[0];
    if (!firstRoute) return;

    const coords = firstRoute.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
    );

    setRoute(coords);
    setDistance(`${(firstRoute.distance / 1000).toFixed(1)} km`);
    setDuration(`${Math.round(firstRoute.duration / 60)} min`);

    const routeSteps =
      firstRoute.legs?.[0]?.steps?.map((s: any) => {
        const name = s.name ? ` on ${s.name}` : "";
        return `${s.maneuver?.type || "Continue"}${name}`;
      }) || [];

    setSteps(routeSteps.slice(0, 8));
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">FanAtlas <span>2026</span></div>
          <div className="subtle">Real in-app navigation</div>
        </div>
      </div>

      <div className="real-map-wrapper">
        <MapContainer center={userLocation} zoom={11} className="real-map">
          <TileLayer
            attribution="© OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Marker position={userLocation} icon={iconFor("📍")}>
            <Popup>Your location</Popup>
          </Marker>

          {places.map((place) => (
            <Marker
              key={place.name}
              position={[place.lat, place.lng]}
              icon={iconFor(place.emoji)}
              eventHandlers={{
                click: () => buildRoute(place, mode)
              }}
            >
              <Popup>{place.name}</Popup>
            </Marker>
          ))}

          {route.length > 0 && <Polyline positions={route} />}
        </MapContainer>
      </div>

      {selected && (
        <div className="navigation-panel">
          <h2>{selected.emoji} {selected.name}</h2>
          <p>{selected.city}</p>

          <div className="travel-mode-row">
            <button className={`travel-mode ${mode === "walking" ? "active" : ""}`} onClick={() => buildRoute(selected, "walking")}>🚶 Walk</button>
            <button className={`travel-mode ${mode === "driving" ? "active" : ""}`} onClick={() => buildRoute(selected, "driving")}>🚗 Car</button>
            <button className={`travel-mode ${mode === "train" ? "active" : ""}`} onClick={() => buildRoute(selected, "train")}>🚆 Train</button>
            <button className={`travel-mode ${mode === "bus" ? "active" : ""}`} onClick={() => buildRoute(selected, "bus")}>🚌 Bus</button>
          </div>

          <div className="route-summary">
            <p>ETA: <strong>{duration}</strong></p>
            <p>Distance: <strong>{distance}</strong></p>
          </div>

          <h3>Directions</h3>
          {steps.map((step, index) => (
            <div className="route-step" key={index}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}

          <button className="primary-btn full-width" onClick={() => setTab("matches")}>
            Use for Match Day Plan
          </button>
        </div>
      )}
    </>
  );
}
