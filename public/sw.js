const SHELL_CACHE = "kirtan-oasis-shell-v2";
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
  const url = new URL(request.url);
  const locale = /^\/(en|ru)(?:\/|$)/.exec(url.pathname)?.[1] || "en";
  const favoritesUrl = new URL(`/${locale}/favorites`, url.origin).href;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (!response.ok) throw new Error("Navigation failed");
    await cache.put(request, response.clone());
    return response;
  } catch {
    const favorites = await cache.match(favoritesUrl, { ignoreVary: true });
    if (favorites) {
      if (url.pathname.replace(/\/$/, "") !== `/${locale}/favorites`) {
        return Response.redirect(favoritesUrl, 302);
      }
      return favorites;
    }
    const cached = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;
    throw new Error("Offline");
  } finally {
    clearTimeout(timer);
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
