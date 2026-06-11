import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap
} from "react-leaflet";
import L from "leaflet";
import { Tab } from "../main";

const places = [
  { name: "MetLife Stadium", city: "New York/New Jersey", lat: 40.8135, lng: -74.0745, emoji: "🏟" },
  { name: "Estadio Azteca", city: "Mexico City", lat: 19.3029, lng: -99.1505, emoji: "🏟" },
  { name: "SoFi Stadium", city: "Los Angeles", lat: 33.9535, lng: -118.3392, emoji: "🏟" },
  { name: "Times Square Fan Park", city: "New York", lat: 40.758, lng: -73.9855, emoji: "🎉" }
];

const createIcon = (emoji: string) =>
  L.divIcon({
    html: `<div class="real-map-marker">${emoji}</div>`,
    className: "",
    iconSize: [40, 40]
  });

function FitRoute({ route }: { route: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (route.length > 1) {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [route, map]);

  return null;
}

export function MapPage({ setTab }: { setTab: (tab: Tab) => void }) {
  const [userLocation, setUserLocation] = useState<[number, number]>([40.758, -73.9855]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [mode, setMode] = useState<"walking" | "driving">("driving");
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => console.log("Location unavailable")
    );
  }, []);

  async function buildRoute(place: any, travelMode: "walking" | "driving" = mode) {
    setSelectedPlace(place);
    setMode(travelMode);
    setIsNavigating(false);

    const profile = travelMode === "walking" ? "foot" : "car";

    const url =
      `https://router.project-osrm.org/route/v1/${profile}/` +
      `${userLocation[1]},${userLocation[0]};` +
      `${place.lng},${place.lat}` +
      `?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes?.length) return;

    const routeData = data.routes[0];

    const coordinates = routeData.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
    );

    const routeSteps =
      routeData.legs?.[0]?.steps?.map((step: any) => {
        const street = step.name ? ` on ${step.name}` : "";
        return `${step.maneuver?.type || "Continue"}${street}`;
      }) || [];

    setRoute(coordinates);
    setSteps(routeSteps.slice(0, 8));
    setDistance(`${(routeData.distance / 1000).toFixed(1)} km`);
    setDuration(`${Math.round(routeData.duration / 60)} min`);
  }

  function useMyLocation() {
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLocation([pos.coords.latitude, pos.coords.longitude]);

      if (selectedPlace) {
        setTimeout(() => {
          buildRoute(selectedPlace, mode);
        }, 300);
      }
    });
  }

  return (
    <div className="navigation-page">
      <div className="navigation-map">
        <MapContainer center={userLocation} zoom={12} className="real-map">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />

          <Marker position={userLocation} icon={createIcon("📍")}>
            <Popup>Your Location</Popup>
          </Marker>

          {places.map((place) => (
            <Marker
              key={place.name}
              position={[place.lat, place.lng]}
              icon={createIcon(place.emoji)}
              eventHandlers={{
                click: () => buildRoute(place, mode)
              }}
            >
              <Popup>{place.name}</Popup>
            </Marker>
          ))}

          {route.length > 0 && (
            <>
              <Polyline positions={route} />
              <FitRoute route={route} />
            </>
          )}
        </MapContainer>

        <button
  className="start-navigation-btn"
  onClick={startNavigation}
>
  {isNavigating ? "Navigation Active" : "Start Navigation"}
</button>
{isNavigating && (
  <button
    className="stop-navigation-btn"
    onClick={() => {
      setIsNavigating(false);

      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }}
  >
    Stop Navigation
  </button>
)}
        {isNavigating && selectedPlace && (
          <div className="next-turn-banner">
            <strong>
  {steps[currentStep] || `Continue to ${selectedPlace.name}`}
</strong>
<span>{duration} · {distance}</span>
          </div>
        )}
      </div>

      {selectedPlace ? (
        <div className="apple-nav-sheet">
          <div className="nav-drag"></div>

          <h2>{selectedPlace.emoji} {selectedPlace.name}</h2>
          <p>{selectedPlace.city}</p>

          <div className="travel-mode-row">
            <button
              className={`travel-mode ${mode === "walking" ? "active" : ""}`}
              onClick={() => buildRoute(selectedPlace, "walking")}
            >
              🚶 Walk
            </button>

            <button
              className={`travel-mode ${mode === "driving" ? "active" : ""}`}
              onClick={() => buildRoute(selectedPlace, "driving")}
            >
              🚗 Car
            </button>

            <button className="travel-mode disabled">🚆 Train</button>
            <button className="travel-mode disabled">🚌 Bus</button>
          </div>

          <div className="route-summary">
            <p>ETA: <strong>{duration}</strong></p>
            <p>Distance: <strong>{distance}</strong></p>
          </div>

          <button
            className="start-navigation-btn"
            onClick={() => setIsNavigating(true)}
          >
            Start Navigation
          </button>

          <div className="route-steps">
            <h3>Directions</h3>

            {steps.map((step, index) => (
              <div className="route-step" key={index}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="apple-nav-sheet compact">
          <div className="nav-drag"></div>
          <h2>Choose a destination</h2>
          <p>Tap a stadium or fan zone to get in-app directions.</p>
        </div>
      )}
    </div>
  );
}
function startNavigation() {
  if (!selectedPlace) return;

  setIsNavigating(true);
  setCurrentStep(0);

  if (watchIdRef.current) {
    navigator.geolocation.clearWatch(watchIdRef.current);
  }

  watchIdRef.current = navigator.geolocation.watchPosition(
    (pos) => {
      const newLocation: [number, number] = [
        pos.coords.latitude,
        pos.coords.longitude
      ];

      setUserLocation(newLocation);

      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      }
    },
    () => {
      alert("Please allow location access to use live navigation.");
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    }
  );
}
