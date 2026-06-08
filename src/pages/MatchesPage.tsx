import { useEffect, useState } from "react";
import { matches as fallbackMatches, stadiums as fallbackStadiums } from "../data/mockData";
import { getWorldCup2026Games, getWorldCup2026Stadiums, FanAtlasMatch, FanAtlasStadium } from "../services/worldcup2026";
import { Tab } from "../main";

type Props = { setTab: (tab: Tab) => void };

function getMatchTone(city: string) {
  const c = city.toLowerCase();
  if (c.includes("mexico") || c.includes("guadalajara") || c.includes("monterrey")) return "mexico";
  if (c.includes("los angeles") || c.includes("san francisco") || c.includes("seattle")) return "west";
  if (c.includes("new york") || c.includes("jersey") || c.includes("philadelphia") || c.includes("boston")) return "east";
  if (c.includes("dallas") || c.includes("houston") || c.includes("atlanta") || c.includes("miami")) return "south";
  if (c.includes("toronto") || c.includes("vancouver")) return "canada";
  return "default";
}

function shouldShowScore(match: FanAtlasMatch) {
  return match.status.toLowerCase() !== "scheduled" && match.score;
}

export function MatchesPage({ setTab }: Props) {
  const [matches, setMatches] = useState<FanAtlasMatch[]>(fallbackMatches as FanAtlasMatch[]);
  const [stadiums, setStadiums] = useState<FanAtlasStadium[]>(fallbackStadiums as FanAtlasStadium[]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("Fallback schedule");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWorldCupData() {
      try {
        setLoading(true);
        const [games, venues] = await Promise.all([
          getWorldCup2026Games(),
          getWorldCup2026Stadiums()
        ]);
        if (games.length > 0) {
          setMatches(games);
          setSource("World Cup 2026 data powered by worldcup26.ir");
        }
        if (venues.length > 0) setStadiums(venues);
        if (games.length === 0) setSource("Fallback schedule — WorldCup2026 API returned no games");
      } catch (err: any) {
        setError(err?.message || "Could not load World Cup 2026 data");
        setSource("Fallback schedule");
      } finally {
        setLoading(false);
      }
    }
    loadWorldCupData();
  }, []);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">Match Center <span>2026</span></div>
          <div className="subtle">{source}</div>
        </div>
        <div className="language-pill">🏆 Live</div>
      </div>

      {loading && <div className="card-dark"><strong>Loading World Cup 2026 data...</strong><p className="subtle">Checking the open-source API.</p></div>}

      {error && <div className="alert-card danger"><div><strong>Live API unavailable</strong><p>{error}. Showing fallback schedule.</p></div></div>}

      <div className="feature-card green">
        <span className="feature-emoji">⚽</span>
        <div>
          <h3>Match Day Assistant</h3>
          <p>Choose a match and plan route, food, fan zones, safety, and post-game options.</p>
        </div>
      </div>

      <div className="matches-list">
        {matches.map((m) => (
          <div className={`match-card-premium ${getMatchTone(m.city)}`} key={m.id || `${m.team1}-${m.team2}-${m.stadium}`}>
            <div className="match-card-header">
              <div>
                <h2>{m.team1} vs {m.team2}</h2>
                <p>{m.date} · {m.time}</p>
              </div>
              <div className="match-status-pill">
                {shouldShowScore(m) && <strong>{m.score}</strong>}
                <span>{m.status}</span>
              </div>
            </div>
            <div className="match-detail-line">🏟 {m.stadium} · {m.city}</div>
            <div className="match-detail-line">🎉 After match: {m.fanZone}</div>
            <div className="match-actions-premium">
              <button className="primary-btn" onClick={() => setTab("ai")}>Plan this match day</button>
              <button className="stadium-map-btn" onClick={() => setTab("map")}>📍 Stadium Map</button>
            </div>
          </div>
        ))}
      </div>

      <h3>🏟 Stadium Guide</h3>
      {stadiums.slice(0, 8).map((s) => (
        <div className="list-card" key={s.id || s.name}>
          <div className="thumb">🏟</div>
          <div>
            <strong>{s.name}</strong>
            <p>{s.city} {s.country ? `· ${s.country}` : ""}</p>
            <p>👥 {s.capacity} · {s.tip}</p>
          </div>
        </div>
      ))}
    </>
  );
}
