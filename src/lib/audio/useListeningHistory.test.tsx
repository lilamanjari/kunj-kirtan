/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  MAX_LISTENING_HISTORY_ITEMS,
  useListeningHistory,
} from "./useListeningHistory";
import type { KirtanSummary } from "@/types/kirtan";

const sampleKirtan = (id: string): KirtanSummary => ({
  id,
  audio_url: `https://example.com/${id}.m4a`,
  type: "BHJ",
  title: `Track ${id}`,
  lead_singer: "Singer",
  recorded_date: "2020-01-01",
  sanga: "Sanga",
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

describe("useListeningHistory", () => {
  it("moves replayed tracks to the top without duplicates", () => {
    const { result } = renderHook(() => useListeningHistory(createMemoryStorage()));

    act(() => {
      result.current.recordListening(sampleKirtan("1"));
      result.current.recordListening(sampleKirtan("2"));
      result.current.recordListening(sampleKirtan("1"));
    });

    expect(result.current.listeningHistory.map((item) => item.id)).toEqual([
      "1",
      "2",
    ]);
  });

  it("keeps only the most recent 44 tracks", () => {
    const { result } = renderHook(() => useListeningHistory(createMemoryStorage()));

    act(() => {
      Array.from({ length: MAX_LISTENING_HISTORY_ITEMS + 2 }, (_, index) =>
        result.current.recordListening(sampleKirtan(String(index))),
      );
    });

    expect(result.current.listeningHistory).toHaveLength(
      MAX_LISTENING_HISTORY_ITEMS,
    );
    expect(result.current.listeningHistory[0]?.id).toBe("45");
    expect(result.current.listeningHistory.at(-1)?.id).toBe("2");
  });

  it("persists the listening history", () => {
    const storage = createMemoryStorage();
    const { result } = renderHook(() => useListeningHistory(storage));

    act(() => {
      result.current.recordListening(sampleKirtan("1"));
    });

    const stored = JSON.parse(
      storage.getItem("kirtan_listening_history_v1") || "[]",
    );
    expect(stored[0].id).toBe("1");
  });
});
