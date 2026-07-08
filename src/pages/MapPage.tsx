import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { Search } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { useLanguage } from "../LanguageContext";
import { Tab } from "../main";
import { MapDestination, MapDestinationType } from "../mapDestinations";
import { reminderDate, scheduleNotification } from "../services/notifications";
import { useLocation } from "../LocationContext";
import { distanceKm } from "../lib/location";
import { useTravelLocation } from "../TravelLocationContext";
import { useGlobalPlaces } from "../hooks/useGlobalPlaces";
import { GlobalPlace, placeEmoji } from "../services/globalPlaces";

type TravelMode = "walking" | "driving";
type CategoryFilter = "All" | "Hotels" | "Restaurants" | "Attractions" | "Transport" | "SOS";

const categoryFilters: CategoryFilter[] = [
  "All",
  "Hotels",
  "Restaurants",
  "Attractions",
  "Transport",
  "SOS"
];

const createIcon = (emoji: string) =>
  L.divIcon({
    html: `<div class="real-map-marker">${emoji}</div>`,
    className: "",
    iconSize: [40, 40]
  });

function FitPreview({
  destination,
  focusRequest,
  route,
  userLocation,
  destinationCenter
}: {
  destination: MapDestination | null;
  focusRequest: number;
  route: [number, number][];
  userLocation: [number, number] | null;
  destinationCenter: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    if (route.length > 1) {
      map.fitBounds(L.latLngBounds(route), { padding: [34, 34] });
    } else if (destination && userLocation) {
      map.fitBounds(L.latLngBounds([userLocation, [destination.lat, destination.lng]]), { padding: [34, 34] });
    } else if (destination) {
      map.setView([destination.lat, destination.lng], 13, { animate: true });
    } else {
      map.setView(destinationCenter, 12, { animate: true });
    }
  }, [destination, destinationCenter, focusRequest, map, route, userLocation]);

  return null;
}

function categoryLabel(type: MapDestinationType) {
  if (type === "fan-zone") return "Fan Zone";
  if (type === "cafe") return "Restaurant";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function destinationDetails(destination: MapDestination, nearbyDistance: string | null) {
  const crowdByType: Partial<Record<MapDestinationType, string>> = {
    stadium: "High on match days",
    "fan-zone": "High during live matches",
    restaurant: "Moderate to high at meal times",
    cafe: "Moderate",
    hotel: "Low to moderate",
    hospital: "Emergency services",
    police: "Emergency services",
    embassy: "Appointment recommended",
    place: "Varies by time of day"
  };

  const safetyByType: Partial<Record<MapDestinationType, string>> = {
    stadium: "Arrive early, check bag policy, and confirm your gate before leaving.",
    "fan-zone": "Set a meetup point and expect crowding near screens after matches.",
    restaurant: "Reserve ahead and confirm late-night transportation before dining.",
    cafe: "Keep bags close in busy areas.",
    hotel: "Confirm check-in details and route before match day.",
    hospital: "Call emergency services first for urgent medical help.",
    police: "Use official emergency numbers for immediate safety issues.",
    embassy: "Check official hours and bring identification.",
    place: "Use well-lit routes and check local conditions before going."
  };

  return [
    { label: "Address", value: destination.address || destination.city },
    { label: "Distance", value: nearbyDistance },
    { label: "Opening hours", value: destination.openingHours },
    { label: "Crowd level", value: destination.crowdLevel || crowdByType[destination.type] },
    { label: "Safety notes", value: destination.safetyNotes || safetyByType[destination.type] }
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));
}

function mapLinks(destination: MapDestination) {
  const encodedLatLng = encodeURIComponent(`${destination.lat},${destination.lng}`);

  return {
    apple: `https://maps.apple.com/?daddr=${encodedLatLng}`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${encodedLatLng}`,
    waze: `https://waze.com/ul?ll=${encodedLatLng}&navigate=yes`
  };
}

