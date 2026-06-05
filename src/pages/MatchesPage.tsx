import { useEffect, useState } from "react";
import { matches as fallbackMatches, stadiums as fallbackStadiums } from "../data/mockData";
import { getWorldCup2026Games, getWorldCup2026Stadiums, FanAtlasMatch, FanAtlasStadium } from "../services/worldcup2026";
import { Tab } from "../main";

type Props = {
  setTab: (tab: Tab) => void;
};

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

        if (venues.length > 0) {
          setStadiums(venues);
        }

        if (games.length === 0) {
          setSource("Fallback schedule — WorldCup2026 API returned no games");
        }
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

      {loading && (
        <div className="card-dark">
          <strong>Loading World Cup 2026 data...</strong>
          <p className="subtle">Checking the open-source World Cup 2026 API.</p>
        </div>
      )}

      {error && (
        <div className="alert-card danger">
          <div>
            <strong>Live API unavailable</strong>
            <p>{error}. Showing fallback schedule.</p>
          </div>
        </div>
      )}

      <div className="feature-card green">
        <span className="feature-emoji">⚽</span>
        <div>
          <h3>Match Day Assistant</h3>
          <p>Choose a match and plan route, food, fan zones, safety, and post-game options.</p>
        </div>
      </div>

      {matches.map((m) => (
        <div className="match-card" key={m.id || `${m.team1}-${m.team2}-${m.stadium}`}>
          <div className="match-top">
            <div>
              <h2>{m.team1} vs {m.team2}</h2>
              <p>{m.date} · {m.time}</p>
              <p>🏟 {m.stadium} · {m.city}</p>
              <p>🎉 After match: {m.fanZone}</p>
            </div>

            <div className="match-status">
              {m.score && <strong>{m.score}</strong>}
              <span>{m.status}</span>
            </div>
          </div>

          <div className="match-actions">
            <button className="primary-btn" onClick={() => setTab("ai")}>
              Plan this match day
            </button>
            <button className="secondary-chip" onClick={() => setTab("map")}>
              View stadium map
            </button>
          </div>
        </div>
      ))}

      <h3>🏟 Stadium Guide</h3>
      {stadiums.map((s) => (
        <div className="list-card" key={s.id || s.name}>
          <div className="thumb">🏟</div>
          <div>
            <strong>{s.name}</strong>
            <p>{s.city} {s.country ? `· ${s.country}` : ""}</p>
            <p>👥 {s.capacity} · {s.tip}</p>
          </div>
        </div>
      ))}

      <div className="card-dark">
        <h3>Data source note</h3>
        <p className="subtle">
          This MVP uses the free open-source World Cup 2026 API. Always verify official tournament details with FIFA and venue sources.
        </p>
      </div>
    </>
  );
}
