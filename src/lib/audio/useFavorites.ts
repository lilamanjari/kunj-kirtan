import { useEffect, useRef, useState } from "react";
import type { KirtanSummary } from "@/types/kirtan";

const FAVORITES_STORAGE_KEY = "kirtan_favorites_v1";

export type FavoritesApi = {
  favorites: KirtanSummary[];
  toggleFavorite: (kirtan: KirtanSummary) => void;
  removeFavorite: (id: string) => void;
  clearFavorites: () => void;
  isFavorited: (id: string) => boolean;
  notice: string | null;
  loaded: boolean;
};

function dedupeFavorites(items: KirtanSummary[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function useFavorites(storage?: Storage): FavoritesApi {
  const storeRef = useRef<Storage | undefined>(
    storage ?? (typeof window !== "undefined" ? localStorage : undefined),
  );
  const [favorites, setFavorites] = useState<KirtanSummary[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const favoritesRef = useRef<KirtanSummary[]>([]);

  useEffect(() => {
    try {
      const raw = storeRef.current?.getItem(FAVORITES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setFavorites(dedupeFavorites(parsed));
        }
      }
    } catch {
      // ignore corrupted storage
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    favoritesRef.current = favorites;
    if (!loaded) return;
    try {
      storeRef.current?.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(favorites),
      );
    } catch {
      // ignore storage failures
    }
  }, [favorites, loaded]);

  function toggleFavorite(kirtan: KirtanSummary) {
    const existing = favoritesRef.current.some((item) => item.id === kirtan.id);
    if (existing) {
      setFavorites((prev) => prev.filter((item) => item.id !== kirtan.id));
      setNotice(`Removed "${kirtan.title}" from favorites`);
      return;
    }

    setFavorites((prev) => dedupeFavorites([kirtan, ...prev]));
    setNotice(`Added "${kirtan.title}" to favorites`);
  }

  function removeFavorite(id: string) {
    const removed = favoritesRef.current.find((item) => item.id === id) ?? null;
    setFavorites((prev) => prev.filter((item) => item.id !== id));
    if (removed) {
      setNotice(`Removed "${removed.title}" from favorites`);
    }
  }

  function clearFavorites() {
    setFavorites([]);
  }

  function isFavorited(id: string) {
    return favorites.some((item) => item.id === id);
  }

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 1500);
    return () => clearTimeout(timer);
  }, [notice]);

  return {
    favorites,
    toggleFavorite,
    removeFavorite,
    clearFavorites,
    isFavorited,
    notice,
    loaded,
  };
}