function globalPlaceDestination(place: GlobalPlace): MapDestination {
  return {
    name: place.name,
    city: place.city,
    lat: place.lat,
    lng: place.lng,
    emoji: placeEmoji(place.category),
    type: place.category === "hotel" ? "hotel" :
      place.category === "restaurant" ? "restaurant" :
      place.category === "hospital" ? "hospital" :
      place.category === "police" ? "police" :
      place.category === "embassy" ? "embassy" :
      "place",
    address: place.address,
    openingHours: place.detail,
    safetyNotes: place.source === "openstreetmap"
      ? "OpenStreetMap community place data. Verify critical details before travel."
      : "Starter travel card. Live map places refresh in the background."
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
  const { travelLocation } = useTravelLocation();
  const { groups, loading: placesLoading, message: placesMessage, refreshPlaces } = useGlobalPlaces();
  const userLocation: [number, number] | null = location
    ? [location.latitude, location.longitude]
    : null;
  const [focusRequest, setFocusRequest] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<MapDestination | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [mode, setMode] = useState<TravelMode>("driving");
  const [routeError, setRouteError] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const routeRequestId = useRef(0);

  const externalLinks = selectedPlace ? mapLinks(selectedPlace) : null;
  const selectedDistance = selectedPlace && location ? `${distanceKm(location, selectedPlace).toFixed(1)} km` : null;
  const selectedDetails = selectedPlace ? destinationDetails(selectedPlace, selectedDistance) : [];
  const destinationCenter: [number, number] = [travelLocation.latitude, travelLocation.longitude];
  const mapCenter: [number, number] = selectedPlace
    ? [selectedPlace.lat, selectedPlace.lng]
    : destinationCenter;

  const filteredDestinations = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    const byCategory = category === "Hotels" ? groups.hotels :
      category === "Restaurants" ? groups.restaurants :
      category === "Attractions" ? groups.attractions :
      category === "Transport" ? groups.transport :
      category === "SOS" ? groups.sos :
      [...groups.hotels, ...groups.restaurants, ...groups.attractions, ...groups.transport, ...groups.sos];

    return byCategory.map(globalPlaceDestination).filter((place) => {
      const matchesSearch = !normalizedQuery ||
        `${place.name} ${place.city} ${categoryLabel(place.type)}`.toLowerCase().includes(normalizedQuery);

      return matchesSearch;
    }).sort((a, b) => {
      const origin = { latitude: travelLocation.latitude, longitude: travelLocation.longitude };
      return distanceKm(origin, a) - distanceKm(origin, b);
    });
  }, [category, groups.attractions, groups.hotels, groups.restaurants, groups.sos, groups.transport, search, travelLocation.latitude, travelLocation.longitude]);
  const showSelectedMarker = selectedPlace && !filteredDestinations.some((place) => (
    place.name === selectedPlace.name &&
    Math.abs(place.lat - selectedPlace.lat) < 0.0001 &&
    Math.abs(place.lng - selectedPlace.lng) < 0.0001
  ));
  const visibleMapDestinations = filteredDestinations.slice(0, 25);

  useEffect(() => {
    if (initialDestination) {
      selectDestination(initialDestination, mode);
    } else {
      setSelectedPlace(null);
      setRoute([]);
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
    setDistance("");
    setDuration("");

    if (!origin) {
      setRouteLoading(false);
      setRouteError("Route preview unavailable.");
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
      if (
        typeof routeData.distance !== "number" ||
        typeof routeData.duration !== "number" ||
        !routeData.geometry?.coordinates?.length
      ) {
        throw new Error("Route preview unavailable.");
      }

      const coordinates = routeData.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
      );

      if (requestId !== routeRequestId.current) return;
      setRoute(coordinates);
      setDistance(`${(routeData.distance / 1000).toFixed(1)} km`);
      setDuration(`${Math.round(routeData.duration / 60)} min`);
    } catch {
      if (requestId !== routeRequestId.current) return;
      setRouteError("Route preview unavailable.");
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
    setDistance("");
    setDuration("");
    setRouteError("");
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
        <h1>Route Preview</h1>
        <p>Plan the trip in FanAtlas, then open turn-by-turn navigation in Apple Maps, Google Maps, or Waze.</p>
      </header>

      <div className="map-location-status">
        <span>
          Showing {travelLocation.destinationCity}, {travelLocation.destinationCountry}
          {locationStatus === "available" ? " with your current location marker." : "."}
        </span>
        <button type="button" onClick={() => setTab("travelLocation")}>Change</button>
      </div>
      {placesLoading && <div className="location-fallback">{placesMessage || `Finding live places near ${travelLocation.destinationCity}...`}</div>}
      {!placesLoading && placesMessage && (
        <div className="location-fallback">
          {placesMessage}
          {placesMessage.includes("Finding live places") && <button className="places-retry-btn" onClick={refreshPlaces}>Try Again</button>}
        </div>
      )}

      <div className="map-preview-card">
        <MapContainer center={mapCenter} zoom={selectedPlace ? 13 : 12} className="map-hub-leaflet">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />

          <FitPreview
            destination={selectedPlace}
            focusRequest={focusRequest}
            route={route}
            userLocation={userLocation}
            destinationCenter={destinationCenter}
          />

          {userLocation && (
            <Marker position={userLocation} icon={createIcon("📍")}>
              <Popup>Your location</Popup>
            </Marker>
          )}

          <Marker position={destinationCenter} icon={createIcon("📌")}>
            <Popup>{travelLocation.destinationCity}, {travelLocation.destinationCountry}</Popup>
          </Marker>

          {visibleMapDestinations.map((place) => (
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
              Walking
            </button>
            <button
              className={`travel-mode ${mode === "driving" ? "active" : ""}`}
              disabled={routeLoading}
              onClick={() => buildRoute(selectedPlace, "driving")}
            >
              Driving
            </button>
          </div>

          {distance && duration && (
            <div className="route-summary">
              <p>Distance <strong>{distance}</strong></p>
              <p>ETA <strong>{duration}</strong></p>
            </div>
          )}

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

          <div className="map-info-grid">
            {selectedDetails.map((item) => (
              <div className="map-info-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          {route.length > 0 && (
            <div className="route-note-card">
              <strong>Preview route in FanAtlas</strong>
              <p>This is a planning preview. Use Apple Maps, Google Maps, or Waze for live navigation, traffic, closures, and rerouting.</p>
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
            placeholder="Search hotels, restaurants, attractions, transport, SOS..."
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
          {filteredDestinations.length === 0 && (
            <div className="card-dark">
              <strong>{travelLocation.destinationCity} map tools are ready.</strong>
              <p className="subtle">Use search, SOS, and destination tools while live map places refresh.</p>
              <button className="places-retry-btn" onClick={refreshPlaces}>Try Again</button>
            </div>
          )}

          {filteredDestinations.map((place) => {
            const km = distanceKm({ latitude: travelLocation.latitude, longitude: travelLocation.longitude }, place);

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
                <span className="destination-distance">{km.toFixed(1)} km</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
