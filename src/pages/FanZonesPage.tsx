import { fanZones } from "../data/mockData";
import { Tab } from "../main";

export function FanZonesPage({ setTab }: { setTab: (tab: Tab) => void }) {
  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">Fan Zones <span>2026</span></div>
          <div className="subtle">Watch parties, VIP packages, transport and merch</div>
        </div>
      </div>

      {fanZones.map((zone) => (
        <div className="zone-card" key={zone.name}>
          <h3>🎉 {zone.name}</h3>
          <p>📍 {zone.city}</p>
          <p>🗓 {zone.dates}</p>
          <p>🕘 {zone.hours}</p>
          <p>👥 {zone.capacity}</p>
          <p>🎟 {zone.entry}</p>
          <p>🛡 Safety score: {zone.safety}/10</p>

          <div className="fanzone-actions">
            {zone.actions.map((action) => (
              <button
                className={`fanzone-btn ${action.tone}`}
                key={action.label}
                onClick={() => setTab(action.tab as Tab)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
