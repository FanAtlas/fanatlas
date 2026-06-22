import { Crown, Star, Users } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { Tab } from "../main";

export function VIPPackagesPage({ setTab }: { setTab: (tab: Tab) => void }) {
  const { t } = useLanguage();
  const packages = [
    {
      name: "Pitchside Lounge",
      price: "From $249",
      details: "Priority entry, lounge access, premium viewing zones, and concierge support."
    },
    {
      name: "Family VIP",
      price: "From $399",
      details: "Reserved family area, meal vouchers, child-friendly activities, and shaded seating."
    },
    {
      name: "All-Day Pass",
      price: "From $599",
      details: "Multi-match access, private bar, merchandise credit, and transport priority."
    }
  ];

  return (
    <>
      <div className="topbar">
        <button className="small-dark-btn" onClick={() => setTab("fanzones")}>
          {t.backToFanZones}
        </button>
        <div className="brand">VIP <span>Packages</span></div>
      </div>

      <div className="action-hero vip">
        <Crown size={30} />
        <div>
          <h1>Fan Zone VIP</h1>
          <p>Upgrade match day with lounges, priority access, reserved areas, and concierge help.</p>
        </div>
      </div>

      {packages.map((item) => (
        <div className="action-card" key={item.name}>
          <div className="action-card-icon"><Star size={20} /></div>
          <div>
            <strong>{item.name}</strong>
            <p>{item.details}</p>
          </div>
          <span>{item.price}</span>
        </div>
      ))}

      <button className="primary-btn full-width" onClick={() => setTab("tickets")}>
        View Ticket Wallet
      </button>

      <div className="action-note">
        <Users size={18} />
        <span>Availability varies by city and fan zone capacity.</span>
      </div>
    </>
  );
}
