import { discoverTravelPlaces, validateTravelDiscoveryRequest } from "../src/lib/travelDiscoveryPlaces";
import { TRAVEL_DISCOVERY_SCHEMA_VERSION } from "../src/lib/travelDiscoveryTypes";
import { createGeoapifyTravelDiscoveryProvider } from "../src/server/travelDiscoveryGeoapify";
import { resolveTrustedDestinationCoordinates } from "../src/server/travelDiscoveryDestination";
import { authenticateTravelDiscoveryRequest } from "../src/server/travelDiscoveryAuth";
import { TravelDiscoveryMemoryCache } from "../src/server/travelDiscoveryCache";
import type { TravelDiscoveryProviderRawResult } from "../src/lib/travelDiscoveryTypes";

declare const process: { env: Record<string, string | undefined> };
const cache = new TravelDiscoveryMemoryCache<TravelDiscoveryProviderRawResult>(50);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json(safeError("INVALID_REQUEST", "Method not allowed."));
  const user = await authenticateTravelDiscoveryRequest(req);
  if (!user) return res.status(401).json(safeError("AUTH_REQUIRED", "Authentication is required."));
  const validation = validateTravelDiscoveryRequest(req.body || {});
  if (validation.ok === false) return res.status(400).json({ schemaVersion: TRAVEL_DISCOVERY_SCHEMA_VERSION, places: [], freshness: { class: "unknown" }, errors: [validation.error] });
  const apiKey = process.env.GEOAPIFY_API_KEY?.trim();
  if (!apiKey) return res.status(503).json(safeError("PROVIDER_UNAVAILABLE", "Discovery is temporarily unavailable."));
  try {
    const result = await discoverTravelPlaces(validation.request, createGeoapifyTravelDiscoveryProvider({ apiKey, resolveCoordinates: resolveTrustedDestinationCoordinates, cache,
      onDiagnostic: process.env.NODE_ENV !== "production" && process.env.FANATLAS_TRAVEL_DISCOVERY_DIAGNOSTICS === "true"
        ? (diagnostic) => console.info("Geoapify upstream diagnostic", diagnostic)
        : undefined }));
    const status = result.errors.some((error) => error.code === "AUTH_REQUIRED") ? 503 : result.errors.some((error) => error.code === "RATE_LIMITED") ? 429 : 200;
    return res.status(status).json(result);
  } catch {
    return res.status(503).json(safeError("PROVIDER_UNAVAILABLE", "Discovery is temporarily unavailable."));
  }
}

function safeError(code: string, message: string) {
  return { schemaVersion: TRAVEL_DISCOVERY_SCHEMA_VERSION, places: [], freshness: { class: "unknown" }, errors: [{ code, message, retryable: code !== "AUTH_REQUIRED" }] };
}
