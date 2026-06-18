import { BadgeCheck, PackageCheck, Shirt, ShoppingBag } from "lucide-react";
import { Tab } from "../main";
import { trackRevenueClick } from "../services/revenueTracking";

function merchCheckoutUrl(productName: string) {
  const baseUrl = import.meta.env.VITE_FANZONE_MERCH_AFFILIATE_URL || "https://store.fifa.com/";
  const params = new URLSearchParams({
    product: productName,
    source: "fanatlas",
    placement: "fan-zone-merch"
  });

  return `${baseUrl}?${params.toString()}`;
}

export function FanZoneMerchPage({ setTab }: { setTab: (tab: Tab) => void }) {
  const products = [
    {
      name: "Official Match Scarf",
      price: "$35",
      details: "City and fan-zone editions with tournament-style branding and pickup reminders."
    },
    {
      name: "Team Jersey Pickup",
      price: "$95+",
      details: "Reserve sizes, choose pickup city, and collect at participating fan zones."
    },
    {
      name: "Collector Bundle",
      price: "$75",
      details: "Pins, lanyard, tote, and limited fan-zone badge for multi-city travelers."
    }
  ];

  return (
    <>
      <div className="topbar">
        <button className="small-dark-btn" onClick={() => setTab("fanzones")}>
          ← Fan Zones
        </button>
        <div className="brand">Official <span>Merchandise</span></div>
      </div>

      <div className="action-hero merch">
        <ShoppingBag size={30} />
        <div>
          <h1>Official Merchandise</h1>
          <p>Browse fan-zone pickup items, official gear, and limited tournament collectibles.</p>
        </div>
      </div>

      {products.map((item) => (
        <div className="action-card revenue-card" key={item.name}>
          <div className="action-card-main">
            <div className="action-card-icon">
              {item.name.includes("Jersey") ? <Shirt size={20} /> : <BadgeCheck size={20} />}
            </div>
            <div>
              <strong>{item.name}</strong>
              <p>{item.details}</p>
            </div>
            <span>{item.price}</span>
          </div>
          <a
            className="buy-btn full-width"
            href={merchCheckoutUrl(item.name)}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackRevenueClick({
              type: "merchandise",
              product: item.name,
              provider: "Official Merchandise",
              amount: item.price,
              url: merchCheckoutUrl(item.name),
              source: "Fan Zone Merchandise Page"
            })}
          >
            Shop Official Merchandise
          </a>
        </div>
      ))}

      <button className="primary-btn full-width" onClick={() => setTab("fanzones")}>
        Back To Fan Zones
      </button>

      <div className="action-note">
        <PackageCheck size={18} />
        <span>Merchandise checkout URLs use VITE_FANZONE_MERCH_AFFILIATE_URL with FanAtlas tracking parameters.</span>
      </div>
    </>
  );
}
