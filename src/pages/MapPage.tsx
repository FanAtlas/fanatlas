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
import { useLanguage } from "../LanguageContext";
import { Tab } from "../main";
import { defaultMapDestinations, MapDestination } from "../mapDestinations";
import { reminderDate, scheduleNotification } from "../services/notifications";

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
      map.setView(userLocation, 4, { animate: true });
    }
  }, [destination, map, userLocation]);

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
  travelMode: TravelMode,
  labels: {
    routeStart: string;
    walkCorridor: string;
    driveAccessRoads: string;
    walkTransitStop: string;
    transitRide: string;
    continueRoute: string;
    arriveAt: string;
  }
) {
  const km = distanceKm(origin, destination);
  const speed = travelMode === "walking" ? 4.8 : travelMode === "driving" ? 32 : 24;
  const minutes = Math.max(4, Math.round((km / speed) * 60));
  const transitPrefix = travelMode === "transit" ? "Transit estimate: " : "";

  return {
    route: straightLineRoute(origin, destination),
    distance: `${km.toFixed(1)} km`,
    duration: `${minutes} min`,
    steps: [
      `${transitPrefix}${labels.routeStart}`,
      travelMode === "walking"
        ? labels.walkCorridor
        : travelMode === "driving"
          ? labels.driveAccessRoads
          : labels.walkTransitStop,
      travelMode === "transit"
        ? labels.transitRide
        : labels.continueRoute,
      `${labels.arriveAt} ${destination.name}`
    ]
  };
}

function mapLinks(destination: MapDestination) {
  const query = encodeURIComponent(`${destination.name} ${destination.city}`);
  const latLng = `${destination.lat},${destination.lng}`;
  const encodedLatLng = encodeURIComponent(latLng);

  return {
    apple: `https://maps.apple.com/?q=${query}&ll=${encodedLatLng}`,
    google: `https://www.google.com/maps/search/?api=1&query=${encodedLatLng}`,
    waze: `https://www.waze.com/ul?ll=${encodedLatLng}&q=${query}&navigate=yes`
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
  const { language, t } = useLanguage();
  const [userLocation, setUserLocation] = useState<[number, number]>([
    39.8283,
    -98.5795
  ]);

  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [mode, setMode] = useState<TravelMode>("driving");
  const [routeError, setRouteError] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [manualStart, setManualStart] = useState("Times Square Fan Park");
  const showSelectedMarker = selectedPlace && !hasDestinationMarker(selectedPlace);
  const externalLinks = selectedPlace ? mapLinks(selectedPlace) : null;

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
        setRouteError(t.locationDenied);
      }
    );
  }, [t.locationDenied]);

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
      const demo = buildDemoRoute(origin, place, travelMode, t);
      setRoute(demo.route);
      setSteps(demo.steps);
      setDistance(demo.distance);
      setDuration(demo.duration);
      setRouteError(t.transitDemo);
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
        throw new Error(t.routingUnavailable);
      }

      const data = await response.json();

      if (!data.routes?.length) {
        throw new Error(t.noRouteFound);
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
      const demo = buildDemoRoute(origin, place, travelMode, t);
      setRoute(demo.route);
      setSteps(demo.steps);
      setDistance(demo.distance);
      setDuration(demo.duration);
      setRouteError(`${error?.message || t.routingUnavailable} ${t.demoRouteSuffix}`);
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
      setRouteError(t.geolocationUnsupported);
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
        setRouteError(t.allowLocation);
      }
    );
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
    <div className="navigation-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="navigation-map">
        <MapContainer
          center={userLocation}
          zoom={initialDestination ? 14 : 4}
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
            <Popup>{t.yourLocation}</Popup>
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

          {showSelectedMarker && (
            <Marker
              position={[selectedPlace.lat, selectedPlace.lng]}
              icon={createIcon(selectedPlace.emoji)}
            >
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
            {t.start}
            <select value={manualStart} onChange={(e) => selectManualStart(e.target.value)}>
              {defaultMapDestinations.map((place) => (
                <option key={place.name} value={place.name}>
                  {place.emoji} {place.name}
                </option>
              ))}
            </select>
          </label>

          {routeLoading && (
            <div className="route-status">{t.buildingRoute}</div>
          )}

          {routeError && (
            <div className="route-status error">{routeError}</div>
          )}

          {notificationMessage && (
            <div className="route-status">{notificationMessage}</div>
          )}

          <div className="travel-mode-row">
            <button
              className={`travel-mode ${
                mode === "walking" ? "active" : ""
              }`}
              disabled={routeLoading}
              onClick={() => buildRoute(selectedPlace, "walking")}
            >
              🚶 {t.walk}
            </button>

            <button
              className={`travel-mode ${
                mode === "driving" ? "active" : ""
              }`}
              disabled={routeLoading}
              onClick={() => buildRoute(selectedPlace, "driving")}
            >
              🚗 {t.car}
            </button>

            <button
              className={`travel-mode ${
                mode === "transit" ? "active" : ""
              }`}
              disabled={routeLoading}
              onClick={() => buildRoute(selectedPlace, "transit")}
            >
              🚆 {t.train}
            </button>

            <button
              className={`travel-mode ${
                mode === "transit" ? "active" : ""
              }`}
              disabled={routeLoading}
              onClick={() => buildRoute(selectedPlace, "transit")}
            >
              🚌 {t.bus}
            </button>
          </div>

          <div className="route-summary">
            <p>
              {t.eta}: <strong>{duration}</strong>
            </p>

            <p>
              {t.distance}: <strong>{distance}</strong>
            </p>
          </div>

          {selectedPlace.type === "stadium" && (
            <div className="map-stadium-actions">
              <button className="secondary-btn" onClick={openStadiumPage}>
                View Stadium Page
              </button>
              <button className="secondary-btn" onClick={addStadiumArrivalReminder}>
                Add stadium arrival reminder
              </button>
            </div>
          )}

          {externalLinks && (
            <div className="external-map-actions">
              <a href={externalLinks.apple} target="_blank" rel="noopener noreferrer">
                Apple Maps
              </a>
              <a href={externalLinks.google} target="_blank" rel="noopener noreferrer">
                Google Maps
              </a>
              <a href={externalLinks.waze} target="_blank" rel="noopener noreferrer">
                Waze
              </a>
            </div>
          )}

          <div className="route-steps">
            <h3>{t.directions}</h3>

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
            {t.useForMatchDayPlan}
          </button>
        </div>
      ) : (
        <div className="apple-nav-sheet compact">
          <div className="nav-drag"></div>

          <h2>{t.chooseDestination}</h2>

          <p>{t.chooseDestinationDesc}</p>

          <label className="manual-start">
            {t.manualStart}
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
