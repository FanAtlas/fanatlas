export type TravelPreparationNotificationPermission = "unsupported" | "default" | "granted" | "denied";

export function getTravelPreparationNotificationPermission(): TravelPreparationNotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window) || !window.Notification) return "unsupported";
  const permission = window.Notification.permission;
  if (permission === "granted" || permission === "denied") return permission;
  return "default";
}

export async function requestTravelPreparationNotificationPermission(): Promise<TravelPreparationNotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window) || !window.Notification) return "unsupported";
  if (window.Notification.permission === "granted") return "granted";
  if (window.Notification.permission === "denied") return "denied";
  const permission = await window.Notification.requestPermission();
  return permission === "granted" || permission === "denied" ? permission : "default";
}

export function showTravelPreparationNotification(input: { title: string; body: string }) {
  if (getTravelPreparationNotificationPermission() !== "granted") return false;
  try {
    new window.Notification(input.title, { body: input.body, tag: "fanatlas-trip-preparation" });
    return true;
  } catch {
    return false;
  }
}
