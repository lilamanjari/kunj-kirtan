"use client";

import { useEffect, useRef, useState } from "react";
import type { KirtanSummary } from "@/types/kirtan";
import { getOfflineSnapshot, recordRequestSuccess } from "@/lib/net/offlineStore";
import {
  buildOfflineShellUrls,
  MAX_OFFLINE_AUDIO_BYTES,
  MAX_OFFLINE_FAVORITES,
} from "./constants";
import {
  cacheOfflineKirtanMedia,
  clearOfflineMediaCache,
  getOfflineAudioObjectUrl,
  removeOfflineKirtanMedia,
  warmOfflineShell,
} from "./cache";
import {
  loadOfflineFavoritesState,
  saveOfflineFavoritesState,
} from "./storage";
import type { OfflineFavoritesState } from "./types";

type UseOfflineFavoritesOptions = {
  favorites: KirtanSummary[];
  locale: string;
};

function supportsOfflineFavorites() {
  if (typeof window === "undefined") return false;
  return (
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "caches" in window
  );
}

function sumDownloadedBytes(state: OfflineFavoritesState) {
  return Object.values(state.downloadedById).reduce(
    (total, item) => total + Math.max(0, item.sizeBytes || 0),
    0,
  );
}

function buildIdsKey(ids: string[]) {
  return [...ids].sort().join("|");
}

