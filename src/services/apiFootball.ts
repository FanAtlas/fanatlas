export async function getWorldCupFixtures() {
  const key = import.meta.env.VITE_API_FOOTBALL_KEY;
  if (!key) throw new Error("Missing VITE_API_FOOTBALL_KEY");

  try {
    const response = await fetch("https://v3.football.api-sports.io/fixtures?league=1&season=2026", {
      headers: {
        "Accept": "application/json",
        "x-apisports-key": key
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("World Cup API error:", error);
    throw error;
  }
}
