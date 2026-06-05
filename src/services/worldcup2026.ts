export type FanAtlasMatch = {
  id: string;
  team1: string;
  team2: string;
  stadium: string;
  city: string;
  country?: string;
  date: string;
  time: string;
  status: string;
  score?: string;
  fanZone: string;
};

export type FanAtlasStadium = {
  id: string;
  name: string;
  city: string;
  country: string;
  capacity: string;
  tip: string;
};

function asArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.games)) return payload.games;
  if (Array.isArray(payload?.matches)) return payload.matches;
  if (Array.isArray(payload?.response)) return payload.response;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
}

function get(obj: any, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = key.split(".").reduce((acc, part) => acc?.[part], obj);
    if (value !== undefined && value !== null && value !== "") return String(value);
  }
  return fallback;
}

function fanZoneForCity(city: string) {
  const normalized = (city || "").toLowerCase();

  if (normalized.includes("new york") || normalized.includes("jersey")) return "Times Square Fan Park";
  if (normalized.includes("los angeles") || normalized.includes("inglewood")) return "SoFi Fan Village";
  if (normalized.includes("mexico")) return "Azteca Fan Fest";
  if (normalized.includes("toronto")) return "Toronto Fan Experience";
  if (normalized.includes("dallas") || normalized.includes("arlington")) return "AT&T Fan Hub";
  if (normalized.includes("miami")) return "Hard Rock Fan Zone";
  if (normalized.includes("vancouver")) return "Vancouver Waterfront Fan Zone";
  if (normalized.includes("seattle")) return "Seattle Waterfront Fan Zone";
  if (normalized.includes("atlanta")) return "Atlanta Fan Plaza";
  if (normalized.includes("philadelphia")) return "Philadelphia Fan Fest";

  return "Nearby Fan Zone";
}

export async function getWorldCup2026Games(): Promise<FanAtlasMatch[]> {
  const res = await fetch("/api/worldcup2026?resource=games");
  if (!res.ok) throw new Error("Could not load World Cup 2026 games");

  const payload = await res.json();
  const rows = asArray(payload.data);

  return rows.map((item: any, index: number) => {
    const team1 =
      get(item, ["home_team.name", "home.name", "team1", "home_team", "homeTeam", "home", "team_a", "teamA"], "TBD");

    const team2 =
      get(item, ["away_team.name", "away.name", "team2", "away_team", "awayTeam", "away", "team_b", "teamB"], "TBD");

    const stadium =
      get(item, ["stadium.name", "stadium", "venue.name", "venue", "stadium_name"], "World Cup Stadium");

    const city =
      get(item, ["city", "stadium.city", "venue.city", "host_city"], "Host City");

    const date =
      get(item, ["date", "match_date", "datetime", "time", "kickoff"], "TBD");

    const status =
      get(item, ["status", "match_status", "state"], "Scheduled");

    const homeScore = get(item, ["home_score", "score.home", "goals.home"], "");
    const awayScore = get(item, ["away_score", "score.away", "goals.away"], "");
    const score = homeScore !== "" && awayScore !== "" ? `${homeScore} - ${awayScore}` : undefined;

    return {
      id: get(item, ["id", "_id", "match_id", "game_id"], String(index)),
      team1,
      team2,
      stadium,
      city,
      date,
      time: get(item, ["hour", "match_time", "kickoff_time"], "TBD"),
      status,
      score,
      fanZone: fanZoneForCity(city)
    };
  });
}

export async function getWorldCup2026Stadiums(): Promise<FanAtlasStadium[]> {
  const res = await fetch("/api/worldcup2026?resource=stadiums");
  if (!res.ok) throw new Error("Could not load World Cup 2026 stadiums");

  const payload = await res.json();
  const rows = asArray(payload.data);

  return rows.map((item: any, index: number) => {
    const city = get(item, ["city", "host_city"], "Host City");

    return {
      id: get(item, ["id", "_id", "stadium_id"], String(index)),
      name: get(item, ["name", "stadium", "stadium_name"], "World Cup Stadium"),
      city,
      country: get(item, ["country"], ""),
      capacity: get(item, ["capacity"], "TBD"),
      tip: city ? `Use official transport in ${city}` : "Use official transport and arrive early"
    };
  });
}