export function useOfflineFavorites({
  favorites,
  locale,
}: UseOfflineFavoritesOptions) {
  const [offlineSupported, setOfflineSupported] = useState(false);
  const [networkOnline, setNetworkOnline] = useState(true);
  const [offlineStorageLimitReached, setOfflineStorageLimitReached] =
    useState(false);
  const [state, setState] = useState<OfflineFavoritesState>(() =>
    ({ enabled: false, selectedIds: [], downloadedById: {} }),
  );
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
  const previousFavoriteIdsKeyRef = useRef<string | null>(null);
  const downloadingIdRef = useRef<string | null>(null);
  const stateRef = useRef(state);
  const downloadingIdsRef = useRef(downloadingIds);
  const limitBlockedAtRef = useRef<{ count: number; bytes: number } | null>(
    null,
  );
  const favoriteIds = favorites.map((item) => item.id);
  const favoriteIdsKey = buildIdsKey(favoriteIds);
  const selectedIdsKey = buildIdsKey(state.selectedIds);
  const downloadedIdsKey = buildIdsKey(Object.keys(state.downloadedById));
  const downloadingIdsKey = buildIdsKey(downloadingIds);

  useEffect(() => {
    const supported = supportsOfflineFavorites();
    setOfflineSupported(supported);
    setNetworkOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    if (!supported) {
      setState({ enabled: false, selectedIds: [], downloadedById: {} });
      return;
    }
    setState(loadOfflineFavoritesState());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      setNetworkOnline(navigator.onLine);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    downloadingIdsRef.current = downloadingIds;
  }, [downloadingIds]);

  useEffect(() => {
    if (!offlineSupported) return;
    saveOfflineFavoritesState(state);
  }, [offlineSupported, state]);

  useEffect(() => {
    if (!offlineStorageLimitReached) return;
    const currentState = stateRef.current;
    const currentDownloadedCount = Object.keys(currentState.downloadedById).length;
    const currentTotalBytes = sumDownloadedBytes(currentState);
    const blockedAt = limitBlockedAtRef.current;

    if (!blockedAt) {
      setOfflineStorageLimitReached(false);
      return;
    }

    if (
      currentDownloadedCount < blockedAt.count ||
      currentTotalBytes < blockedAt.bytes
    ) {
      limitBlockedAtRef.current = null;
      setOfflineStorageLimitReached(false);
    }
  }, [downloadedIdsKey, offlineStorageLimitReached]);

  useEffect(() => {
    if (!offlineSupported) return;
    if (previousFavoriteIdsKeyRef.current === favoriteIdsKey) {
      return;
    }

    const currentIds = new Set(favoriteIds);
    const previousIds = new Set(
      (previousFavoriteIdsKeyRef.current ?? "")
        .split("|")
        .map((value) => value.trim())
        .filter(Boolean),
    );
    const removedIds = [...previousIds].filter((id) => !currentIds.has(id));
    const addedIds = [...currentIds].filter((id) => !previousIds.has(id));
    previousFavoriteIdsKeyRef.current = favoriteIdsKey;

    if (removedIds.length === 0 && (!state.enabled || addedIds.length === 0)) {
      return;
    }

    setState((prev) => {
      let changed = false;
      const selected = new Set(prev.selectedIds);
      const downloadedById = { ...prev.downloadedById };

      removedIds.forEach((id) => {
        if (selected.delete(id)) changed = true;
        const existing = downloadedById[id];
        if (existing) {
          delete downloadedById[id];
          void removeOfflineKirtanMedia(id, existing.imageUrl);
          changed = true;
        }
      });

      if (prev.enabled) {
        addedIds.forEach((id) => {
          if (!selected.has(id)) {
            selected.add(id);
            changed = true;
          }
        });
      }

      if (!changed) return prev;
      return {
        ...prev,
        selectedIds: [...selected],
        downloadedById,
      };
    });
  }, [favoriteIds, favoriteIdsKey, offlineSupported, state.enabled]);

  useEffect(() => {
    if (!offlineSupported) return;
    if (!state.enabled) return;
    void warmOfflineShell(buildOfflineShellUrls(locale));
  }, [locale, offlineSupported, state.enabled]);

  useEffect(() => {
    if (!offlineSupported) return;
    if (!state.enabled) return;
    if (downloadingIdRef.current) return;
    if (!networkOnline || getOfflineSnapshot().isOffline) return;
    if (offlineStorageLimitReached) return;

    const currentState = stateRef.current;
    const downloadedCount = Object.keys(currentState.downloadedById).length;
    const totalBytes = sumDownloadedBytes(currentState);

    if (
      downloadedCount >= MAX_OFFLINE_FAVORITES ||
      totalBytes >= MAX_OFFLINE_AUDIO_BYTES
    ) {
      limitBlockedAtRef.current = {
        count: downloadedCount,
        bytes: totalBytes,
      };
      setOfflineStorageLimitReached(true);
      return;
    }

    const currentDownloadingIds = downloadingIdsRef.current;
    const nextFavorite = favorites.find((item) => {
      if (!currentState.selectedIds.includes(item.id)) return false;
      if (currentState.downloadedById[item.id]) return false;
      if (currentDownloadingIds.includes(item.id)) return false;
      return true;
    });

    if (!nextFavorite) return;

    const startDownload = async () => {
      downloadingIdRef.current = nextFavorite.id;
      setDownloadingIds((prev) => [...prev, nextFavorite.id]);

      try {
        const { audioBytes, imageUrl } = await cacheOfflineKirtanMedia(
          nextFavorite,
        );
        let hitStorageLimit = false;
        setState((prev) => {
          const nextTotalBytes = sumDownloadedBytes(prev) + audioBytes;
          const nextCount = Object.keys(prev.downloadedById).length + 1;
          if (
            nextCount > MAX_OFFLINE_FAVORITES ||
            nextTotalBytes > MAX_OFFLINE_AUDIO_BYTES
          ) {
            void removeOfflineKirtanMedia(nextFavorite.id, imageUrl);
            limitBlockedAtRef.current = {
              count: Object.keys(prev.downloadedById).length,
              bytes: sumDownloadedBytes(prev),
            };
            hitStorageLimit = true;
            return prev;
          }

          return {
            ...prev,
            downloadedById: {
              ...prev.downloadedById,
              [nextFavorite.id]: {
                kirtanId: nextFavorite.id,
                audioUrl: nextFavorite.audio_url,
                imageUrl,
                sizeBytes: audioBytes,
                cachedAt: Date.now(),
              },
            },
          };
        });
        if (hitStorageLimit) {
          setOfflineStorageLimitReached(true);
          return;
        }
        recordRequestSuccess();
      } catch {
        // Keep the item selected so the user can retry, but do not flip the
        // app-wide offline banner for a single caching failure.
      } finally {
        downloadingIdRef.current = null;
        setDownloadingIds((prev) =>
          prev.filter((id) => id !== nextFavorite.id),
        );
      }
    };

    void startDownload();
  }, [
    downloadingIdsKey,
    favorites,
    networkOnline,
    offlineStorageLimitReached,
    selectedIdsKey,
    downloadedIdsKey,
    offlineSupported,
    state.enabled,
  ]);

  async function disableOfflineFavorites() {
    if (!offlineSupported) return;
    setDownloadingIds([]);
    downloadingIdRef.current = null;
    limitBlockedAtRef.current = null;
    setOfflineStorageLimitReached(false);
    await clearOfflineMediaCache();
    setState({
      enabled: false,
      selectedIds: [],
      downloadedById: {},
    });
  }

  function enableOfflineFavorites() {
    if (!offlineSupported) return;
    const favoriteIds = favorites.map((item) => item.id);
    setState((prev) => ({
      ...prev,
      enabled: true,
      selectedIds: Array.from(new Set([...prev.selectedIds, ...favoriteIds])),
    }));
  }

  async function toggleOfflineEnabled(enabled: boolean) {
    if (!offlineSupported) return;
    if (enabled) {
      enableOfflineFavorites();
      return;
    }
    await disableOfflineFavorites();
  }

  async function toggleOfflineForKirtan(kirtan: KirtanSummary) {
    if (!offlineSupported) return;
    if (!state.enabled) return;

    const isSelected = state.selectedIds.includes(kirtan.id);
    if (isSelected) {
      const existing = state.downloadedById[kirtan.id];
      if (existing) {
        await removeOfflineKirtanMedia(kirtan.id, existing.imageUrl);
      }
      setState((prev) => {
        const downloadedById = { ...prev.downloadedById };
        delete downloadedById[kirtan.id];
        return {
          ...prev,
          selectedIds: prev.selectedIds.filter((id) => id !== kirtan.id),
          downloadedById,
        };
      });
      setDownloadingIds((prev) => prev.filter((id) => id !== kirtan.id));
      return;
    }

    setState((prev) => ({
      ...prev,
      selectedIds: [...prev.selectedIds, kirtan.id],
    }));
  }

  return {
    offlineLoaded: true,
    offlineSupported,
    offlineEnabled: state.enabled,
    offlineStorageLimitReached,
    offlineSelectedCount: state.selectedIds.length,
    offlineDownloadedCount: Object.keys(state.downloadedById).length,
    offlineDownloadingCount: downloadingIds.length,
    downloadedIdsKey,
    isOfflineSelected: (id: string) => state.selectedIds.includes(id),
    isOfflineAvailable: (id: string) => Boolean(state.downloadedById[id]),
    isOfflineDownloading: (id: string) => downloadingIds.includes(id),
    getOfflineAudioObjectUrl,
    toggleOfflineEnabled,
    toggleOfflineForKirtan,
  };
}
