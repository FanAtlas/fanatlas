import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { Search } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { useLanguage } from "../LanguageContext";
import { Tab } from "../main";
import { defaultMapDestinations, MapDestination, MapDestinationType } from "../mapDestinations";
import { reminderDate, scheduleNotification } from "../services/notifications";
import { useLocation } from "../LocationContext";
import { distanceKm } from "../lib/location";

type TravelMode = "walking" | "driving" | "transit" | "rideshare";
type CategoryFilter = "All" | "Stadiums" | "Hotels" | "Restaurants" | "Fan Zones" | "Hospitals" | "Embassies";

const categoryFilters: CategoryFilter[] = [
  "All",
  "Stadiums",
  "Hotels",
  "Restaurants",
  "Fan Zones",
  "Hospitals",
  "Embassies"
];

const categoryTypeMap: Record<Exclude<CategoryFilter, "All">, MapDestinationType[]> = {
  Stadiums: ["stadium"],
  Hotels: ["hotel"],
  Restaurants: ["restaurant", "cafe"],
  "Fan Zones": ["fan-zone"],
  Hospitals: ["hospital"],
  Embassies: ["embassy", "police"]
};

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
      map.fitBounds(L.latLngBounds(route), { padding: [34, 34] });
    }
  }, [route, map]);

  return null;
}

function FocusMap({
  destination,
  userLocation,
  focusRequest
}: {
  destination: MapDestination | null;
  userLocation: [number, number] | null;
  focusRequest: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (destination) {
      map.setView([destination.lat, destination.lng], 13, { animate: true });
    } else if (userLocation) {
      map.setView(userLocation, 11, { animate: true });
    }
  }, [destination, focusRequest, map, userLocation]);

  return null;
}

function hasDestinationMarker(destination: MapDestination | null) {
  if (!destination) return true;

  return defaultMapDestinations.some((place) => (
    place.name === destination.name &&
    Math.abs(place.lat - destination.lat) < 0.0001 &&
    Math.abs(place.lng - destination.lng) < 0.0001
  ));
}

function formatStep(step: any) {
  const type = step.maneuver?.type || "Continue";
  const modifier = step.maneuver?.modifier ? ` ${step.maneuver.modifier}` : "";
  const street = step.name ? ` on ${step.name}` : "";
  return `${type}${modifier}${street}`;
}

