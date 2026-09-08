"use client";

import type { KirtanSummary } from "@/types/kirtan";
import {
  buildOfflineAudioCacheUrl,
  OFFLINE_MEDIA_CACHE,
  OFFLINE_SHELL_CACHE,
} from "./constants";

function supportsCaches() {
  return typeof window !== "undefined" && "caches" in window;
}

async function openCache(name: string) {
  return caches.open(name);
}

function getOfflineAudioDownloadUrl(kirtanId: string) {
  return `/api/offline/audio/${encodeURIComponent(kirtanId)}`;
}

function getShellAssetUrls(html: string) {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return [];
  }

  const document = new DOMParser().parseFromString(html, "text/html");
  const urls = new Set<string>();
  document
    .querySelectorAll<HTMLScriptElement | HTMLLinkElement | HTMLImageElement>(
      "script[src], link[href], img[src]",
    )
    .forEach((element) => {
      const value =
        element instanceof HTMLLinkElement
          ? element.href
          : element.src;
      if (!value) return;

      const url = new URL(value, window.location.origin);
      if (url.origin === window.location.origin) {
        urls.add(url.href);
      }
    });

  return [...urls];
}

async function cacheShellResponse(cache: Cache, url: string) {
  const response = await fetch(url, { cache: "reload" });
  if (!response.ok) return;

  await cache.put(url, response.clone());
  const html = await response.text();
  const assets = getShellAssetUrls(html);

  await Promise.all(
    assets.map(async (assetUrl) => {
      try {
        const assetResponse = await fetch(assetUrl, { cache: "reload" });
        if (assetResponse.ok || assetResponse.type === "opaque") {
          await cache.put(assetUrl, assetResponse);
        }
      } catch {
        // The page document is still useful if a non-critical asset fails.
      }
    }),
  );
}

export async function cacheOfflineKirtanMedia(kirtan: KirtanSummary) {
  if (!supportsCaches()) {
    throw new Error("Offline cache is unavailable");
  }

  const mediaCache = await openCache(OFFLINE_MEDIA_CACHE);
  const audioResponse = await fetch(getOfflineAudioDownloadUrl(kirtan.id), {
    cache: "no-store",
  });
  if (!audioResponse.ok) {
    throw new Error("Unable to download audio");
  }

  const audioBlob = await audioResponse.blob();
  const audioCacheKey = buildOfflineAudioCacheUrl(kirtan.id);
  const audioHeaders = new Headers({
    "Content-Type": audioBlob.type || "audio/mpeg",
    "Content-Length": String(audioBlob.size),
  });

  await mediaCache.put(
    audioCacheKey,
    new Response(audioBlob, {
      headers: audioHeaders,
    }),
  );

  if (kirtan.lead_singer_image_url) {
    try {
      const imageResponse = await fetch(kirtan.lead_singer_image_url, {
        cache: "force-cache",
      });
      if (imageResponse.ok || imageResponse.type === "opaque") {
        await mediaCache.put(
          kirtan.lead_singer_image_url,
          imageResponse.clone(),
        );
      }
    } catch {
      // artwork caching is best-effort
    }
  }

  return {
    audioBytes: audioBlob.size,
    imageUrl: kirtan.lead_singer_image_url ?? null,
  };
}

export async function getOfflineAudioObjectUrl(kirtanId: string) {
  if (!supportsCaches()) {
    return null;
  }
  const mediaCache = await openCache(OFFLINE_MEDIA_CACHE);
  const response = await mediaCache.match(buildOfflineAudioCacheUrl(kirtanId));
  if (!response) return null;
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function removeOfflineKirtanMedia(
  kirtanId: string,
  imageUrl?: string | null,
) {
  if (!supportsCaches()) return;
  const mediaCache = await openCache(OFFLINE_MEDIA_CACHE);
  await mediaCache.delete(buildOfflineAudioCacheUrl(kirtanId));
  if (imageUrl) {
    await mediaCache.delete(imageUrl);
  }
}

export async function clearOfflineMediaCache() {
  if (!supportsCaches()) return;
  await caches.delete(OFFLINE_MEDIA_CACHE);
}

export async function warmOfflineShell(urls: string[]) {
  if (!supportsCaches()) return;
  const shellCache = await openCache(OFFLINE_SHELL_CACHE);
  await Promise.all(
    urls.map(async (url) => {
      try {
        await cacheShellResponse(shellCache, url);
      } catch {
        // ignore shell warm failures
      }
    }),
  );
}

export async function requestPersistentOfflineStorage() {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return false;
  }

  try {
    if (await navigator.storage.persisted?.()) {
      return true;
    }
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
