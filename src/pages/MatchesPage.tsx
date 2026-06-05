import { matches } from "../data/mockData";

export function MatchesPage({ setTab }: { setTab: (tab: any) => void }) {
  return (
    <>
      <div className="header">
        <div>
          <div className="logo">Match Center</div>
          <div className="subtle">World Cup 2026 schedule</div>
        </div>
      </div>

      {matches.map((m) => (
        <div className="card cyan" key={`${m.team1}-${m.team2}`}>
          <div className="row">
            <div>
              <p className="title">{m.team1} vs {m.team2}</p>
              <p className="subtle">{m.date} · {m.stadium} · {m.city}</p>
              <p className="subtle">After match: {m.fanZone}</p>
            </div>
            <span className="badge">{m.status}</span>
          </div>
          <button className="primary-btn" onClick={() => setTab("ai")}>Plan this match day</button>
        </div>
      ))}

      <div className="card">
        <p className="small-title">API-Football ready</p>
        <p className="subtle">The service file is included. Add your key in .env to fetch real fixtures.</p>
      </div>
    </>
  );
}
