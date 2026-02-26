"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getOfflineSnapshot,
  setNavigatorStatus,
  subscribeOffline,
} from "./offlineStore";

const SERVER_SNAPSHOT = { isOffline: false, lastOfflineAt: 0 };

export function useOffline(): { isOffline: boolean; lastOfflineAt: number } {
  useEffect(() => {
    const update = () => {
      setNavigatorStatus(!navigator.onLine);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return useSyncExternalStore(
    subscribeOffline,
    getOfflineSnapshot,
    () => SERVER_SNAPSHOT,
  );
}
