import { useState } from "react";
import { fanZones, places, esimDeals, hotelPartners } from "../data/mockData";
import { languages } from "../i18n";
import { useLanguage } from "../LanguageContext";
import { Tab } from "../main";
import { getFanZoneDestination, getPlaceDestination, MapDestination } from "../mapDestinations";

export function ExplorePage({
  setMapDestination,
  setTab
}: {
  setMapDestination: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
}) {
  const { language } = useLanguage();
  const [active, setActive] = useState("fanzones");
  const tabs = [["fanzones","🎉 Fan Zones"],["esim","📡 eSIM"],["food","🍽 Eat & Drink"],["stays","🏨 Stays"],["flights","✈️ Flights"]];
  const openFanZoneMap = (name: string) => {
    setMapDestination(getFanZoneDestination(name) || null);
    setTab("map");
  };
  const openPlaceMap = (name: string, city: string) => {
    setMapDestination(getPlaceDestination(name, city) || null);
    setTab("map");
  };

  return (
    <>
      <div className="topbar"><div><div className="brand">FanAtlas <span>2026</span></div><div className="subtle">Everything for your trip</div></div><div className="language-pill">{languages[language]}</div></div>
      <h1>Explore</h1>
      <div className="chip-scroll">{tabs.map(([id,label])=><button key={id} className={`chip ${active===id?"active":""}`} onClick={()=>setActive(id)}>{label}</button>)}</div>

      {active === "fanzones" && fanZones.map(z=><div className="zone-card" key={z.name}><div><h3>{z.name}</h3><p>📍 {z.city}</p><p>🗓 {z.dates} · 🕘 {z.hours} · 👥 {z.capacity}</p><button className="link-btn" onClick={()=>openFanZoneMap(z.name)}>⌖ Navigate inside app</button></div><span className="safe-badge">{z.entry}</span></div>)}
      {active === "esim" && esimDeals.map(e=><div className="list-card" key={e.provider}><div className="thumb">📡</div><div><strong>{e.provider}</strong><p>{e.bestFor} · {e.coverage} · {e.data}</p></div><a className="mini-btn" href={e.url}>{e.price}</a></div>)}
      {active === "stays" && hotelPartners.map(h=><div className="list-card" key={h.provider}><div className="thumb">🏨</div><div><strong>{h.provider}</strong><p>{h.bestFor} · {h.filter} · {h.price}</p></div><a className="mini-btn" href={h.url}>Find</a></div>)}
      {active === "food" && places.map(p=><button className="list-card" key={p.name} onClick={()=>openPlaceMap(p.name, p.city)}><div className="thumb">🍽️</div><div><strong>{p.name}</strong><p>{p.city} · ⭐ {p.rating} · {p.price}</p></div><span className="safe-badge">{p.safety}/10</span></button>)}
      {active === "flights" && <div className="feature-card orange"><span className="feature-emoji">✈️</span><div><h3>Flights Coming Soon</h3><p>Affiliate flight search for host cities.</p></div></div>}
    </>
  );
}
