"use client";

import { useEffect } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { OFFLINE_SHELL_CACHE } from "@/lib/offline/constants";
import { getOfflineSnapshot } from "@/lib/net/offlineStore";

export default function ServiceWorkerRegistrar() {
  const locale = useLocale();
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // ignore registration failures
    });
  }, []);

  useEffect(() => {
    let disposed = false;
    const resume = async () => {
      if (document.visibilityState === "hidden" ||
          (navigator.onLine && !getOfflineSnapshot().isOffline) ||
          !("caches" in window)) return;
      const href = `/${locale}/favorites`;
      if (window.location.pathname.replace(/\/$/, "") === href) return;
      try {
        const cache = await caches.open(OFFLINE_SHELL_CACHE);
        if (await cache.match(href, { ignoreVary: true }) && !disposed) {
          window.location.replace(href);
        }
      } catch {
        // Leave the current page usable if browser storage is unavailable.
      }
    };
    void resume();
    window.addEventListener("pageshow", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      disposed = true;
      window.removeEventListener("pageshow", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [locale]);

  return null;
}
