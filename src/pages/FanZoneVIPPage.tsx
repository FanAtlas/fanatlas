import { Crown, ShieldCheck, Sparkles, Star, Users } from "lucide-react";
import { Tab } from "../main";
import { trackRevenueClick } from "../services/revenueTracking";

function vipCheckoutUrl(packageName: string) {
  const baseUrl = import.meta.env.VITE_FANZONE_VIP_AFFILIATE_URL || "https://www.fifa.com/tickets";
  const params = new URLSearchParams({
    product: packageName,
    source: "fanatlas",
    placement: "fan-zone-vip"
  });

  return `${baseUrl}?${params.toString()}`;
}

export function FanZoneVIPPage({ setTab }: { setTab: (tab: Tab) => void }) {
  const packages = [
    {
      name: "Pitchside Lounge",
      price: "From $249",
      details: "Priority fan-zone entry, premium viewing areas, private restrooms, lounge seating, and concierge support."
    },
    {
      name: "Family VIP",
      price: "From $399",
      details: "Reserved family area, shaded seating, meal vouchers, child-friendly activities, and escorted entry."
    },
    {
      name: "All-Day Pass",
      price: "From $599",
      details: "Multi-match screen access, private bar, merchandise credit, transport priority, and re-entry support."
    }
  ];

  return (
    <>
      <div className="topbar">
        <button className="small-dark-btn" onClick={() => setTab("fanzones")}>
          ← Fan Zones
        </button>
        <div className="brand">VIP <span>Fan Zones</span></div>
      </div>

      <div className="action-hero vip">
        <Crown size={30} />
        <div>
          <h1>VIP Packages</h1>
          <p>Premium fan-zone access, lounges, reserved areas, and concierge support for match day.</p>
        </div>
      </div>

      {packages.map((item) => (
        <div className="action-card revenue-card" key={item.name}>
          <div className="action-card-main">
            <div className="action-card-icon"><Star size={20} /></div>
            <div>
              <strong>{item.name}</strong>
              <p>{item.details}</p>
            </div>
            <span>{item.price}</span>
          </div>
          <a
            className="buy-btn full-width"
            href={vipCheckoutUrl(item.name)}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackRevenueClick({
              type: "vip",
              product: item.name,
              provider: "Fan Zone VIP",
              amount: item.price,
              url: vipCheckoutUrl(item.name),
              source: "Fan Zone VIP Page"
            })}
          >
            Check VIP Availability
          </a>
        </div>
      ))}

      <button className="primary-btn full-width" onClick={() => setTab("tickets")}>
        View Ticket Wallet
      </button>

      <div className="action-note">
        <ShieldCheck size={18} />
        <span>VIP checkout URLs use VITE_FANZONE_VIP_AFFILIATE_URL with FanAtlas tracking parameters.</span>
      </div>

      <div className="action-note">
        <Users size={18} />
        <span>Availability varies by city, match, and fan-zone capacity.</span>
      </div>

      <div className="action-note">
        <Sparkles size={18} />
        <span>Keep users inside FanAtlas until checkout links are configured.</span>
      </div>
    </>
  );
}
