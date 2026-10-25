"use client";

import { useEffect } from "react";

// Also mounted on /admin, which doesn't mount the public site's registrar.
export default function DevelopmentServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !("serviceWorker" in navigator)) return;
    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.filter((registration) => {
        const worker = registration.active ?? registration.waiting ?? registration.installing;
        return worker && new URL(worker.scriptURL).pathname === "/sw.js";
      }).map((registration) => registration.unregister()));
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.filter((name) => name.startsWith("kirtan-oasis-shell-"))
          .map((name) => caches.delete(name)));
      }
    })().catch(() => {
      // Storage restrictions shouldn't prevent the page from loading.
    });
  }, []);
  return null;
}
