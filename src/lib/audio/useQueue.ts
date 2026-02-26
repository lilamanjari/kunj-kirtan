import { useEffect, useRef, useState } from "react";
import type { KirtanSummary } from "@/types/kirtan";

const QUEUE_STORAGE_KEY = "kirtan_queue_v1";

export type QueueApi = {
  queue: KirtanSummary[];
  enqueue: (kirtan: KirtanSummary) => void;
  dequeue: () => KirtanSummary | null;
  clearQueue: () => void;
  isQueued: (id: string) => boolean;
  notice: string | null;
  loaded: boolean;
};

export function useQueue(storage?: Storage): QueueApi {
  const store = storage ?? (typeof window !== "undefined" ? localStorage : undefined);
  const [queue, setQueue] = useState<KirtanSummary[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const queueRef = useRef<KirtanSummary[]>([]);

  useEffect(() => {
    try {
      const raw = store?.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setQueue(parsed);
        }
      }
    } catch {
      // ignore corrupted storage
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    queueRef.current = queue;
    if (!loaded) return;
    try {
      store?.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch {
      // ignore storage failures
    }
  }, [queue, loaded]);

  function enqueue(kirtan: KirtanSummary) {
    setQueue((prev) => [...prev, kirtan]);
    setNotice(`Added "${kirtan.title}" to queue`);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(20);
    }
  }

  function dequeue() {
    const next = queueRef.current[0] ?? null;
    if (!next) return null;
    setQueue((prev) => prev.slice(1));
    return next;
  }

  function clearQueue() {
    setQueue([]);
  }

  function isQueued(id: string) {
    return queue.some((item) => item.id === id);
  }

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 1500);
    return () => clearTimeout(timer);
  }, [notice]);

  return { queue, enqueue, dequeue, clearQueue, isQueued, notice, loaded };
}
