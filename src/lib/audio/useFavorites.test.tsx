/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFavorites } from "./useFavorites";
import type { KirtanSummary } from "@/types/kirtan";

const sampleKirtan = (id: string): KirtanSummary => ({
  id,
  audio_url: `https://example.com/${id}.m4a`,
  type: "BHJ",
  title: `Track ${id}`,
  lead_singer: "Singer",
  recorded_date: "2020-01-01",
  sanga: "Sanga",
  duration_seconds: 120,
});

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe("useFavorites", () => {
  it("adds and removes favorites via toggle", () => {
    const storage = createMemoryStorage();
    const { result } = renderHook(() => useFavorites(storage));

    act(() => {
      result.current.toggleFavorite(sampleKirtan("1"));
    });

    expect(result.current.favorites.map((item) => item.id)).toEqual(["1"]);
    expect(result.current.isFavorited("1")).toBe(true);

    act(() => {
      result.current.toggleFavorite(sampleKirtan("1"));
    });

    expect(result.current.favorites).toHaveLength(0);
    expect(result.current.isFavorited("1")).toBe(false);
  });

  it("stores most recently favorited items first without duplicates", () => {
    const storage = createMemoryStorage();
    const { result } = renderHook(() => useFavorites(storage));

    act(() => {
      result.current.toggleFavorite(sampleKirtan("1"));
      result.current.toggleFavorite(sampleKirtan("2"));
      result.current.toggleFavorite(sampleKirtan("1"));
      result.current.toggleFavorite(sampleKirtan("1"));
    });

    expect(result.current.favorites.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("persists favorites in storage", () => {
    const storage = createMemoryStorage();
    const { result } = renderHook(() => useFavorites(storage));

    act(() => {
      result.current.toggleFavorite(sampleKirtan("1"));
    });

    const stored = JSON.parse(storage.getItem("kirtan_favorites_v1") || "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe("1");
  });
});