function categoryLabel(type: MapDestinationType) {
  if (type === "fan-zone") return "Fan Zone";
  if (type === "cafe") return "Restaurant";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function mapLinks(destination: MapDestination) {
  const encodedLatLng = encodeURIComponent(`${destination.lat},${destination.lng}`);

  return {
    apple: `https://maps.apple.com/?daddr=${encodedLatLng}`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${encodedLatLng}`,
    waze: `https://waze.com/ul?ll=${encodedLatLng}&navigate=yes`
  };
}

export function MapPage({
  initialDestination,
  setSelectedStadium,
  setTab
}: {
  initialDestination: MapDestination | null;
  setSelectedStadium: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
}) {
  const { language } = useLanguage();
  const { location, status: locationStatus } = useLocation();
  const userLocation: [number, number] | null = location
    ? [location.latitude, location.longitude]
    : null;
  const [focusRequest, setFocusRequest] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<MapDestination | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [mode, setMode] = useState<TravelMode>("driving");
  const [routeError, setRouteError] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const routeRequestId = useRef(0);

  const showSelectedMarker = selectedPlace && !hasDestinationMarker(selectedPlace);
  const externalLinks = selectedPlace ? mapLinks(selectedPlace) : null;
  const mapCenter: [number, number] = selectedPlace
    ? [selectedPlace.lat, selectedPlace.lng]
    : userLocation || [39.8283, -98.5795];

  const filteredDestinations = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return defaultMapDestinations.filter((place) => {
      const matchesCategory = category === "All" || categoryTypeMap[category].includes(place.type);
      const matchesSearch = !normalizedQuery ||
        `${place.name} ${place.city} ${categoryLabel(place.type)}`.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      if (!location) return 0;
      return distanceKm(location, a) - distanceKm(location, b);
    });
  }, [category, location, search]);

  useEffect(() => {
    if (initialDestination) {
      selectDestination(initialDestination, mode);
    } else {
      setSelectedPlace(null);
      setRoute([]);
      setSteps([]);
      setDistance("");
      setDuration("");
      setRouteError("");
    }
  }, [initialDestination]);

  async function buildRoute(
    place: MapDestination,
    travelMode: TravelMode = mode,
    origin: [number, number] | null = userLocation
  ) {
    setSelectedPlace(place);
    setMode(travelMode);
    const requestId = routeRequestId.current + 1;
    routeRequestId.current = requestId;
    setRouteError("");
    setNotificationMessage("");
    setRoute([]);
    setSteps([]);
    setDistance("");
    setDuration("");

    if (travelMode === "transit" || travelMode === "rideshare") {
      setRouteLoading(false);
      setRouteError(`${travelMode === "transit" ? "Transit" : "Rideshare"} preview is a placeholder. Open turn-by-turn navigation in your preferred maps app.`);
      return;
    }

    if (!origin) {
      setRouteLoading(false);
      setRouteError("Location disabled. Enable location for route previews.");
      return;
    }

    setRouteLoading(true);
    const profile = travelMode === "walking" ? "foot" : "car";
    const url =
      `https://router.project-osrm.org/route/v1/${profile}/` +
      `${origin[1]},${origin[0]};${place.lng},${place.lat}` +
      "?overview=full&geometries=geojson&steps=true";

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Route preview unavailable.");

      const data = await response.json();
      if (!data.routes?.length) throw new Error("Route preview unavailable.");

      const routeData = data.routes[0];
      const coordinates = routeData.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
      );
      const routeSteps = routeData.legs?.[0]?.steps?.map(formatStep) || [];

      if (requestId !== routeRequestId.current) return;
      setRoute(coordinates);
      setSteps(routeSteps.slice(0, 8));
      setDistance(`${(routeData.distance / 1000).toFixed(1)} km`);
      setDuration(`${Math.round(routeData.duration / 60)} min`);
    } catch {
      if (requestId !== routeRequestId.current) return;
      setRouteError("Route preview unavailable. Open your preferred map app for directions.");
    } finally {
      if (requestId === routeRequestId.current) setRouteLoading(false);
    }
  }

  function selectDestination(place: MapDestination, travelMode: TravelMode = mode) {
    setSelectedPlace(place);
    buildRoute(place, travelMode);
  }

  function useMyLocation() {
    if (!userLocation) {
      setRouteError("Enable location for nearby recommendations.");
      return;
    }

    setSelectedPlace(null);
    setRoute([]);
    setSteps([]);
    setFocusRequest((request) => request + 1);
  }

  async function addStadiumArrivalReminder() {
    if (!selectedPlace || selectedPlace.type !== "stadium") return;

    const { permission } = await scheduleNotification({
      type: "stadium-arrival",
      title: `Stadium arrival: ${selectedPlace.name}`,
      message: `Leave early for ${selectedPlace.name}. Recheck route, gate, bag policy, and ticket QR before arrival.`,
      dueAt: reminderDate(90),
      source: "Map",
      actionTab: "map"
    });

    setNotificationMessage(
      permission === "denied"
        ? "Stadium arrival reminder saved in FanAtlas. Browser notifications are blocked."
        : `Stadium arrival reminder saved for ${selectedPlace.name}.`
    );
  }

  function openStadiumPage() {
    if (!selectedPlace || selectedPlace.type !== "stadium") return;
    setSelectedStadium(selectedPlace);
    setTab("stadium");
  }

  return (
    <div className="map-hub-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="map-hub-topbar">
        <BackButton />
      </div>

      <header className="map-hub-header">
        <span>FanAtlas Map</span>
        <h1>Smart Directions</h1>
        <p>Preview routes in FanAtlas, then open turn-by-turn navigation in your preferred maps app.</p>
      </header>

      <div className="map-location-status">
        <span>
          {locationStatus === "available"
            ? "Using your current location"
            : "Enable location for nearby recommendations."}
        </span>
        <button type="button" onClick={useMyLocation}>Use My Location</button>
      </div>

      <div className="map-preview-card">
        <MapContainer center={mapCenter} zoom={selectedPlace ? 13 : 3} className="map-hub-leaflet">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />

          <FocusMap destination={selectedPlace} userLocation={userLocation} focusRequest={focusRequest} />

          {userLocation && (
            <Marker position={userLocation} icon={createIcon("📍")}>
              <Popup>Your location</Popup>
            </Marker>
          )}

          {defaultMapDestinations.map((place) => (
            <Marker
              key={`${place.type}-${place.name}`}
              position={[place.lat, place.lng]}
              icon={createIcon(place.emoji)}
              eventHandlers={{ click: () => selectDestination(place, mode) }}
            >
              <Popup>{place.name}</Popup>
            </Marker>
          ))}

          {showSelectedMarker && (
            <Marker position={[selectedPlace.lat, selectedPlace.lng]} icon={createIcon(selectedPlace.emoji)}>
              <Popup>{selectedPlace.name}</Popup>
            </Marker>
          )}

          {route.length > 0 && (
            <>
              <Polyline positions={route} />
              <FitRoute route={route} />
            </>
          )}
        </MapContainer>
      </div>

      {selectedPlace && (
        <section className="route-preview-panel">
          <div className="selected-destination-row">
            <span>{selectedPlace.emoji}</span>
            <div>
              <strong>{selectedPlace.name}</strong>
              <p>{categoryLabel(selectedPlace.type)} · {selectedPlace.city}</p>
            </div>
          </div>

          {routeLoading && <div className="route-status">Building route preview...</div>}
          {routeError && <div className="route-status error">{routeError}</div>}
          {notificationMessage && <div className="route-status">{notificationMessage}</div>}

          <div className="travel-mode-row">
            <button
              className={`travel-mode ${mode === "walking" ? "active" : ""}`}
              disabled={routeLoading}
              onClick={() => buildRoute(selectedPlace, "walking")}
            >
              Walk
            </button>
            <button
              className={`travel-mode ${mode === "driving" ? "active" : ""}`}
              disabled={routeLoading}
              onClick={() => buildRoute(selectedPlace, "driving")}
            >
              Drive
            </button>
            <button
              className={`travel-mode ${mode === "transit" ? "active" : ""}`}
              disabled={routeLoading}
              onClick={() => buildRoute(selectedPlace, "transit")}
            >
              Transit
            </button>
            <button
              className={`travel-mode ${mode === "rideshare" ? "active" : ""}`}
              disabled={routeLoading}
              onClick={() => buildRoute(selectedPlace, "rideshare")}
            >
              Rideshare
            </button>
          </div>

          <div className="route-summary">
            <p>ETA: <strong>{duration || "Preview unavailable"}</strong></p>
            <p>Distance: <strong>{distance || (userLocation ? "Preview unavailable" : "Enable location")}</strong></p>
          </div>

          {selectedPlace.type === "stadium" && (
            <div className="map-stadium-actions">
              <button className="secondary-btn" onClick={openStadiumPage}>View Stadium Page</button>
              <button className="secondary-btn" onClick={addStadiumArrivalReminder}>Add stadium arrival reminder</button>
            </div>
          )}

          {externalLinks && (
            <div className="external-map-actions">
              <a href={externalLinks.apple} target="_blank" rel="noopener noreferrer">Apple Maps</a>
              <a href={externalLinks.google} target="_blank" rel="noopener noreferrer">Google Maps</a>
              <a href={externalLinks.waze} target="_blank" rel="noopener noreferrer">Waze</a>
            </div>
          )}

          {steps.length > 0 && (
            <div className="route-steps">
              <h3>Preview route in FanAtlas</h3>
              {steps.map((step, index) => (
                <div className="route-step" key={index}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          )}

          <button className="primary-btn full-width" onClick={() => setTab("matches")}>
            Use for match day plan
          </button>
        </section>
      )}

      <section className="destination-hub">
        <div className="map-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search stadiums, hotels, restaurants, fan zones..."
          />
        </div>

        <div className="map-category-row">
          {categoryFilters.map((item) => (
            <button
              key={item}
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="destination-list">
          {filteredDestinations.map((place) => {
            const km = location ? distanceKm(location, place) : null;

            return (
              <button
                className={`destination-card ${selectedPlace?.name === place.name ? "active" : ""}`}
                key={`${place.type}-${place.name}`}
                onClick={() => selectDestination(place, mode)}
                type="button"
              >
                <span className="destination-icon">{place.emoji}</span>
                <span className="destination-copy">
                  <strong>{place.name}</strong>
                  <small>{categoryLabel(place.type)} · {place.city}</small>
                </span>
                {km !== null && <span className="destination-distance">{km.toFixed(1)} km</span>}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
