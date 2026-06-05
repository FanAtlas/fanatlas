import { guides } from "../data/mockData";

export function TravelGuidesPage() {
  const phases = ["Before Travel", "After Arrival", "During Stay"];
  return (
    <>
      <div className="header">
        <div>
          <div className="logo">Travel Guides</div>
          <div className="subtle">What to do before, after arrival, and during stay</div>
        </div>
      </div>

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
