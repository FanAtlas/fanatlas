import type { FanAtlasAIRequest } from "../../lib/fanAtlasAIContracts";
import type { TravelTask } from "../../lib/travelIntelligenceTypes";

export async function createAIRequestFingerprint(input: {
  userId: string;
  request: FanAtlasAIRequest;
  task: TravelTask;
}) {
  const normalized = JSON.stringify({
    version: input.request.version,
    userId: input.userId,
    clientRequestId: input.request.clientRequestId,
    conversationId: input.request.conversationId || "",
    task: input.task,
    messageHash: await sha256(input.request.message.trim()),
    activeTripId: input.request.activeTripId || "",
    scopes: [...(input.request.requestedContextScopes || [])].sort(),
    consent: {
      allowActiveTrip: input.request.consent.allowActiveTrip,
      allowTravelPreferences: input.request.consent.allowTravelPreferences,
      allowPassportHistory: input.request.consent.allowPassportHistory,
      allowTravelInsights: input.request.consent.allowTravelInsights,
      allowSavedPlaces: input.request.consent.allowSavedPlaces,
      allowJournalMetadata: input.request.consent.allowJournalMetadata,
      allowJournalContent: input.request.consent.allowJournalContent,
      allowCurrentLocation: input.request.consent.allowCurrentLocation
    }
  });
  return sha256(normalized);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  // Test-only fallback for older JS runtimes. Production Node 20 provides Web Crypto.
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
