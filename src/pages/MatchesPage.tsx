import { useEffect, useMemo, useState } from "react";
import {
  getWorldCup2026Games,
  getWorldCup2026Groups,
  getWorldCup2026Stadiums,
  getWorldCup2026Teams,
  FanAtlasMatch,
  FanAtlasStadium
} from "../services/worldcup2026";
import { FavoriteButton } from "../components/FavoriteButton";
import { useLanguage } from "../LanguageContext";
import { Tab } from "../main";
import { getStadiumDestination, MapDestination } from "../mapDestinations";

type Props = {
  setMapDestination: (destination: MapDestination | null) => void;
  setSelectedStadium: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
  setSelectedMatch: (match: FanAtlasMatch) => void;
};

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
  return match.status === "Finished" && Boolean(match.score);
}

function getComputedStatus(match: FanAtlasMatch) {
  return match.status || "Upcoming";
}

function countdown(match: FanAtlasMatch) {
  if (!match.kickoffUtc) return "";

  const diff = new Date(match.kickoffUtc).getTime() - Date.now();
  if (diff <= 0) return "";

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function MatchesPage({ setMapDestination, setSelectedStadium, setTab, setSelectedMatch }: Props) {
  const { language, t } = useLanguage();
  const [matches, setMatches] = useState<FanAtlasMatch[]>([]);
  const [stadiums, setStadiums] = useState<FanAtlasStadium[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceKey, setSourceKey] = useState<"loading" | "ready" | "empty" | "unavailable">("loading");
  const [error, setError] = useState("");
  const [apiCounts, setApiCounts] = useState({ games: 0, groups: 0, stadiums: 0, teams: 0 });
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const source =
    sourceKey === "ready"
      ? t.worldCupFixtures
      : sourceKey === "empty"
        ? t.noFixturesSource
        : sourceKey === "unavailable"
          ? t.fixturesUnavailableSource
          : t.loadingSchedule;

  useEffect(() => {
    async function loadWorldCupData() {
      try {
        setLoading(true);
        const [games, venues, teams, groups] = await Promise.all([
          getWorldCup2026Games(),
          getWorldCup2026Stadiums(),
          getWorldCup2026Teams(),
          getWorldCup2026Groups()
        ]);
        setApiCounts({
          games: games.length,
          groups: groups.length,
          stadiums: venues.length,
          teams: teams.length
        });
        setError("");
        if (games.length > 0) {
          setMatches(games);
          setSourceKey("ready");
        }
        if (venues.length > 0) setStadiums(venues);
        if (games.length === 0) {
          setMatches([]);
          setSourceKey("empty");
        }
      } catch (err: any) {
        setMatches([]);
        setStadiums([]);
        setApiCounts({ games: 0, groups: 0, stadiums: 0, teams: 0 });
        setError("Live schedule unavailable. Please try again.");
        setSourceKey("unavailable");
      } finally {
        setLoading(false);
      }
    }
    loadWorldCupData();
  }, []);

  function planMatch(match: FanAtlasMatch) {
    setSelectedMatch(match);
    setTab("matchday");
  }

  function openStadiumMap(match: FanAtlasMatch) {
    setMapDestination(getStadiumDestination(match.stadium, match.city) || null);
    setTab("map");
  }

  function openStadiumPage(match: FanAtlasMatch) {
    setSelectedStadium(getStadiumDestination(match.stadium, match.city) || {
      name: match.stadium,
      city: match.city,
      lat: 39.8283,
      lng: -98.5795,
      emoji: "🏟",
      type: "stadium"
    });
    setTab("stadium");
  }

  const stages = useMemo(() => ["All", ...Array.from(new Set(matches.map((match) => match.stage || "Group Stage")))], [matches]);
  const filteredMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return matches.filter((match) => {
      const status = getComputedStatus(match);
      const haystack = [
        match.team1,
        match.team2,
        match.stadium,
        match.city,
        match.group,
        match.stage,
        String(match.matchNumber || "")
      ].join(" ").toLowerCase();

      return (
        (stageFilter === "All" || (match.stage || "Group Stage") === stageFilter) &&
        (statusFilter === "All" || status === statusFilter) &&
        (!normalizedQuery || haystack.includes(normalizedQuery))
      );
    });
  }, [matches, query, stageFilter, statusFilter]);

  const counts = useMemo(() => ({
    all: matches.length,
    live: matches.filter((match) => getComputedStatus(match) === "Live").length,
    upcoming: matches.filter((match) => getComputedStatus(match) === "Upcoming").length,
    finished: matches.filter((match) => getComputedStatus(match) === "Finished").length
  }), [matches]);

  return (
    <div dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="topbar">
        <div>
          <div className="brand">{t.matchCenter} <span>2026</span></div>
          <div className="subtle">{source}</div>
        </div>
        <div className="language-pill">🏆 {t.live}</div>
      </div>

      {loading && <div className="card-dark"><strong>{t.loadingWorldCupData}</strong><p className="subtle">{t.checkingJsonSource}</p></div>}

      {error && <div className="alert-card danger"><div><strong>{t.fixturesUnavailable}</strong><p>{error}</p></div></div>}

      <div className="feature-card green">
        <span className="feature-emoji">⚽</span>
        <div>
          <h3>{t.matchDayAssistant}</h3>
          <p>{t.chooseMatchDesc}</p>
          {apiCounts.games > 0 && (
            <small>
              Live API loaded {apiCounts.games} games, {apiCounts.stadiums} stadiums, {apiCounts.teams} teams, and {apiCounts.groups} groups.
            </small>
          )}
        </div>
      </div>

      <div className="match-filter-panel">
        <input
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search teams, stadiums, cities..."
        />

        <div className="grid-2">
          <select className="input" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
            {stages.map((stage) => (
              <option key={stage}>{stage}</option>
            ))}
          </select>

          <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {["All", "Live", "Upcoming", "Finished"].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="match-status-tabs">
          <button className={statusFilter === "All" ? "active" : ""} onClick={() => setStatusFilter("All")}>All {counts.all}</button>
          <button className={statusFilter === "Live" ? "active" : ""} onClick={() => setStatusFilter("Live")}>Live {counts.live}</button>
          <button className={statusFilter === "Upcoming" ? "active" : ""} onClick={() => setStatusFilter("Upcoming")}>Upcoming {counts.upcoming}</button>
          <button className={statusFilter === "Finished" ? "active" : ""} onClick={() => setStatusFilter("Finished")}>Finished {counts.finished}</button>
        </div>
      </div>

      <div className="matches-list">
        {!loading && filteredMatches.length === 0 && !error && (
          <div className="card-dark">
            <strong>{t.noFixturesAvailable}</strong>
            <p className="subtle">{matches.length === 0 ? t.noFixtureRows : "No matches match your filters."}</p>
          </div>
        )}

        {filteredMatches.map((m) => {
          const status = getComputedStatus(m);
          const matchCountdown = status === "Upcoming" ? countdown(m) : "";

          return (
          <div className={`match-card-premium ${getMatchTone(m.city)}`} key={m.id || `${m.team1}-${m.team2}-${m.stadium}`}>
            <div className="match-card-header">
              <div>
                <div className="match-stage-line">
                  <span>#{m.matchNumber}</span>
                  <span>{m.stage || "Group Stage"}</span>
                  {m.group && <span>{m.group}</span>}
                </div>
                <h2>{m.homeTeam} vs {m.awayTeam}</h2>
                <p>{m.date} · {m.kickoffTime}</p>
              </div>
              <div className={`match-status-pill ${status.toLowerCase()}`}>
                {shouldShowScore(m) && <strong>{m.score}</strong>}
                <span>{status}</span>
                {matchCountdown && <small>{matchCountdown}</small>}
              </div>
            </div>
            <div className="match-detail-line">🏟 {m.stadium} · {m.city}{m.country ? `, ${m.country}` : ""}</div>
            <div className="match-detail-line">🎉 {t.afterMatch}: {m.fanZone}</div>
            <div className="match-actions-premium">
              <button className="primary-btn" onClick={() => planMatch(m)}>{t.planThisMatchDay}</button>
              <button className="stadium-map-btn" onClick={() => openStadiumPage(m)}>🏟 Stadium Page</button>
              <button className="stadium-map-btn" onClick={() => openStadiumMap(m)}>📍 {t.stadiumMap}</button>
            </div>
          </div>
        );})}
      </div>

      <h3>🏟 {t.stadiumGuide}</h3>
      {stadiums.slice(0, 8).map((s) => (
        <div
          className="list-card stadium-list-button"
          key={s.id || s.name}
          onClick={() => {
            setSelectedStadium(getStadiumDestination(s.name, s.city) || {
              name: s.name,
              city: s.city,
              lat: 39.8283,
              lng: -98.5795,
              emoji: "🏟",
              type: "stadium"
            });
            setTab("stadium");
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            setSelectedStadium(getStadiumDestination(s.name, s.city) || {
              name: s.name,
              city: s.city,
              lat: 39.8283,
              lng: -98.5795,
              emoji: "🏟",
              type: "stadium"
            });
            setTab("stadium");
          }}
        >
          <div className="thumb">🏟</div>
          <div>
            <strong>{s.name}</strong>
            <p>{s.city} {s.country ? `· ${s.country}` : ""}</p>
            <p>👥 {s.capacity} · {s.tip}</p>
          </div>
          <FavoriteButton
            compact
            item={{
              item_type: "stadium",
              item_id: s.name,
              name: s.name,
              city: s.city,
              metadata: {
                destination: getStadiumDestination(s.name, s.city) || null
              }
            }}
          />
        </div>
      ))}
    </div>
  );
}
