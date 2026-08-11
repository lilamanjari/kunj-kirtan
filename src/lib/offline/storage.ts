"use client";

import {
  OFFLINE_FAVORITES_STORAGE_KEY,
  OFFLINE_PLAY_LOGS_STORAGE_KEY,
} from "./constants";
import type { OfflineFavoritesState, OfflinePlayLog } from "./types";

const EMPTY_STATE: OfflineFavoritesState = {
  enabled: false,
  selectedIds: [],
  downloadedById: {},
};

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function loadOfflineFavoritesState(): OfflineFavoritesState {
  const storage = getStorage();
  if (!storage) return EMPTY_STATE;

  try {
    const raw = storage.getItem(OFFLINE_FAVORITES_STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<OfflineFavoritesState>;
    return {
      enabled: parsed.enabled === true,
      selectedIds: Array.isArray(parsed.selectedIds)
        ? parsed.selectedIds.filter((value): value is string => typeof value === "string")
        : [],
      downloadedById:
        parsed.downloadedById && typeof parsed.downloadedById === "object"
          ? parsed.downloadedById
          : {},
    };
  } catch {
    return EMPTY_STATE;
  }
}

export function saveOfflineFavoritesState(state: OfflineFavoritesState) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(OFFLINE_FAVORITES_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures
  }
}

export function loadOfflinePlayLogs(): OfflinePlayLog[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(OFFLINE_PLAY_LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is OfflinePlayLog =>
            item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.kirtan_id === "string",
        )
      : [];
  } catch {
    return [];
  }
}

export function saveOfflinePlayLogs(logs: OfflinePlayLog[]) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(OFFLINE_PLAY_LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // ignore storage failures
  }
}
