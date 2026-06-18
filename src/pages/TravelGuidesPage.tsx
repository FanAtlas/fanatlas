import { BackButton } from "../components/BackButton";
import { guides } from "../data/mockData";
import { Tab } from "../main";

export function TravelGuidesPage({ onBack, setTab }: { onBack: () => void; setTab: (tab: Tab) => void }) {
  const phases = ["Before Travel", "After Arrival", "During Stay"];
  return (
    <>
      <div className="header">
        <BackButton onBack={onBack} />
        <div>
          <div className="logo">Travel Guides</div>
          <div className="subtle">What to do before, after arrival, and during stay</div>
        </div>
      </div>

      <button className="feature-card blue" onClick={() => setTab("cityguide")}>
        <div className="feature-emoji">CG</div>
        <div>
          <h3>Host City Guides</h3>
          <p>Attractions, restaurants, safety, transportation, fan zones, and hotels for every 2026 host city.</p>
        </div>
      </button>

      {phases.map((phase) => (
        <section key={phase}>
          <h3>{phase}</h3>
          {guides.filter(g => g.phase === phase).map((g) => (
            <div className="card" key={g.title}>
              <p className="small-title">{g.title}</p>
              <p className="subtle">{g.content}</p>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
