import { useMemo, useState } from "react";
import { Bus, Car, Info, MapPin, ShieldCheck, TrainFront } from "lucide-react";
import { BackButton } from "../components/BackButton";
import {
  TransportationOption,
  transportationCities,
  transportationOptions
} from "../data/transportationOptions";
import { Tab } from "../main";
import { getFanZoneDestination, MapDestination } from "../mapDestinations";
import { trackRevenueClick } from "../services/revenueTracking";

const cityFanZone: Record<string, string> = {
  "New York": "Times Square Fan Park",
  "Los Angeles": "SoFi Fan Village",
  "Mexico City": "Azteca Fan Fest",
  Toronto: "Toronto Fan Experience"
};

const optionIcon = {
  shuttle: Bus,
  transit: TrainFront,
  rideshare: Car,
  taxi: Car,
  walking: MapPin
};

function externalLabel(option: TransportationOption) {
  return option.actionType === "uber" || option.actionType === "lyft" || option.actionType === "official";
}

export function FanZoneTransportPage({
  onBack,
  setMapDestination,
  setTab
}: {
  onBack: () => void;
  setMapDestination: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
}) {
  const [selectedCity, setSelectedCity] = useState<(typeof transportationCities)[number]>("New York");
  const cityOptions = useMemo(
    () => transportationOptions.filter((option) => option.city === selectedCity),
    [selectedCity]
  );

  function openInMap() {
    setMapDestination(getFanZoneDestination(cityFanZone[selectedCity]) || null);
    setTab("map");
  }

  function handleAction(option: TransportationOption) {
    if (option.actionType === "map" || option.actionType === "info" || !option.url) {
      openInMap();
      return;
    }

    trackRevenueClick({
      type: "transportation",
      product: option.title,
      provider: option.actionType === "official" ? "Official Transit" : option.actionType,
      amount: option.estimatedTime,
      url: option.url,
      source: "Fan Zone Transport Page"
    });
    window.open(option.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fan-zone-transport-page">
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div className="brand">Fan Zone <span>Transport</span></div>
      </div>

      <div className="action-hero transport">
        <Bus size={30} />
        <div>
          <h1>Transportation</h1>
          <p>Choose safe fan-zone routes, official transit, marked pickup zones, and in-app map guidance.</p>
        </div>
      </div>

      <div className="action-note warning">
        <ShieldCheck size={18} />
        <span>Use official transit and marked pickup zones. Avoid unlicensed taxis after large events.</span>
      </div>

      <label className="transport-city-selector">
        <span>Fan zone city</span>
        <select className="input" value={selectedCity} onChange={(event) => setSelectedCity(event.target.value as typeof selectedCity)}>
          {transportationCities.map((city) => (
            <option key={city}>{city}</option>
          ))}
        </select>
      </label>

      <button className="primary-btn full-width" onClick={openInMap}>
        Open {cityFanZone[selectedCity]} in FanAtlas Map
      </button>

      <div className="fan-zone-transport-list">
        {cityOptions.map((option) => {
        const Icon = optionIcon[option.type];

        return (
          <article className="fan-zone-transport-card" key={`${option.city}-${option.title}`}>
            <div className="fan-zone-transport-heading">
              <div className="action-card-icon">
                <Icon size={20} />
              </div>
              <div>
                <strong>{option.title}</strong>
              </div>
            </div>

            <p>{option.description}</p>

            <div className="fan-zone-transport-meta">
              <span>Estimated time: {option.estimatedTime}</span>
              <span>Safety tip: {option.safetyTip}</span>
            </div>

            <button className="secondary-btn full-width" onClick={() => handleAction(option)}>
              {option.actionLabel}
              {externalLabel(option) ? " (external)" : ""}
            </button>
          </article>
        );
        })}
      </div>

      <div className="action-note">
        <Info size={18} />
        <span>External services open only when clearly labeled. FanAtlas map guidance stays inside the app.</span>
      </div>
    </div>
  );
}
