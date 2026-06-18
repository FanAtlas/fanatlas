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
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const trimmed = text.trim();

    if (trimmed.startsWith("export ") || trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
      throw new Error("WorldCup2026 API returned non-JSON content");
    }

    const data = JSON.parse(text);

    return res.status(200).json({
      source: "worldcup26.ir",
      resource,
      data
    });
  } catch (error: any) {
    console.error("World Cup API error:", error);

    return res.status(500).json({
      error: "Server error fetching World Cup 2026 data",
      details: error?.message || "Unknown error"
    });
  }
}
