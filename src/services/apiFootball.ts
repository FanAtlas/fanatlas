export async function getWorldCupFixtures() {
  const key = import.meta.env.VITE_API_FOOTBALL_KEY;
  if (!key) throw new Error("Missing VITE_API_FOOTBALL_KEY");

  const res = await fetch("https://v3.football.api-sports.io/fixtures?league=1&season=2026", {
    headers: { "x-apisports-key": key }
  });

  if (!res.ok) throw new Error("Failed to fetch API-Football fixtures");
  return res.json();
}
