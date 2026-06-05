export default async function handler(req: any, res: any) {
  try {
    const allowedResources: Record<string, string> = {
      games: "https://worldcup26.ir/get/games",
      stadiums: "https://worldcup26.ir/get/stadiums",
      teams: "https://worldcup26.ir/get/teams",
      groups: "https://worldcup26.ir/get/groups"
    };

    const resource = String(req.query.resource || "games");
    const url = allowedResources[resource];

    if (!url) {
      return res.status(400).json({
        error: "Invalid resource",
        allowed: Object.keys(allowedResources)
      });
    }

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: "WorldCup2026 API request failed",
        status: response.status
      });
    }

    const data = await response.json();

    return res.status(200).json({
      source: "worldcup26.ir",
      resource,
      data
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error fetching World Cup 2026 data",
      details: error?.message || "Unknown error"
    });
  }
}
