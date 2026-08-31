const SERVICE_WORKER_PATH = "/sw.js";

export async function registerFanAtlasServiceWorker() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;

  try {
    return await navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: "/" });
  } catch (error) {
    console.debug("FanAtlas service worker registration failed:", error);
    return null;
  }
}
