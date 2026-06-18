import { useEffect, useMemo, useState } from "react";
import { Bus, Car, CarTaxiFront, MapPin, Navigation, Save, TrainFront } from "lucide-react";
import { Tab } from "../main";
import { MapDestination, stadiumDestinations } from "../mapDestinations";

type TransportMode = {
  id: string;
  name: string;
  icon: typeof Car;
  speedKmh: number;
  waitMin: number;
  details: string;
};

type SavedRoute = {
  id: string;
  stadium: string;
  city: string;
  mode: string;
  eta: string;
  distance: string;
  createdAt: string;
};

const STORAGE_KEY = "fanatlas.savedTransportRoutes";
const defaultStart: [number, number] = [40.758, -73.9855];

const modes: TransportMode[] = [
  {
    id: "uber",
    name: "Uber",
    icon: Car,
    speedKmh: 32,
    waitMin: 8,
    details: "Best for direct rides. Use marked pickup zones and verify plate number."
  },
  {
    id: "lyft",
    name: "Lyft",
    icon: Car,
    speedKmh: 31,
    waitMin: 9,
    details: "Good rideshare alternative when Uber demand is high."
  },
  {
    id: "taxi",
    name: "Taxi",
    icon: CarTaxiFront,
    speedKmh: 28,
    waitMin: 6,
    details: "Use official taxi stands only. Avoid unmarked cars."
  },
  {
    id: "metro",
    name: "Metro",
    icon: TrainFront,
    speedKmh: 26,
    waitMin: 10,
    details: "Usually best for stadium crowds where rail access exists."
  },
  {
    id: "bus",
    name: "Bus",
    icon: Bus,
    speedKmh: 21,
    waitMin: 12,
    details: "Budget option. Expect delays near stadium road closures."
  },
  {
    id: "train",
    name: "Train",
    icon: TrainFront,
    speedKmh: 38,
    waitMin: 14,
    details: "Often fastest for regional stadium access and post-match crowds."
  }
];

function loadSavedRoutes(): SavedRoute[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

function etaFor(distance: number, mode: TransportMode) {
  return Math.max(5, Math.round((distance / mode.speedKmh) * 60 + mode.waitMin));
}

export function TransportationPage({
  setMapDestination,
  setTab
}: {
  setMapDestination: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
}) {
  const [selectedStadiumName, setSelectedStadiumName] = useState(stadiumDestinations[0].name);
  const [startLocation, setStartLocation] = useState<[number, number]>(defaultStart);
  const [locationStatus, setLocationStatus] = useState("Using demo start: Times Square Fan Park.");
  const [selectedModeId, setSelectedModeId] = useState("uber");
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>(() => loadSavedRoutes());

  const selectedStadium = stadiumDestinations.find((stadium) => stadium.name === selectedStadiumName) || stadiumDestinations[0];
  const distance = useMemo(() => distanceKm(startLocation, selectedStadium), [selectedStadium, startLocation]);
  const estimates = useMemo(() => modes
    .map((mode) => ({
      ...mode,
      etaMin: etaFor(distance, mode),
      distanceKm: distance
    }))
    .sort((a, b) => a.etaMin - b.etaMin), [distance]);
  const selectedEstimate = estimates.find((mode) => mode.id === selectedModeId) || estimates[0];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedRoutes.slice(0, 20)));
  }, [savedRoutes]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        setStartLocation([position.coords.latitude, position.coords.longitude]);
        setLocationStatus("Using your current location.");
      },
      () => {
        setLocationStatus("Location unavailable. Using demo start: Times Square Fan Park.");
      }
    );
  }, []);

  function saveRoute() {
    const route: SavedRoute = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      stadium: selectedStadium.name,
      city: selectedStadium.city,
      mode: selectedEstimate.name,
      eta: `${selectedEstimate.etaMin} min`,
      distance: `${distance.toFixed(1)} km`,
      createdAt: new Date().toISOString()
    };

    setSavedRoutes((current) => [route, ...current]);
  }

  function openInMap() {
    setMapDestination(selectedStadium);
    setTab("map");
  }

  return (
    <div className="transport-hub-page">
      <div className="topbar">
        <button className="small-dark-btn" onClick={() => setTab("fanzones")}>
          ← Fan Zones
        </button>
        <div className="brand">Transportation <span>Hub</span></div>
      </div>

      <div className="transport-hero">
        <Navigation size={30} />
        <div>
          <h1>Compare transport to stadium</h1>
          <p>Estimate Uber, Lyft, taxi, metro, bus, and train travel from your current location.</p>
        </div>
      </div>

      <div className="transport-search-panel">
        <label>
          Stadium
          <select
            className="input"
            value={selectedStadiumName}
            onChange={(event) => setSelectedStadiumName(event.target.value)}
          >
            {stadiumDestinations.map((stadium) => (
              <option key={stadium.name}>{stadium.name}</option>
            ))}
          </select>
        </label>
        <div className="route-status">{locationStatus}</div>
      </div>

      <div className="transport-summary">
        <div>
          <span>Destination</span>
          <strong>{selectedStadium.name}</strong>
          <p>{selectedStadium.city}</p>
        </div>
        <div>
          <span>Distance</span>
          <strong>{distance.toFixed(1)} km</strong>
          <p>Estimated straight-line route basis</p>
        </div>
        <div>
          <span>Best ETA</span>
          <strong>{estimates[0].etaMin} min</strong>
          <p>{estimates[0].name}</p>
        </div>
      </div>

      <div className="section-row">
        <h3>Compare Transport Options</h3>
        <button className="mini-btn" onClick={saveRoute}>
          Save route
        </button>
      </div>

      <div className="transport-option-list">
        {estimates.map((option) => {
          const Icon = option.icon;

          return (
            <button
              className={`transport-option-card ${selectedModeId === option.id ? "active" : ""}`}
              key={option.id}
              onClick={() => setSelectedModeId(option.id)}
            >
              <span className="transport-option-icon"><Icon size={20} /></span>
              <span>
                <strong>{option.name}</strong>
                <small>{option.details}</small>
              </span>
              <em>{option.etaMin} min</em>
            </button>
          );
        })}
      </div>

      <div className="transport-action-row">
        <button className="primary-btn" onClick={openInMap}>
          <MapPin size={17} /> Open In-App Map
        </button>
        <button className="secondary-btn" onClick={saveRoute}>
          <Save size={17} /> Save Route
        </button>
      </div>

      <section className="transport-saved-section">
        <h3>Saved Routes</h3>
        {savedRoutes.length === 0 && <p className="subtle">No saved routes yet.</p>}
        {savedRoutes.slice(0, 4).map((route) => (
          <div className="transport-saved-route" key={route.id}>
            <strong>{route.mode} to {route.stadium}</strong>
            <span>{route.city} · {route.distance} · {route.eta}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
