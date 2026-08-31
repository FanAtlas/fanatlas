import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { ChevronDown, ChevronUp, LocateFixed, Navigation, RefreshCw, Search, X } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { useLanguage } from "../LanguageContext";
import { Tab } from "../main";
import { MapDestination, MapDestinationType } from "../mapDestinations";
import { reminderDate, scheduleNotification } from "../services/notifications";
import { useLocation } from "../LocationContext";
import { useConnectivity } from "../hooks/useConnectivity";
import { distanceKm } from "../lib/location";
import { useTravelLocation } from "../TravelLocationContext";
import { useGlobalPlaces } from "../hooks/useGlobalPlaces";
import { GlobalPlace, placeEmoji } from "../services/globalPlaces";
import {
  buildNavigationDestinationFromMapDestination,
  buildNavigationMapLinks,
  buildNavigationOrigin,
  buildNavigationRequestFromMapDestination,
  formatNavigationCoordinate,
  formatNavigationDistance,
  formatNavigationDuration,
  navigationRouteFreshnessLabel,
  navigationRouteFreshnessState,
  navigationModeCapability,
  navigationRequestToDestination,
  normalizeNavigationRouteResponse,
  type NavigationRoute,
  type NavigationMode,
  type NavigationRequest
} from "../lib/navigation";

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
  route,
  userLocation,
  destinationCenter
}: {
  destination: MapDestination | null;
  route: [number, number][];
  userLocation: [number, number] | null;
  destinationCenter: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    if (route.length > 1) {
      map.fitBounds(L.latLngBounds(route), { paddingTopLeft: [34, 34], paddingBottomRight: [34, 150] });
    } else if (destination && userLocation) {
      map.fitBounds(L.latLngBounds([userLocation, [destination.lat, destination.lng]]), { paddingTopLeft: [34, 34], paddingBottomRight: [34, 150] });
    } else if (destination) {
      map.setView([destination.lat, destination.lng], 13, { animate: true });
    } else if (userLocation) {
      map.fitBounds(L.latLngBounds([userLocation, destinationCenter]), { padding: [34, 34] });
    } else {
      map.setView(destinationCenter, 12, { animate: true });
    }
  }, [destination, destinationCenter, map, route, userLocation]);

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
  initialNavigationRequest,
  setSelectedStadium,
  setTab
}: {
  initialNavigationRequest: NavigationRequest | null;
  setSelectedStadium: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
}) {
  const { language, t } = useLanguage();
  const { location, status: locationStatus, requestLocation } = useLocation();
  const connectivity = useConnectivity();
  const { travelLocation } = useTravelLocation();
  const { groups, loading: placesLoading, message: placesMessage, refreshPlaces } = useGlobalPlaces();
  const userLocation: [number, number] | null = location
    ? [location.latitude, location.longitude]
    : null;
  const [selectedRequest, setSelectedRequest] = useState<NavigationRequest | null>(initialNavigationRequest);
  const [selectedPlace, setSelectedPlace] = useState<MapDestination | null>(null);
  const [routeSnapshot, setRouteSnapshot] = useState<NavigationRoute | null>(null);
  const [mode, setMode] = useState<NavigationMode>("driving");
  const [routeError, setRouteError] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const routeRequestId = useRef(0);

  const selectedRouteDestination = useMemo(() => navigationRequestToDestination(selectedRequest), [selectedRequest]);
  const activeDestination = selectedPlace || selectedRouteDestination;
  const route = routeSnapshot?.geometry || [];
  const distance = routeSnapshot ? formatNavigationDistance(routeSnapshot.distanceMeters || 0, language) : "";
  const duration = routeSnapshot ? formatNavigationDuration(routeSnapshot.durationSeconds || 0, language) : "";
  const routeFreshness = navigationRouteFreshnessState(routeSnapshot, {
    currentRequest: selectedRequest,
    isOnline: connectivity.isOnline
  });
  const routeFreshnessLabel = navigationRouteFreshnessLabel(routeSnapshot, {
    currentRequest: selectedRequest,
    isOnline: connectivity.isOnline
  });
  const externalLinks = activeDestination ? buildNavigationMapLinks(buildNavigationDestinationFromMapDestination(activeDestination, "manual")) : null;
  const selectedDistance = activeDestination && location ? `${distanceKm(location, activeDestination).toFixed(1)} km` : null;
  const selectedDetails = activeDestination ? destinationDetails(activeDestination, selectedDistance) : [];
  const destinationCenter: [number, number] = [travelLocation.latitude, travelLocation.longitude];
  const mapCenter: [number, number] = activeDestination
    ? [activeDestination.lat, activeDestination.lng]
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
  const showSelectedMarker = activeDestination && !filteredDestinations.some((place) => (
    place.name === activeDestination.name &&
    Math.abs(place.lat - activeDestination.lat) < 0.0001 &&
    Math.abs(place.lng - activeDestination.lng) < 0.0001
  ));
  const visibleMapDestinations = filteredDestinations.slice(0, 25);
  const placeCountLabel = `${filteredDestinations.length} ${filteredDestinations.length === 1 ? "place" : "places"}`;
  const sheetPreviewPlaces = sheetExpanded ? filteredDestinations : filteredDestinations.slice(0, 2);
  const mapStatus = placesLoading
    ? (placesMessage || `Finding places near ${travelLocation.destinationCity}...`)
    : `${travelLocation.destinationCity}, ${travelLocation.destinationCountry} · ${placeCountLabel}`;

  useEffect(() => {
    const nextPlace = initialNavigationRequest ? navigationRequestToDestination(initialNavigationRequest) : null;
    setSelectedRequest(initialNavigationRequest);
    setSelectedPlace(nextPlace);
    setMode(initialNavigationRequest?.mode || "driving");
    setRouteSnapshot(null);
    setRouteError("");
    setNotificationMessage("");
    routeRequestId.current += 1;
  }, [initialNavigationRequest]);

  async function buildRoute(
    place: MapDestination,
    travelMode: NavigationMode = mode,
    origin: [number, number] | null = userLocation
  ) {
    const request = buildNavigationRequestFromMapDestination(place, "manual", {
      mode: travelMode,
      origin: origin ? buildNavigationOrigin({ latitude: origin[0], longitude: origin[1] }, "user_location") : null
    });

    setSelectedPlace(place);
    setSelectedRequest(request);
    setMode(travelMode);
    const requestId = routeRequestId.current + 1;
    routeRequestId.current = requestId;
    setRouteError("");
    setNotificationMessage("");
    setRouteSnapshot(null);

    if (connectivity.isOffline) {
      setRouteLoading(false);
      setRouteError("Routing requires a connection.");
      return;
    }

    const capability = navigationModeCapability(travelMode);
    if (!capability.supported) {
      setRouteLoading(false);
      setRouteError(capability.reason || "Route unavailable.");
      return;
    }

    const destinationCoordinates = request.destination.coordinates;
    if (!destinationCoordinates) {
      setRouteLoading(false);
      setRouteError("Route unavailable.");
      return;
    }

    if (!origin) {
      setRouteLoading(false);
      setRouteError("Location unavailable.");
      return;
    }

    setRouteLoading(true);
    const url =
      `https://router.project-osrm.org/route/v1/${capability.profile}/` +
      `${origin[1]},${origin[0]};${destinationCoordinates.longitude},${destinationCoordinates.latitude}` +
      "?overview=full&geometries=geojson&steps=true";

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Route unavailable.");

      const data = await response.json();
      const normalized = normalizeNavigationRouteResponse(data, request);
      if (!normalized) throw new Error("Route unavailable.");

      if (requestId !== routeRequestId.current) return;
      setRouteSnapshot(normalized);
    } catch {
      if (requestId !== routeRequestId.current) return;
      setRouteError("Route unavailable.");
    } finally {
      if (requestId === routeRequestId.current) setRouteLoading(false);
    }
  }

  function selectDestination(place: MapDestination, travelMode: NavigationMode = mode) {
    buildRoute(place, travelMode);
  }

  async function useMyLocation() {
    const activeDestination = selectedPlace || selectedRouteDestination;
    if (!activeDestination) {
      setRouteError("Open a destination first.");
      return;
    }

    if (connectivity.isOffline) {
      setRouteError("Routing requires a connection.");
      return;
    }

    const explicitLocation = await requestLocation();
    if (!explicitLocation) {
      setRouteError(locationStatus === "denied"
        ? "Location permission denied."
        : locationStatus === "unsupported"
          ? "Location unavailable."
          : locationStatus === "timeout"
            ? "Location timed out."
            : "Location unavailable.");
      return;
    }

    await buildRoute(activeDestination, mode, [explicitLocation.latitude, explicitLocation.longitude]);
  }

  function clearRoute() {
    setSelectedPlace(null);
    setSelectedRequest(null);
    setRouteSnapshot(null);
    setRouteError("");
    setNotificationMessage("");
    routeRequestId.current += 1;
  }

  async function addStadiumArrivalReminder() {
    if (!activeDestination || activeDestination.type !== "stadium") return;

    const { permission } = await scheduleNotification({
      type: "stadium-arrival",
      title: `Stadium arrival: ${activeDestination.name}`,
      message: `Leave early for ${activeDestination.name}. Recheck route, gate, bag policy, and ticket QR before arrival.`,
      dueAt: reminderDate(90),
      source: "Map",
      actionTab: "map"
    });

    setNotificationMessage(
      permission === "denied"
        ? "Stadium arrival reminder saved in FanAtlas. Browser notifications are blocked."
        : `Stadium arrival reminder saved for ${activeDestination.name}.`
    );
  }

  function openStadiumPage() {
    if (!activeDestination || activeDestination.type !== "stadium") return;
    setSelectedStadium(activeDestination);
    setTab("stadium");
  }

  return (
    <div className="map-hub-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="map-hub-topbar">
        <BackButton />
        <div className="map-title-lockup" aria-live="polite">
          <strong>{travelLocation.destinationCity}</strong>
          <span>{travelLocation.destinationCountry}</span>
        </div>
        <button
          className="map-topbar-action"
          type="button"
          onClick={() => setTab("travelLocation")}
          aria-label="Change destination"
          title="Change destination"
        >
          Change destination
        </button>
      </div>

      <section className="map-search-panel" aria-label="Map search and filters">
        <div className="map-search">
          <Search size={17} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search hotels, restaurants, attractions..."
            aria-label="Search nearby places"
          />
          {search && (
            <button
              className="map-search-clear"
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="map-category-row" aria-label="Place category filters">
          {categoryFilters.map((item) => (
            <button
              key={item}
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
              type="button"
              aria-pressed={category === item}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {connectivity.isOffline && (
        <div className="fa-inline-message" role="status">
          <strong>{t.offline}</strong>
          <span>{t.offlineRouting} {t.offlineMapTiles}</span>
        </div>
      )}

      <div className="map-preview-card">
          <MapContainer center={mapCenter} zoom={activeDestination ? 13 : 12} className="map-hub-leaflet">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />

          <FitPreview
            destination={activeDestination}
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
            <Marker position={[activeDestination.lat, activeDestination.lng]} icon={createIcon(activeDestination.emoji)}>
              <Popup>{activeDestination.name}</Popup>
            </Marker>
          )}

          {route.length > 0 && routeFreshness === "fresh" && (
            <>
              <Polyline positions={route} />
            </>
          )}
        </MapContainer>

        <div className="map-floating-controls" aria-label="Map controls">
          <button type="button" onClick={useMyLocation} aria-label="Use my location" title="Use my location">
            <LocateFixed size={18} />
          </button>
          <button type="button" onClick={refreshPlaces} aria-label="Refresh nearby places" title="Refresh places">
            <RefreshCw size={18} />
          </button>
          {activeDestination && (
            <button
              type="button"
              onClick={() => buildRoute(activeDestination, mode)}
              disabled={routeLoading}
              aria-label="Rebuild route to selected place"
              title="Route"
            >
              <Navigation size={18} />
            </button>
          )}
        </div>

        <div className="map-status-pill" role="status">
          <span>{mapStatus}</span>
          {locationStatus === "available" && <small>Current location on map</small>}
        </div>

        {activeDestination && (
          <section className="map-route-overlay" aria-label="Route summary">
            <div className="selected-destination-row compact">
              <span>{activeDestination.emoji}</span>
              <div>
                <strong>{activeDestination.name}</strong>
                <p>{categoryLabel(activeDestination.type)} · {navigationModeCapability(mode).label}</p>
              </div>
            </div>
            {selectedRequest?.destination.coordinates && (
              <p className="map-destination-coordinates" dir="ltr">
                {formatNavigationCoordinate(selectedRequest.destination.coordinates.latitude, language)}, {formatNavigationCoordinate(selectedRequest.destination.coordinates.longitude, language)}
              </p>
            )}

            {routeLoading && <div className="route-status">Building route preview...</div>}
            {!routeLoading && routeFreshnessLabel && <div className={`route-status ${routeFreshness === "stale" ? "warning" : ""}`}>{routeFreshnessLabel}</div>}
            {routeError && <div className="route-status error">{routeError}</div>}

            {distance && duration && (
              <div className="route-summary compact">
                <p><span>Distance</span><strong>{distance}</strong></p>
                <p><span>ETA</span><strong>{duration}</strong></p>
              </div>
            )}

            <div className="travel-mode-row compact">
              {(["walking", "driving", "cycling", "transit"] as NavigationMode[]).map((travelMode) => {
                const capability = navigationModeCapability(travelMode);
                return (
                  <button
                    key={travelMode}
                    className={`travel-mode ${mode === travelMode ? "active" : ""}`}
                    disabled={routeLoading || !capability.supported}
                    onClick={() => buildRoute(activeDestination, travelMode)}
                    title={capability.supported ? capability.label : capability.reason || "Not supported"}
                  >
                    {capability.label}
                  </button>
                );
              })}
            </div>

            <div className="map-route-actions">
              <button type="button" onClick={clearRoute}>Clear</button>
              <button type="button" onClick={() => setTab("matches")}>Match plan</button>
            </div>
          </section>
        )}
      </div>

      {notificationMessage && <div className="route-status">{notificationMessage}</div>}
      {!placesLoading && placesMessage && (
        <div className="location-fallback">
          {placesMessage}
          {placesMessage.includes("Finding live places") && <button className="places-retry-btn" onClick={refreshPlaces}>Try Again</button>}
        </div>
      )}

      <section className={`nearby-bottom-sheet ${sheetExpanded ? "expanded" : "collapsed"}`}>
        <button
          className="nearby-sheet-header"
          type="button"
          onClick={() => setSheetExpanded((expanded) => !expanded)}
          aria-expanded={sheetExpanded}
        >
          <span className="nearby-sheet-handle" aria-hidden="true" />
          <span>
            <strong>Nearby places</strong>
            <small>{placeCountLabel} · {category}</small>
          </span>
          {sheetExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>

        <div className="destination-list">
          {filteredDestinations.length === 0 && (
            <div className="card-dark">
              <strong>{travelLocation.destinationCity} map tools are ready.</strong>
              <p className="subtle">Use search, SOS, and destination tools while live map places refresh.</p>
              <button className="places-retry-btn" onClick={refreshPlaces}>Try Again</button>
            </div>
          )}

          {sheetPreviewPlaces.map((place) => {
            const km = distanceKm({ latitude: travelLocation.latitude, longitude: travelLocation.longitude }, place);

            return (
              <button
                className={`destination-card ${activeDestination?.name === place.name ? "active" : ""}`}
                key={`${place.type}-${place.name}`}
                onClick={() => selectDestination(place, mode)}
                type="button"
              >
                <span className="destination-icon">{place.emoji}</span>
                <span className="destination-copy">
                  <strong>{place.name}</strong>
                  <small>
                    {categoryLabel(place.type)} · {place.city}
                    {place.safetyNotes?.includes("Starter travel card") ? " · Search suggestion" : ""}
                  </small>
                </span>
                <span className="destination-distance">{km.toFixed(1)} km</span>
              </button>
            );
          })}
        </div>

        {activeDestination && sheetExpanded && (
          <div className="nearby-selected-details">
            {activeDestination.type === "stadium" && (
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
                <p>This is a planning preview. Open the destination in Apple Maps, Google Maps, or Waze for external navigation.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
