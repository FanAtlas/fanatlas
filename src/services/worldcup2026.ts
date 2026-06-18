export type MatchStatus = "Upcoming" | "Live" | "Finished";

export type FanAtlasMatch = {
  id: string;
  matchNumber: number;
  homeTeam: string;
  awayTeam: string;
  group?: string;
  stage: string;
  date: string;
  kickoffTime: string;
  stadium: string;
  city: string;
  country: string;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  team1: string;
  team2: string;
  time: string;
  stadiumTime?: string;
  userLocalTime?: string;
  score?: string;
  kickoffUtc?: string;
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

export type WorldCupTeam = {
  id: string;
  name: string;
  fifaCode?: string;
  group?: string;
};

export type WorldCupGroup = {
  id: string;
  name: string;
  teams: unknown[];
};

export type WorldCupApiMeta = {
  games: number;
  groups: number;
  stadiums: number;
  teams: number;
};

const API_BASE = "https://worldcup26.ir/get";

export const worldCup2026ApiEndpoints = {
  games: `${API_BASE}/games`,
  groups: `${API_BASE}/groups`,
  stadiums: `${API_BASE}/stadiums`,
  teams: `${API_BASE}/teams`
};

let meta: WorldCupApiMeta = {
  games: 0,
  groups: 0,
  stadiums: 0,
  teams: 0
};

function asArray(payload: any, resource: "games" | "groups" | "stadiums" | "teams") {
  if (Array.isArray(payload?.data?.[resource])) return payload.data[resource];
  if (Array.isArray(payload?.[resource])) return payload[resource];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function get(obj: any, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = key.split(".").reduce((acc, part) => acc?.[part], obj);
    if (value !== undefined && value !== null && value !== "" && value !== "null") {
      return String(value);
    }
  }
  return fallback;
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

async function fetchJson(resource: "games" | "groups" | "stadiums" | "teams") {
  const url = worldCup2026ApiEndpoints[resource];

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const trimmed = text.trim();

    if (trimmed.startsWith("export default") || trimmed.startsWith("export ") || trimmed.startsWith("<")) {
      throw new Error(`Invalid JSON response from ${url}`);
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("World Cup API error:", error);
    throw error;
  }
}

async function fetchRows(resource: "games" | "groups" | "stadiums" | "teams") {
  const json = await fetchJson(resource);
  const rows = asArray(json, resource);
  meta = { ...meta, [resource]: rows.length };
  return rows;
}

function normalizeStage(type: string) {
  const normalized = type.trim().toLowerCase();
  if (!normalized || normalized === "group") return "Group Stage";
  if (normalized === "round_of_32" || normalized === "round of 32") return "Round of 32";
  if (normalized === "round_of_16" || normalized === "round of 16") return "Round of 16";
  if (normalized === "quarterfinal" || normalized === "quarter-final") return "Quarterfinal";
  if (normalized === "semifinal" || normalized === "semi-final") return "Semifinal";
  if (normalized === "third_place" || normalized === "third place") return "Third Place";
  if (normalized === "final") return "Final";
  return type;
}

function normalizeCountry(country: string) {
  if (country === "United States") return "USA";
  return country || "";
}

function parseLocalDate(value: string) {
  if (!value) {
    return {
      date: "Date unavailable",
      kickoffTime: "Time unavailable",
      kickoffUtc: undefined,
      userLocalTime: undefined
    };
  }

  const [datePart, timePart = ""] = value.split(" ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [hour = 0, minute = 0] = timePart.split(":").map(Number);

  if (!month || !day || !year) {
    return {
      date: value,
      kickoffTime: timePart || "Time unavailable",
      kickoffUtc: undefined,
      userLocalTime: undefined
    };
  }

  const localDate = new Date(year, month - 1, day, hour, minute);
  const readableDate = localDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  const readableTime = timePart
    ? localDate.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit"
      })
    : "Time unavailable";

  return {
    date: readableDate,
    kickoffTime: readableTime,
    kickoffUtc: Number.isNaN(localDate.getTime()) ? undefined : localDate.toISOString(),
    userLocalTime: readableTime === "Time unavailable" ? undefined : `User local time: ${readableTime}`
  };
}

function normalizeStatus(game: any): MatchStatus {
  const finished = get(game, ["finished"], "").toUpperCase();
  const elapsed = get(game, ["time_elapsed"], "notstarted").toLowerCase();

  if (finished === "TRUE") return "Finished";
  if (elapsed && elapsed !== "notstarted" && elapsed !== "finished") return "Live";
  return "Upcoming";
}

function fanZoneForCity(city: string) {
  const normalized = city.toLowerCase();

  if (normalized.includes("new york") || normalized.includes("jersey")) return "Times Square Fan Park";
  if (normalized.includes("los angeles")) return "SoFi Fan Village";
  if (normalized.includes("mexico")) return "Azteca Fan Fest";
  if (normalized.includes("toronto")) return "Toronto Fan Experience";
  if (normalized.includes("vancouver")) return "Vancouver Waterfront Fan Zone";
  if (normalized.includes("boston")) return "Boston Fan Zone";
  if (normalized.includes("san francisco") || normalized.includes("bay area")) return "Bay Area Fan Zone";
  if (normalized.includes("guadalajara")) return "Guadalajara Fan Fest";
  if (normalized.includes("dallas")) return "AT&T Fan Hub";
  if (normalized.includes("miami")) return "Hard Rock Fan Zone";
  if (normalized.includes("seattle")) return "Seattle Fan Zone";
  if (normalized.includes("houston")) return "Houston Fan Fest";
  if (normalized.includes("atlanta")) return "Atlanta Fan Plaza";
  if (normalized.includes("philadelphia")) return "Philadelphia Fan Fest";
  if (normalized.includes("kansas")) return "Kansas City Soccer Village";
  if (normalized.includes("monterrey")) return "Monterrey Fan Zone";

  return "Nearby Fan Zone";
}

function stadiumTip(city: string) {
  const normalized = city.toLowerCase();

  if (normalized.includes("mexico")) return "Hydrate and prepare for altitude.";
  if (normalized.includes("los angeles")) return "Expect traffic. Use rideshare zones or shuttles.";
  if (normalized.includes("new york") || normalized.includes("jersey")) return "Use train and official shuttle where available.";
  if (normalized.includes("dallas")) return "Prepare for heat and parking delays.";
  if (normalized.includes("toronto")) return "Use TTC or GO Transit.";
  if (normalized.includes("vancouver")) return "Use SkyTrain and walkable downtown routes.";

  return "Use official transport and arrive early.";
}

function normalizeStadium(row: any): FanAtlasStadium {
  const city = get(row, ["city_en", "city", "host_city"], "Host City");
  const name = get(row, ["fifa_name", "name_en", "name", "stadium"], "World Cup Stadium");

  return {
    id: get(row, ["id", "_id", "stadium_id"], name),
    name,
    city,
    country: normalizeCountry(get(row, ["country_en", "country"], "")),
    capacity: get(row, ["capacity"], "TBD"),
    tip: stadiumTip(city)
  };
}

function normalizeMatch(game: any, stadiumById: Map<string, FanAtlasStadium>): FanAtlasMatch {
  const stadiumId = get(game, ["stadium_id", "stadiumId"], "");
  const stadium = stadiumById.get(stadiumId);
  const parsedDate = parseLocalDate(get(game, ["local_date"], ""));
  const status = normalizeStatus(game);
  const homeScore = status === "Finished" ? toNumber(get(game, ["home_score", "homeScore"], "")) : null;
  const awayScore = status === "Finished" ? toNumber(get(game, ["away_score", "awayScore"], "")) : null;
  const homeTeam = get(game, ["home_team_name_en", "homeTeam", "home_team.name"], "Team unavailable");
  const awayTeam = get(game, ["away_team_name_en", "awayTeam", "away_team.name"], "Team unavailable");
  const city = stadium?.city || get(game, ["city", "host_city"], "Host City");
  const score = status === "Finished" && homeScore !== null && awayScore !== null
    ? `${homeScore} - ${awayScore}`
    : undefined;

  return {
    id: get(game, ["id", "_id"], crypto.randomUUID()),
    matchNumber: Number(get(game, ["id", "matchNumber", "match_number"], "")) || 0,
    homeTeam,
    awayTeam,
    group: get(game, ["group"], ""),
    stage: normalizeStage(get(game, ["type", "stage"], "")),
    date: parsedDate.date,
    kickoffTime: parsedDate.kickoffTime,
    stadium: stadium?.name || get(game, ["stadium", "stadium_name"], "Stadium unavailable"),
    city,
    country: stadium?.country || normalizeCountry(get(game, ["country"], "")),
    status,
    homeScore,
    awayScore,
    team1: homeTeam,
    team2: awayTeam,
    time: parsedDate.kickoffTime,
    stadiumTime: parsedDate.kickoffTime,
    userLocalTime: parsedDate.userLocalTime,
    score,
    kickoffUtc: parsedDate.kickoffUtc,
    fanZone: fanZoneForCity(city)
  };
}

export async function getWorldCup2026Stadiums(): Promise<FanAtlasStadium[]> {
  const rows = await fetchRows("stadiums");
  return rows.map(normalizeStadium);
}

export async function getWorldCup2026Games(): Promise<FanAtlasMatch[]> {
  const [gameRows, stadiumRows] = await Promise.all([
    fetchRows("games"),
    getWorldCup2026Stadiums()
  ]);
  const stadiumById = new Map(stadiumRows.map((stadium) => [stadium.id, stadium]));

  return gameRows
    .map((game) => normalizeMatch(game, stadiumById))
    .filter((match) => match.homeTeam !== "Team unavailable" && match.awayTeam !== "Team unavailable");
}

export async function getWorldCup2026Teams(): Promise<WorldCupTeam[]> {
  const rows = await fetchRows("teams");
  return rows.map((team: any) => ({
    id: get(team, ["id", "_id"], ""),
    name: get(team, ["name_en", "name"], "Team unavailable"),
    fifaCode: get(team, ["fifa_code"], ""),
    group: get(team, ["groups", "group"], "")
  }));
}

export async function getWorldCup2026Groups(): Promise<WorldCupGroup[]> {
  const rows = await fetchRows("groups");
  return rows.map((group: any) => ({
    id: get(group, ["_id", "id", "name"], ""),
    name: get(group, ["name"], ""),
    teams: Array.isArray(group?.teams) ? group.teams : []
  }));
}

export async function getWorldCup2026ApiMeta(): Promise<WorldCupApiMeta> {
  const [games, stadiums, teams, groups] = await Promise.all([
    fetchRows("games"),
    fetchRows("stadiums"),
    fetchRows("teams"),
    fetchRows("groups")
  ]);

  return {
    games: games.length,
    groups: groups.length,
    stadiums: stadiums.length,
    teams: teams.length
  };
}

export function getLastWorldCup2026ApiMeta() {
  return meta;
}
