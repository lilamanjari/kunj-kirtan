const SHELL_CACHE = "kirtan-oasis-shell-v1";
const MEDIA_CACHE = "kirtan-oasis-media-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("Offline");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.headers.has("range")) return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/__offline/audio/")) {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }

  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }

  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/") ||
      request.destination === "script" ||
      request.destination === "style" ||
      request.destination === "font")
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});
