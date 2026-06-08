import { Search, Bot, MapPin, Shield, Languages, Crown, Wifi, Hotel, Coins, BookOpen, Tv } from "lucide-react";
import { alerts, crowdAlerts, fanZones, places } from "../data/mockData";
import { Tab } from "../main";

export function HomePage({ setTab }: { setTab: (tab: Tab) => void }) {
  const quick = [
    { label: "Translate", icon: Languages, tab: "translator" as Tab },
    { label: "AI Chat", icon: Bot, tab: "ai" as Tab },
    { label: "Currency", icon: Coins, tab: "currency" as Tab },
    { label: "Fan Zones", icon: Crown, tab: "explore" as Tab },
    { label: "eSIM", icon: Wifi, tab: "esim" as Tab },
    { label: "Stays", icon: Hotel, tab: "hotels" as Tab },
    { label: "Offline", icon: MapPin, tab: "map" as Tab },
    { label: "TV Mode", icon: Tv, tab: "tv" as Tab }
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">FanAtlas <span>2026</span></div>
          <div className="subtle">📍 FIFA World Cup 2026</div>
        </div>
        <div className="language-pill">🌐 🇺🇸 English</div>
      </div>
<div className="next-match-card">
  <div className="next-match-top">
    <span>🏆 NEXT MATCH</span>
    <strong>Live Schedule</strong>
  </div>

  <h2>Mexico vs South Africa</h2>

  <p>Jun 11, 2026 • 13:00</p>

  <p>📍 Estadio Azteca • Mexico City</p>

  <button className="primary-btn" onClick={() => setTab("matches")}>
    Plan Match Day
  </button>
</div>
      <div className="searchbar"><Search size={18} /><span>Search places, restaurants, stadiums...</span></div>

      <div className="section-row"><h3>🔴 Live Crowd Alerts</h3><span className="subtle">Updated live</span></div>
      <div className="horizontal-scroll">
        {crowdAlerts.map((c) => (
          <div className={`crowd-card ${c.tone}`} key={c.name}>
            <div className="crowd-name">{c.name}</div>
            <div className="big-percent">{c.capacity}%</div>
            <div className="subtle">capacity ↑</div>
            <div className="meter"><div style={{ width: `${c.capacity}%` }} /></div>
          </div>
        ))}
      </div>

      {alerts.map((a) => (
        <div className={`alert-card ${a.severity}`} key={a.title}>
          <Shield size={18} />
          <div><strong>{a.title}</strong><p>{a.message}</p></div>
        </div>
      ))}

      <div className="quick-grid">
        {quick.map((q) => {
          const Icon = q.icon;
          return <button className="quick-card" key={q.label} onClick={() => setTab(q.tab)}><Icon size={22} /><span>{q.label}</span></button>;
        })}
      </div>

      <button className="feature-card blue" onClick={() => setTab("guides")}><BookOpen size={28} /><div><h3>Travel Guides</h3><p>Visa, weather, safety & local tips</p></div></button>
      <button className="feature-card green" onClick={() => setTab("ai")}><span className="feature-emoji">⚽</span><div><h3>Match Day Assistant</h3><p>Your personal game-day planner</p><small>"Plan my route, food spots, fan zones, and post-game options."</small></div></button>
      <button className="feature-card red" onClick={() => setTab("sos")}><span className="feature-emoji">🚨</span><div><h3>SOS Emergency</h3><p>911 · Hospital · Embassy · Phrases</p></div><strong>OPEN →</strong></button>

      <h3>🔥 Trending Restaurants</h3>
<div className="horizontal-scroll">
  {places.map((p) => (
    <button
      className="place-card"
      key={p.name}
      onClick={() => setTab("explore")}
    >
      <div className="place-image">🍽️</div>

      <strong>{p.name}</strong>

      <p>⭐ {p.rating} · 👥 {p.busy}</p>

      <span>{p.city}</span>

      <small>Tap to explore restaurants →</small>
    </button>
  ))}
</div>

      <h3>🎉 Fan Zones</h3>
      {fanZones.slice(0, 3).map((z) => <div className="list-card" key={z.name}><div className="thumb">⚽</div><div><strong>{z.name}</strong><p>{z.city} · {z.hours} · 👥 {z.capacity}</p></div><span className="safe-badge">{z.entry}</span></div>)}
      <footer className="footer-links">Privacy Policy · Terms of Service · Support</footer>
    </>
  );
}
