import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, MapPin, Search, Users } from "lucide-react";
import {
  getWorldCup2026Games,
  getWorldCup2026Groups,
  getWorldCup2026StadiumsWithFallback,
  getWorldCup2026Teams,
  FanAtlasMatch,
  FanAtlasStadium
} from "../services/worldcup2026";
import { savedWorldCup2026Matches, savedWorldCup2026Stadiums } from "../data/worldCup2026Schedule";
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

const MATCHES_CACHE_KEY = "fanatlas_matches_cache";

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

function readCachedMatches() {
  try {
    const cached = localStorage.getItem(MATCHES_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed as FanAtlasMatch[]
      : null;
  } catch {
    return null;
  }
}

function cacheMatches(matches: FanAtlasMatch[]) {
  try {
    localStorage.setItem(MATCHES_CACHE_KEY, JSON.stringify(matches));
  } catch {
    // Non-critical: private browsing or storage limits should not block matches.
  }
}

function matchIdentity(match: FanAtlasMatch) {
  return [
    match.matchNumber || "",
    match.homeTeam || match.team1,
    match.awayTeam || match.team2,
    match.stadium
  ].join("|").toLowerCase();
}

function mergeLiveStatus(currentMatches: FanAtlasMatch[], liveMatches: FanAtlasMatch[]) {
  const liveById = new Map(liveMatches.map((match) => [match.id, match]));
  const liveByNumber = new Map(liveMatches.map((match) => [match.matchNumber, match]));
  const liveByIdentity = new Map(liveMatches.map((match) => [matchIdentity(match), match]));

  return currentMatches.map((match) => {
    const live = liveById.get(match.id) ||
      liveByNumber.get(match.matchNumber) ||
      liveByIdentity.get(matchIdentity(match));

    if (!live) return match;

    const hasRealScore = live.status === "Finished" &&
      live.homeScore !== null &&
      live.homeScore !== undefined &&
      live.awayScore !== null &&
      live.awayScore !== undefined;

    return {
      ...match,
      status: live.status,
      homeScore: hasRealScore ? live.homeScore : null,
      awayScore: hasRealScore ? live.awayScore : null,
      score: hasRealScore ? `${live.homeScore} - ${live.awayScore}` : undefined
    };
  });
}

function flagForTeam(team: string) {
  const flags: Record<string, string> = {
    Argentina: "🇦🇷",
    Brazil: "🇧🇷",
    Canada: "🇨🇦",
    Egypt: "🇪🇬",
    England: "🏴",
    France: "🇫🇷",
    Germany: "🇩🇪",
    Italy: "🇮🇹",
    Japan: "🇯🇵",
    Mexico: "🇲🇽",
    Morocco: "🇲🇦",
    Portugal: "🇵🇹",
    Spain: "🇪🇸",
    "United States": "🇺🇸",
    USA: "🇺🇸"
  };

  return flags[team] || "🌍";
}

function matchTimeLabel(status: string) {
  if (status === "Finished") return "Final result";
  return "Archived fixture";
}

export function MatchesPage({ setMapDestination, setSelectedStadium, setTab, setSelectedMatch }: Props) {
  const { language, t } = useLanguage();
  const [matches, setMatches] = useState<FanAtlasMatch[]>(() => readCachedMatches() || savedWorldCup2026Matches);
  const [stadiums, setStadiums] = useState<FanAtlasStadium[]>(savedWorldCup2026Stadiums);
  const [updatingLiveSchedule, setUpdatingLiveSchedule] = useState(false);
  const [error, setError] = useState("");
  const [apiCounts, setApiCounts] = useState({ games: 0, groups: 0, stadiums: 0, teams: 0 });
  const [usingSavedSchedule, setUsingSavedSchedule] = useState(() => !readCachedMatches());
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const source = usingSavedSchedule
    ? "Saved World Cup 2026 archive. Historical data may refresh when available."
    : t.worldCupFixtures;

  useEffect(() => {
    async function loadWorldCupData() {
      setUpdatingLiveSchedule(true);
      try {
        const [liveMatches, venueResult, teams, groups] = await Promise.all([
          getWorldCup2026Games(),
          getWorldCup2026StadiumsWithFallback(),
          getWorldCup2026Teams().catch(() => []),
          getWorldCup2026Groups().catch(() => [])
        ]);
        const venues = venueResult.stadiums;

        if (liveMatches.length > 0) {
          cacheMatches(liveMatches);
          setMatches((currentMatches) => mergeLiveStatus(
            currentMatches.length > 0 ? currentMatches : savedWorldCup2026Matches,
            liveMatches
          ));
          setUsingSavedSchedule(false);
        }

        setApiCounts({
          games: liveMatches.length,
          groups: groups.length,
          stadiums: venues.length,
          teams: teams.length
        });
        setError("");
        if (venues.length > 0) setStadiums(venues);
      } catch {
        setApiCounts({ games: 0, groups: 0, stadiums: 0, teams: 0 });
        setError("");
      } finally {
        setUpdatingLiveSchedule(false);
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
    upcoming: matches.filter((match) => getComputedStatus(match) === "Upcoming").length,
    finished: matches.filter((match) => getComputedStatus(match) === "Finished").length
  }), [matches]);

  return (
    <div dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="topbar">
        <div>
          <div className="brand">World Cup <span>2026 Archive</span></div>
          <div className="subtle">{source}</div>
        </div>
        <div className="language-pill">Archive</div>
      </div>

      {updatingLiveSchedule && (
        <div className="match-update-banner">Loading tournament archive...</div>
      )}

      {error && <div className="alert-card danger"><div><strong>Schedule unavailable</strong><p>{error}</p></div></div>}

      {usingSavedSchedule && !error && (
        <div className="alert-card warning">
          <div>
            <strong>Showing saved World Cup 2026 archive. Results appear only when historical data includes them.</strong>
          </div>
        </div>
      )}

      <div className="match-center-hero">
        <span className="match-hero-icon">⚽</span>
        <div>
          <h3>World Cup 2026 Archive</h3>
          <p>Browse completed fixtures, results when available, stadiums, and host-city travel history.</p>
        </div>
      </div>

      <div className="match-filter-panel">
        <label className="match-search-field">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search teams, stadiums or cities"
          />
        </label>

        <div className="match-filter-grid">
          <label className="match-select-field">
            <span>Competition</span>
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
              {stages.map((stage) => (
                <option key={stage}>{stage}</option>
              ))}
            </select>
          </label>

          <label className="match-select-field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All archive</option>
              <option value="Finished">Final results</option>
              <option value="Upcoming">Archived fixtures</option>
            </select>
          </label>
        </div>

        <div className="match-status-tabs">
          <button className={statusFilter === "All" ? "active" : ""} onClick={() => setStatusFilter("All")}>Archive <span>{counts.all}</span></button>
          <button className={statusFilter === "Finished" ? "active" : ""} onClick={() => setStatusFilter("Finished")}>Results <span>{counts.finished}</span></button>
          <button className={statusFilter === "Upcoming" ? "active" : ""} onClick={() => setStatusFilter("Upcoming")}>Fixtures <span>{counts.upcoming}</span></button>
        </div>
      </div>

      <div className="matches-list">
        {filteredMatches.length === 0 && !error && (
          <div className="card-dark">
            <strong>No archive entries found.</strong>
            <p className="subtle">{matches.length === 0 ? t.noFixtureRows : "Adjust filters or search another team, stadium, or city."}</p>
          </div>
        )}

        {filteredMatches.map((m) => {
          const status = getComputedStatus(m);
          const stadium = stadiums.find((item) => item.name === m.stadium);

          return (
          <div className={`match-card-premium ${getMatchTone(m.city)}`} key={m.id || `${m.team1}-${m.team2}-${m.stadium}`}>
            <div className="match-card-header">
              <div className="match-stage-line">
                <span>{m.stage || "Group Stage"}</span>
                {m.group && <span>{m.group}</span>}
              </div>
              <div className={`match-status-pill ${status.toLowerCase()}`}>
                {shouldShowScore(m) && <strong>{m.score}</strong>}
                <span>{matchTimeLabel(status)}</span>
              </div>
            </div>

            <div className="match-teams">
              <div className="match-team">
                <span>{flagForTeam(m.homeTeam)}</span>
                <strong>{m.homeTeam}</strong>
              </div>
              <div className="match-vs">VS</div>
              <div className="match-team">
                <span>{flagForTeam(m.awayTeam)}</span>
                <strong>{m.awayTeam}</strong>
              </div>
            </div>

            <div className="match-info-grid">
              <div><CalendarDays size={16} /><span>{m.date}</span></div>
              <div><MapPin size={16} /><span>{m.stadium}<small>{m.city}{m.country ? `, ${m.country}` : ""}</small></span></div>
              <div><Clock size={16} /><span>{m.stadiumTime || m.kickoffTime}<small>{m.userLocalTime || `Your local time: ${m.kickoffTime}`}</small></span></div>
              <div><Users size={16} /><span>Capacity<small>{stadium?.capacity || "Venue guide"}</small></span></div>
            </div>

            <div className="match-actions-premium">
              <button className="primary-btn" onClick={() => planMatch(m)}>View Event Plan</button>
              <button className="stadium-map-btn" onClick={() => openStadiumPage(m)}>Stadium Info</button>
              <button className="stadium-map-btn" onClick={() => openStadiumMap(m)}>Open Map</button>
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
