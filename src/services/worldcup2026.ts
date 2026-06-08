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
  if (Array.isArray(payload?.games)) return payload.games;
  if (Array.isArray(payload?.stadiums)) return payload.stadiums;
  if (Array.isArray(payload?.teams)) return payload.teams;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.response)) return payload.response;
  if (Array.isArray(payload?.result)) return payload.result;
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

function parseWorldCupDate(localDate: string) {
  if (!localDate || localDate === "TBD") {
    return { date: "TBD", time: "TBD" };
  }

  // API format example: 06/11/2026 13:00
  const [datePart, timePart] = localDate.split(" ");

  if (!datePart) {
    return { date: localDate, time: timePart || "TBD" };
  }

  const pieces = datePart.split("/");
  if (pieces.length !== 3) {
    return { date: datePart, time: timePart || "TBD" };
  }

  const [month, day, year] = pieces;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  const readableDate = Number.isNaN(date.getTime())
    ? datePart
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      });

  return {
    date: readableDate,
    time: timePart || "TBD"
  };
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
  if (normalized.includes("houston")) return "Houston Fan Fest";
  if (normalized.includes("kansas")) return "Kansas City Soccer Village";
  if (normalized.includes("boston")) return "Boston Fan Zone";
  if (normalized.includes("san francisco") || normalized.includes("bay area")) return "Bay Area Fan Zone";
  if (normalized.includes("guadalajara")) return "Guadalajara Fan Fest";
  if (normalized.includes("monterrey")) return "Monterrey Fan Zone";

  return "Nearby Fan Zone";
}

function stadiumTip(city: string) {
  const normalized = (city || "").toLowerCase();

  if (normalized.includes("mexico")) return "Hydrate and prepare for altitude.";
  if (normalized.includes("los angeles")) return "Expect traffic. Use rideshare zones or shuttles.";
  if (normalized.includes("new york") || normalized.includes("jersey")) return "Use train and official shuttle where available.";
  if (normalized.includes("dallas")) return "Prepare for heat and parking delays.";
  if (normalized.includes("toronto")) return "Use TTC or GO Transit.";
  if (normalized.includes("vancouver")) return "Use SkyTrain and walkable downtown routes.";

  return "Use official transport and arrive early.";
}

async function fetchResource(resource: "games" | "stadiums") {
  const res = await fetch(`/api/worldcup2026?resource=${resource}`);

  if (!res.ok) {
    throw new Error(`Could not load World Cup 2026 ${resource}`);
  }

  const payload = await res.json();

  // Vercel function returns:
  // { source, resource, data: { games: [...] } }
  // or { source, resource, data: { stadiums: [...] } }
  return payload?.data || payload;
}

export async function getWorldCup2026Stadiums(): Promise<FanAtlasStadium[]> {
  const payload = await fetchResource("stadiums");
  const rows = asArray(payload);

  return rows.map((item: any, index: number) => {
    const id = get(item, ["id", "_id", "stadium_id"], String(index));
    const city = get(item, ["city_en", "city", "host_city", "location"], "Host City");
    const name = get(item, ["name_en", "stadium_name_en", "name", "stadium", "stadium_name"], "World Cup Stadium");
    const country = get(item, ["country_en", "country"], "");
    const capacity = get(item, ["capacity"], "TBD");

    return {
      id,
      name,
      city,
      country,
      capacity,
      tip: stadiumTip(city)
    };
  });
}

export async function getWorldCup2026Games(): Promise<FanAtlasMatch[]> {
  const [gamesPayload, stadiumRows] = await Promise.all([
    fetchResource("games"),
    getWorldCup2026Stadiums().catch(() => [])
  ]);

  const games = asArray(gamesPayload);

  const stadiumById = new Map<string, FanAtlasStadium>();
  stadiumRows.forEach((stadium) => {
    stadiumById.set(String(stadium.id), stadium);
  });

  return games.map((item: any, index: number) => {
    const team1 = get(item, ["home_team_name_en", "home_team.name", "home.name", "home_team", "homeTeam"], "TBD");
    const team2 = get(item, ["away_team_name_en", "away_team.name", "away.name", "away_team", "awayTeam"], "TBD");

    const stadiumId = get(item, ["stadium_id"], "");
    const stadiumInfo = stadiumById.get(String(stadiumId));

    const stadium = stadiumInfo?.name || `Stadium #${stadiumId || "TBD"}`;
    const city = stadiumInfo?.city || "Host City";

    const localDate = get(item, ["local_date", "date", "match_date", "datetime", "kickoff"], "TBD");
    const parsed = parseWorldCupDate(localDate);

    const homeScore = get(item, ["home_score"], "");
    const awayScore = get(item, ["away_score"], "");
    const score = homeScore !== "" && awayScore !== "" ? `${homeScore} - ${awayScore}` : undefined;

    const finished = get(item, ["finished"], "FALSE").toLowerCase();
    const elapsed = get(item, ["time_elapsed"], "notstarted");

    let status = "Scheduled";
    if (finished === "true") status = "Finished";
    else if (elapsed && elapsed !== "notstarted") status = elapsed;

    return {
      id: get(item, ["id", "_id", "match_id", "game_id"], String(index)),
      team1,
      team2,
      stadium,
      city,
      country: stadiumInfo?.country || "",
      date: parsed.date,
      time: parsed.time,
      status,
      score,
      fanZone: fanZoneForCity(city)
    };
  });
}
