"use client";

import { loadOfflinePlayLogs, saveOfflinePlayLogs } from "./storage";
import type { OfflinePlayLog } from "./types";

export function enqueueOfflinePlayLog(log: Omit<OfflinePlayLog, "id">) {
  const logs = loadOfflinePlayLogs();
  const next: OfflinePlayLog = {
    ...log,
    id: crypto.randomUUID(),
  };
  saveOfflinePlayLogs([...logs, next]);
}

export async function flushOfflinePlayLogs() {
  const logs = loadOfflinePlayLogs();
  if (logs.length === 0) {
    return { flushed: 0 };
  }

  const response = await fetch("/api/plays/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plays: logs }),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error("Unable to flush offline play logs");
  }

  saveOfflinePlayLogs([]);
  return { flushed: logs.length };
}
