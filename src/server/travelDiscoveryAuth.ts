declare const process: { env: Record<string, string | undefined> };

export async function authenticateTravelDiscoveryRequest(req: any): Promise<{ id: string } | null> {
  const token = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  if (process.env.FANATLAS_TRAVEL_DISCOVERY_MOCK === "true" && token === "test-token") return { id: "test-user" };
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  try {
    const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    const user = await response.json().catch(() => ({}));
    return user?.id ? { id: String(user.id) } : null;
  } catch { return null; }
}
