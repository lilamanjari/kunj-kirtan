const SHELL_CACHE = "kirtan-oasis-shell-v3";
const MEDIA_CACHE = "kirtan-oasis-media-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("kirtan-oasis-shell-") && name !== SHELL_CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) {
    await cache.put(request, response.clone());
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

  // Dev chunk URLs are reused after edits. An old worker must not serve them.
  if (["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname)) return;
  const isAdmin = (pathname) => /^\/(?:api\/)?admin(?:\/|$)/.test(pathname);
  if (isAdmin(url.pathname)) return;
  // Keep the admin's scripts/styles/images on the network as well.
  if (request.referrer && isAdmin(new URL(request.referrer).pathname)) return;
  if (url.pathname.startsWith("/_next/") && !url.pathname.startsWith("/_next/static/")) return;

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
