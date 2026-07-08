import { BackButton } from "../components/BackButton";
import { guides } from "../data/mockData";
import { Tab } from "../main";

export function TravelGuidesPage({ onBack, setTab }: { onBack: () => void; setTab: (tab: Tab) => void }) {
  const phases = ["Before Travel", "After Arrival", "During Stay"];
  return (
    <div className="travel-guides-page">
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div>
          <div className="brand">Travel <span>Guides</span></div>
          <div className="subtle">What to do before, after arrival, and during stay</div>
        </div>
      </div>

      <button className="fan-card destination-guide-card" onClick={() => setTab("cityguide")}>
        <div className="feature-emoji">CG</div>
        <div>
          <h3>Destination Guides</h3>
          <p>Attractions, restaurants, safety, transportation, events, and hotels for your destination.</p>
        </div>
      </button>

      {phases.map((phase) => (
        <section className="travel-guide-section" key={phase}>
          <h3>{phase}</h3>
          {guides.filter(g => g.phase === phase).map((g) => (
            <div className="fan-card" key={g.title}>
              <p className="small-title">{g.title}</p>
              <p className="subtle">{g.content}</p>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
