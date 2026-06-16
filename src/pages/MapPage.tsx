import { useEffect, useState } from "react";
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
import { defaultMapDestinations, MapDestination } from "../mapDestinations";

type TravelMode = "walking" | "driving" | "transit";

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

function FocusMap({
  destination,
  userLocation
}: {
  destination: MapDestination | null;
  userLocation: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    if (destination) {
      map.setView([destination.lat, destination.lng], 14, { animate: true });
    } else {
      map.setView(userLocation, 12, { animate: true });
    }
  }, [destination, map, userLocation]);

  return null;
}

function formatStep(step: any) {
  const type = step.maneuver?.type || "Continue";
  const modifier = step.maneuver?.modifier ? ` ${step.maneuver.modifier}` : "";
  const street = step.name ? ` on ${step.name}` : "";
  return `${type}${modifier}${street}`;
}

function straightLineRoute(origin: [number, number], destination: MapDestination) {
  const midpoint: [number, number] = [
    (origin[0] + destination.lat) / 2 + 0.006,
    (origin[1] + destination.lng) / 2 - 0.006
  ];

  return [
    origin,
    midpoint,
    [destination.lat, destination.lng] as [number, number]
  ];
}

function distanceKm(origin: [number, number], destination: MapDestination) {
  const earthRadiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(destination.lat - origin[0]);
  const dLng = toRad(destination.lng - origin[1]);
  const lat1 = toRad(origin[0]);
  const lat2 = toRad(destination.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function buildDemoRoute(
  origin: [number, number],
  destination: MapDestination,
  travelMode: TravelMode
) {
  const km = distanceKm(origin, destination);
  const speed = travelMode === "walking" ? 4.8 : travelMode === "driving" ? 32 : 24;
  const minutes = Math.max(4, Math.round((km / speed) * 60));
  const transitPrefix = travelMode === "transit" ? "Transit demo: " : "";

  return {
    route: straightLineRoute(origin, destination),
    distance: `${km.toFixed(1)} km`,
    duration: `${minutes} min`,
    steps: [
      `${transitPrefix}Start from selected start location`,
      travelMode === "walking"
        ? "Walk toward the main event corridor"
        : travelMode === "driving"
          ? "Drive toward official event access roads"
          : "Walk to the nearest transit stop",
      travelMode === "transit"
        ? "Take train or bus toward the destination district"
        : "Continue on the highlighted route",
      `Arrive at ${destination.name}`
    ]
  };
}

export function MapPage({
  initialDestination,
  setTab
}: {
  initialDestination: MapDestination | null;
  setTab: (tab: Tab) => void;
}) {
  const [userLocation, setUserLocation] = useState<[number, number]>([
    40.758,
    -73.9855
  ]);

  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [mode, setMode] = useState<TravelMode>("driving");
  const [routeError, setRouteError] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [manualStart, setManualStart] = useState("Times Square Fan Park");

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserLocation([
          pos.coords.latitude,
          pos.coords.longitude
        ]);
      },
      () => {
        console.log("Location unavailable");
        setRouteError("Location permission was denied. Choose a manual start point below or use the demo route.");
      }
    );
  }, []);

  useEffect(() => {
    if (initialDestination) {
      buildRoute(initialDestination, mode);
    }
  }, [initialDestination]);

  async function buildRoute(
    place: MapDestination,
    travelMode: TravelMode = mode,
    origin: [number, number] = userLocation
  ) {
    setSelectedPlace(place);
    setMode(travelMode);
    setRouteError("");
    setRouteLoading(true);

    if (travelMode === "transit") {
      const demo = buildDemoRoute(origin, place, travelMode);
      setRoute(demo.route);
      setSteps(demo.steps);
      setDistance(demo.distance);
      setDuration(demo.duration);
      setRouteError("Transit/train/bus routing is in demo mode. Showing an estimated in-app route.");
      setRouteLoading(false);
      return;
    }

    const profile = travelMode === "walking" ? "foot" : "car";

    const url =
      `https://router.project-osrm.org/route/v1/${profile}/` +
      `${origin[1]},${origin[0]};` +
      `${place.lng},${place.lat}` +
      `?overview=full&geometries=geojson&steps=true`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Routing service unavailable.");
      }

      const data = await response.json();

      if (!data.routes?.length) {
        throw new Error("No route found for this destination.");
      }

      const routeData = data.routes[0];

      const coordinates = routeData.geometry.coordinates.map(
        ([lng, lat]: [number, number]) =>
          [lat, lng] as [number, number]
      );

      const routeSteps =
        routeData.legs?.[0]?.steps?.map(formatStep) || [];

      setRoute(coordinates);
      setSteps(routeSteps.slice(0, 8));
      setDistance(`${(routeData.distance / 1000).toFixed(1)} km`);
      setDuration(`${Math.round(routeData.duration / 60)} min`);
    } catch (error: any) {
      const demo = buildDemoRoute(origin, place, travelMode);
      setRoute(demo.route);
      setSteps(demo.steps);
      setDistance(demo.distance);
      setDuration(demo.duration);
      setRouteError(`${error?.message || "Could not build live route."} Showing a demo route instead.`);
    } finally {
      setRouteLoading(false);
    }
  }

  function selectManualStart(name: string) {
    setManualStart(name);
    const start = defaultMapDestinations.find((place) => place.name === name);
    if (!start) return;

    const nextLocation: [number, number] = [start.lat, start.lng];
    setUserLocation(nextLocation);

    if (selectedPlace) {
      buildRoute(selectedPlace, mode, nextLocation);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setRouteError("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLocation: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude
        ];

        setUserLocation(newLocation);

        if (selectedPlace) {
          buildRoute(selectedPlace, mode, newLocation);
        }
      },
      () => {
        setRouteError("Please allow location access to use your current position.");
      }
    );
  }

  return (
    <div className="navigation-page">
      <div className="navigation-map">
        <MapContainer
          center={userLocation}
          zoom={12}
          className="real-map"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />

          <FocusMap
            destination={selectedPlace}
            userLocation={userLocation}
          />

          <Marker
            position={userLocation}
            icon={createIcon("📍")}
          >
            <Popup>Your Location</Popup>
          </Marker>

          {defaultMapDestinations.map((place) => (
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
          className="location-floating-btn"
          onClick={useMyLocation}
        >
          📍
        </button>
      </div>

      {selectedPlace ? (
        <div className="apple-nav-sheet">
          <div className="nav-drag"></div>

          <h2>
            {selectedPlace.emoji} {selectedPlace.name}
          </h2>

          <p>{selectedPlace.city}</p>

          <label className="manual-start">
            Start
            <select value={manualStart} onChange={(e) => selectManualStart(e.target.value)}>
              {defaultMapDestinations.map((place) => (
                <option key={place.name} value={place.name}>
                  {place.emoji} {place.name}
                </option>
              ))}
            </select>
          </label>

          {routeLoading && (
            <div className="route-status">Building route...</div>
          )}

          {routeError && (
            <div className="route-status error">{routeError}</div>
          )}

          <div className="travel-mode-row">
            <button
              className={`travel-mode ${
                mode === "walking" ? "active" : ""
              }`}
              disabled={routeLoading}
              onClick={() => buildRoute(selectedPlace, "walking")}
            >
              🚶 Walk
            </button>

            <button
              className={`travel-mode ${
                mode === "driving" ? "active" : ""
              }`}
              disabled={routeLoading}
              onClick={() => buildRoute(selectedPlace, "driving")}
            >
              🚗 Car
            </button>

            <button
              className={`travel-mode ${
                mode === "transit" ? "active" : ""
              }`}
              disabled={routeLoading}
              onClick={() => buildRoute(selectedPlace, "transit")}
            >
              🚆 Train
            </button>

            <button
              className={`travel-mode ${
                mode === "transit" ? "active" : ""
              }`}
              disabled={routeLoading}
              onClick={() => buildRoute(selectedPlace, "transit")}
            >
              🚌 Bus
            </button>
          </div>

          <div className="route-summary">
            <p>
              ETA: <strong>{duration}</strong>
            </p>

            <p>
              Distance: <strong>{distance}</strong>
            </p>
          </div>

          <div className="route-steps">
            <h3>Directions</h3>

            {steps.map((step, index) => (
              <div className="route-step" key={index}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>

          <button
            className="primary-btn full-width"
            onClick={() => setTab("matches")}
          >
            Use for Match Day Plan
          </button>
        </div>
      ) : (
        <div className="apple-nav-sheet compact">
          <div className="nav-drag"></div>

          <h2>Choose a destination</h2>

          <p>
            Tap a stadium, fan zone, restaurant, hotel, or place to get directions.
          </p>

          <label className="manual-start">
            Manual start
            <select value={manualStart} onChange={(e) => selectManualStart(e.target.value)}>
              {defaultMapDestinations.map((place) => (
                <option key={place.name} value={place.name}>
                  {place.emoji} {place.name}
                </option>
              ))}
            </select>
          </label>

          {routeError && (
            <div className="route-status error">{routeError}</div>
          )}
        </div>
      )}
    </div>
  );
}
