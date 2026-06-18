import { Bus, Car, MapPin, TrainFront } from "lucide-react";
import { Tab } from "../main";
import { MapDestination } from "../mapDestinations";
import { trackRevenueClick } from "../services/revenueTracking";

function transportPartnerUrl(optionName: string) {
  const baseUrl = import.meta.env.VITE_FANZONE_TRANSPORT_AFFILIATE_URL || "https://www.rome2rio.com/";
  const params = new URLSearchParams({
    option: optionName,
    source: "fanatlas",
    placement: "fan-zone-transport"
  });

  return `${baseUrl}?${params.toString()}`;
}

export function FanZoneTransportPage({
  setMapDestination,
  setTab
}: {
  setMapDestination: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
}) {
  const options = [
    {
      name: "Official Shuttle",
      eta: "10-20 min",
      details: "Best for stadium exits, high-crowd fan zones, and late-night movement after matches.",
      icon: Bus
    },
    {
      name: "Transit / Train",
      eta: "15-40 min",
      details: "Use the in-app Map transit demo when live train or bus routing is unavailable.",
      icon: TrainFront
    },
    {
      name: "Rideshare Pickup",
      eta: "15-35 min",
      details: "Use marked pickup zones only. Avoid unofficial drivers outside stadium and fan-zone exits.",
      icon: Car
    },
    {
      name: "Walking Route",
      eta: "5-25 min",
      details: "Good for nearby hotels, restaurants, central fan parks, and daylight routes.",
      icon: MapPin
    }
  ];

  return (
    <>
      <div className="topbar">
        <button className="small-dark-btn" onClick={() => setTab("fanzones")}>
          ← Fan Zones
        </button>
        <div className="brand">Fan Zone <span>Transport</span></div>
      </div>

      <div className="action-hero transport">
        <Bus size={30} />
        <div>
          <h1>Transportation</h1>
          <p>Plan shuttles, transit, rideshare pickup, and safer walking routes without leaving FanAtlas.</p>
        </div>
      </div>

      {options.map((item) => {
        const Icon = item.icon;

        return (
          <div className="action-card revenue-card" key={item.name}>
            <div className="action-card-main">
              <div className="action-card-icon"><Icon size={20} /></div>
              <div>
                <strong>{item.name}</strong>
                <p>{item.details}</p>
              </div>
              <span>{item.eta}</span>
            </div>
            <a
              className="buy-btn full-width"
              href={transportPartnerUrl(item.name)}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackRevenueClick({
                type: "transportation",
                product: item.name,
                provider: "Fan Zone Transport",
                amount: item.eta,
                url: transportPartnerUrl(item.name),
                source: "Fan Zone Transport Page"
              })}
            >
              Check Transport Options
            </a>
          </div>
        );
      })}

      <button
        className="primary-btn full-width"
        onClick={() => {
          setMapDestination(null);
          setTab("map");
        }}
      >
        Open In-App Map
      </button>

      <div className="action-note">
        <Bus size={18} />
        <span>Transport partner URLs use VITE_FANZONE_TRANSPORT_AFFILIATE_URL with FanAtlas tracking parameters.</span>
      </div>
    </>
  );
}
