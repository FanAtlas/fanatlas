import { fanZones, places } from "../data/mockData";

export function ExplorePage() {
  return (
    <>
      <div className="header">
        <div>
          <div className="logo">Explore</div>
          <div className="subtle">Food, fan zones, eSIM, entertainment</div>
        </div>
      </div>

      <h3>Fan Zones</h3>
      {fanZones.map((z) => (
        <div className="card" key={z.name}>
          <div className="row">
            <div>
              <p className="small-title">{z.name}</p>
              <p className="subtle">{z.city} · {z.hours}</p>
            </div>
            <span className="badge">Safety {z.safety}/10</span>
          </div>
        </div>
      ))}

      <h3>Food & Cafes</h3>
      {places.map((p) => (
        <div className="card" key={p.name}>
          <p className="small-title">{p.name}</p>
          <p className="subtle">{p.city} · {p.category} · Rating {p.rating}</p>
        </div>
      ))}

      <h3>World Cup Essentials</h3>
      {["eSIM", "Hotels", "Flights", "Entertainment", "Currency", "Official Transport"].map((x) => (
        <div className="card" key={x}><p className="small-title">{x}</p><p className="subtle">Coming soon.</p></div>
      ))}
    </>
  );
}
