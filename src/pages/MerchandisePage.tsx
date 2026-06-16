import { BadgeCheck, Shirt, ShoppingBag } from "lucide-react";
import { Tab } from "../main";

export function MerchandisePage({ setTab }: { setTab: (tab: Tab) => void }) {
  const products = [
    {
      name: "Official Match Scarf",
      price: "$35",
      details: "City and fan-zone editions with tournament branding."
    },
    {
      name: "Team Jersey Pickup",
      price: "$95+",
      details: "Reserve sizes and collect at participating fan zones."
    },
    {
      name: "Collector Bundle",
      price: "$75",
      details: "Pins, lanyard, tote, and limited fan-zone badge."
    }
  ];

  return (
    <>
      <div className="topbar">
        <button className="small-dark-btn" onClick={() => setTab("fanzones")}>
          ← Fan Zones
        </button>
        <div className="brand">Official <span>Merch</span></div>
      </div>

      <div className="action-hero merch">
        <ShoppingBag size={30} />
        <div>
          <h1>Merchandise</h1>
          <p>Browse fan-zone pickup items, official gear, and limited tournament collectibles.</p>
        </div>
      </div>

      {products.map((item) => (
        <div className="action-card" key={item.name}>
          <div className="action-card-icon">
            {item.name.includes("Jersey") ? <Shirt size={20} /> : <BadgeCheck size={20} />}
          </div>
          <div>
            <strong>{item.name}</strong>
            <p>{item.details}</p>
          </div>
          <span>{item.price}</span>
        </div>
      ))}

      <button className="primary-btn full-width" onClick={() => setTab("profile")}>
        Save To Profile
      </button>
    </>
  );
}
