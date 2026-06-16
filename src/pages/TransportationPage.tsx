import { Bus, Car, MapPin } from "lucide-react";
import { Tab } from "../main";
import { MapDestination } from "../mapDestinations";

export function TransportationPage({
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
      details: "Recommended for high-crowd fan zones and stadium exits."
    },
    {
      name: "Rideshare Pickup",
      eta: "15-35 min",
      details: "Use marked pickup zones and avoid unofficial drivers."
    },
    {
      name: "Walking Route",
      eta: "5-25 min",
      details: "Best for nearby hotels, restaurants, and central city fan parks."
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
          <p>Plan official shuttles, rideshare pickup, and safer walking routes without leaving FanAtlas.</p>
        </div>
      </div>

      {options.map((item) => (
        <div className="action-card" key={item.name}>
          <div className="action-card-icon">
            {item.name === "Rideshare Pickup" ? <Car size={20} /> : <MapPin size={20} />}
          </div>
          <div>
            <strong>{item.name}</strong>
            <p>{item.details}</p>
          </div>
          <span>{item.eta}</span>
        </div>
      ))}

      <button
        className="primary-btn full-width"
        onClick={() => {
          setMapDestination(null);
          setTab("map");
        }}
      >
        Open In-App Map
      </button>
    </>
  );
}
