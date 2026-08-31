import { isOffline } from "./connectivity";
import { supabase } from "./supabase";
import type {
  TripDayLiveContextRequest,
  TripDayLiveContextResponse
} from "./tripDayLiveContext";

export const TRIP_DAY_LIVE_CONTEXT_API_PATH = "/api/trip-day-live-context";

export async function sendTripDayLiveContextRequest(
  request: TripDayLiveContextRequest,
  options: { signal?: AbortSignal } = {}
): Promise<TripDayLiveContextResponse> {
  if (isOffline()) {
    throw Object.assign(new Error("tripDayLiveContext.error.offline"), { code: "offline" });
  }

  const session = await supabase?.auth.getSession();
  const token = session?.data.session?.access_token;
  if (!token) throw Object.assign(new Error("tripDayLiveContext.error.unauthenticated"), { code: "unauthenticated" });

  const response = await fetch(TRIP_DAY_LIVE_CONTEXT_API_PATH, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ version: "1", ...request }),
    signal: options.signal
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(String(payload?.errorCode || payload?.error || "tripDayLiveContext.error.failed")), {
      code: payload?.errorCode || "server_error",
      status: response.status,
      response: payload
    });
  }

  return normalizeTripDayLiveContextResponse(payload);
}

function normalizeTripDayLiveContextResponse(payload: any): TripDayLiveContextResponse {
  if (payload && typeof payload === "object" && payload.kind && payload.status) {
    return payload as TripDayLiveContextResponse;
  }
  throw Object.assign(new Error("tripDayLiveContext.error.invalidResponse"), { code: "invalid_response" });
}
