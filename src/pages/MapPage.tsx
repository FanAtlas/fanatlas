import { mapPins } from "../data/mockData";
import { Tab } from "../main";

export function MapPage({ setTab }: { setTab: (tab: Tab) => void }) {
  const chips = ["All", "🏟 stadium", "🎉 fan zone", "🍽 restaurant", "☕ cafe", "🏨 hotel", "🏥 hospital", "🚓 police"];
  return (
    <>
      <div className="topbar"><div className="brand">FanAtlas <span>2026</span></div><div className="language-pill">🌐 English</div></div>
      <div className="map-screen">
        <div className="chip-scroll map-chips">{chips.map((c,i)=><span className={`chip ${i===0?"active":""}`} key={c}>{c}</span>)}</div>
        {mapPins.map((pin)=><div className="map-pin" style={{ top: pin.top, left: pin.left }} key={pin.label}>{pin.label}</div>)}
        <button className="find-nearby" onClick={()=>setTab("explore")}>➤ Find Nearby</button>
      </div>
      <div className="feature-card blue"><span className="feature-emoji">🧭</span><div><h3>In-App Navigation</h3><p>Route previews stay inside FanAtlas. Real routing API comes next.</p></div></div>
    </>
  );
}
