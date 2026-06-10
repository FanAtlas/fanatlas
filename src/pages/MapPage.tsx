import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import { Tab } from "../main";

type Place = {
  name: string;
  city: string;
  lat: number;
  lng: number;
  emoji: string;
};

const places: Place[] = [
  {
    name: "MetLife Stadium",
    city: "New York / New Jersey",
    lat: 40.8135,
    lng: -74.0745,
    emoji: "🏟"
  },
  {
    name: "Estadio Azteca",
    city: "Mexico City",
    lat: 19.3029,
    lng: -99.1505,
    emoji: "🏟"
  },
  {
    name: "SoFi Stadium",
    city: "Los Angeles",
    lat: 33.9535,
    lng: -118.3392,
    emoji: "🏟"
  },
  {
    name: "Times Square Fan Park",
    city: "New York",
    lat: 40.758,
    lng: -73.9855,
    emoji: "🎉"
  }
];

const createIcon = (emoji: string) =>
  L.divIcon({
    html: `<div class="real-map-marker">${emoji}</div>`,
    className: "",
    iconSize: [40, 40]
  });

export function MapPage({ setTab }: { setTab: (tab: Tab) => void }) {
  const [userLocation, setUserLocation] = useState<[number, number]>([
    40.758,
    -73.9855
  ]);

  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const [route, setRoute] = useState<[number, number][]>([]);

  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserLocation([
          pos.coords.latitude,
          pos.coords.longitude
        ]);
      },
      () => {
        console.log("Location not available");
      }
    );
  }, []);

  async function buildRoute(place: Place) {
    setSelectedPlace(place);

    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${userLocation[1]},${userLocation[0]};` +
      `${place.lng},${place.lat}` +
      `?overview=full&geometries=geojson`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes?.length) return;

    const routeData = data.routes[0];

    const coordinates = routeData.geometry.coordinates.map(
      ([lng, lat]: [number, number]) =>
        [lat, lng] as [number, number]
    );

    setRoute(coordinates);

    setDistance(
      `${(routeData.distance / 1000).toFixed(1)} km`
    );

    setDuration(
      `${Math.round(routeData.duration / 60)} min`
    );
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">
            FanAtlas <span>2026</span>
          </div>

          <div className="subtle">
            Real Navigation
          </div>
        </div>

        <div className="language-pill">
          🌐 English
        </div>
      </div>

      <button
        className="primary-btn full-width"
        onClick={() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setUserLocation([
                pos.coords.latitude,
                pos.coords.longitude
              ]);
            }
          );
        }}
      >
        📍 Use My Current Location
      </button>

      <div className="real-map-wrapper">
        <MapContainer
          center={userLocation}
          zoom={11}
          className="real-map"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />

          <Marker
            position={userLocation}
            icon={createIcon("📍")}
          >
            <Popup>Your Location</Popup>
          </Marker>

          {places.map((place) => (
            <Marker
              key={place.name}
              position={[place.lat, place.lng]}
              icon={createIcon(place.emoji)}
              eventHandlers={{
                click: () => buildRoute(place)
              }}
            >
              <Popup>{place.name}</Popup>
            </Marker>
          ))}

          {route.length > 0 && (
            <Polyline positions={route} />
          )}
        </MapContainer>
      </div>

      {selectedPlace && (
        <div className="navigation-panel">
          <h2>
            {selectedPlace.emoji} {selectedPlace.name}
          </h2>

          <p>{selectedPlace.city}</p>

          <div className="route-summary">
            <p>
              ETA: <strong>{duration}</strong>
            </p>

            <p>
              Distance: <strong>{distance}</strong>
            </p>
          </div>

          <button
            className="primary-btn full-width"
            onClick={() => setTab("matches")}
          >
            Use for Match Day Plan
          </button>
        </div>
      )}
    </>
  );
}
