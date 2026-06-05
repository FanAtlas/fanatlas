import { alerts, fanZones, places } from "../data/mockData";
import { Bot, MapPin, Shield, Wifi, Languages, Crown } from "lucide-react";

export function HomePage({ setTab }: { setTab: (tab: any) => void }) {
  return (
    <>
      <div className="header">
        <div>
          <div className="logo">Fan<span>Atlas</span></div>
          <div className="subtle">AI World Cup travel companion</div>
        </div>
        <span className="badge">Beta</span>
      </div>

      <div className="card cyan">
        <p className="title">⚽ Match Day Assistant</p>
        <p className="subtle">Plan route, food, fan zones, safety tips, and after-game options.</p>
        <button className="primary-btn" onClick={() => setTab("ai")}>Plan my match day</button>
      </div>

      <div className="grid">
        <button className="secondary-btn" onClick={() => setTab("ai")}><Bot size={16}/> AI Chat</button>
        <button className="secondary-btn" onClick={() => setTab("map")}><MapPin size={16}/> Map</button>
        <button className="secondary-btn" onClick={() => setTab("sos")}><Shield size={16}/> SOS</button>
        <button className="secondary-btn" onClick={() => setTab("guides")}><Languages size={16}/> Guides</button>
      </div>

      <h3>Live Alerts</h3>
      {alerts.map((a) => (
        <div className="card" key={a.title}>
          <div className="row">
            <div>
              <p className="small-title">{a.title}</p>
              <p className="subtle">{a.city} · {a.message}</p>
            </div>
            <span className={`badge ${a.severity === "warning" ? "warning" : ""}`}>{a.severity}</span>
          </div>
        </div>
      ))}

      <h3>Trending Places</h3>
      {places.map((p) => (
        <div className="card" key={p.name}>
          <div className="row">
            <div>
              <p className="small-title">{p.name}</p>
              <p className="subtle">{p.city} · {p.category} · Busy: {p.busy}</p>
            </div>
            <span className="badge">★ {p.rating}</span>
          </div>
        </div>
      ))}

      <h3>Fan Zones</h3>
      {fanZones.slice(0, 2).map((z) => (
        <div className="card" key={z.name}>
          <p className="small-title">{z.name}</p>
          <p className="subtle">{z.city} · {z.hours} · Safety {z.safety}/10</p>
        </div>
      ))}

      <div className="card">
        <div className="row">
          <div>
            <p className="small-title"><Crown size={16}/> Premium</p>
            <p className="subtle">Offline maps, unlimited AI, translator, VIP alerts.</p>
          </div>
          <span className="badge">Soon</span>
        </div>
      </div>
    </>
  );
}
