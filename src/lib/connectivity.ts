export type ConnectivityStatus = "online" | "offline" | "unknown";

export function readConnectivityStatus(): ConnectivityStatus {
  if (typeof navigator === "undefined") return "unknown";
  if (typeof navigator.onLine !== "boolean") return "unknown";
  return navigator.onLine ? "online" : "offline";
}

export function isOffline(): boolean {
  return readConnectivityStatus() === "offline";
}

