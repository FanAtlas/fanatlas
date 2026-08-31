/* global caches, fetch, self, Response, URL */
const CACHE_VERSION = "fanatlas-offline-2026-08-30-v1";
const STATIC_CACHE = `fanatlas-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `fanatlas-runtime-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

const APP_SHELL_RESPONSE = "FanAtlas is offline and the app shell was not cached yet.";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name !== STATIC_CACHE && name !== RUNTIME_CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/rest/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstDocument(request));
    return;
  }

  if (["script", "style", "image", "font", "worker"].includes(request.destination)) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirstDocument(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put("/index.html", response.clone());
    return response;
  } catch {
    const cached = await caches.match("/index.html");
    return cached || new Response(APP_SHELL_RESPONSE, {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}
