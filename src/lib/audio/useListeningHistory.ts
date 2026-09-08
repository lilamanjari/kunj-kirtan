import { useEffect, useRef, useState } from "react";
import type { KirtanSummary } from "@/types/kirtan";

const LISTENING_HISTORY_STORAGE_KEY = "kirtan_listening_history_v1";
export const MAX_LISTENING_HISTORY_ITEMS = 44;

export type ListeningHistoryApi = {
  listeningHistory: KirtanSummary[];
  recordListening: (kirtan: KirtanSummary) => void;
  loaded: boolean;
};

function normalizeHistory(items: KirtanSummary[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, MAX_LISTENING_HISTORY_ITEMS);
}

export function useListeningHistory(storage?: Storage): ListeningHistoryApi {
  const storeRef = useRef<Storage | undefined>(
    storage ?? (typeof window !== "undefined" ? localStorage : undefined),
  );
  const [listeningHistory, setListeningHistory] = useState<KirtanSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = storeRef.current?.getItem(LISTENING_HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setListeningHistory(normalizeHistory(parsed));
        }
      }
    } catch {
      // Ignore corrupted local history.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      storeRef.current?.setItem(
        LISTENING_HISTORY_STORAGE_KEY,
        JSON.stringify(listeningHistory),
      );
    } catch {
      // History is a convenience feature, so storage failures are non-fatal.
    }
  }, [listeningHistory, loaded]);

  function recordListening(kirtan: KirtanSummary) {
    setListeningHistory((current) => {
      if (current[0]?.id === kirtan.id) {
        return current;
      }

      return [kirtan, ...current.filter((item) => item.id !== kirtan.id)].slice(
        0,
        MAX_LISTENING_HISTORY_ITEMS,
      );
    });
  }

  return { listeningHistory, recordListening, loaded };
}
