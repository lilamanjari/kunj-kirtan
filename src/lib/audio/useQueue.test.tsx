/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQueue } from "./useQueue";
import type { KirtanSummary } from "@/types/kirtan";

const sampleKirtan = (id: string): KirtanSummary => ({
  id,
  audio_url: `https://example.com/${id}.m4a`,
  type: "MM",
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

describe("useQueue", () => {
  it("enqueues items and exposes queue", () => {
    const storage = createMemoryStorage();
    const { result } = renderHook(() => useQueue(storage));

    act(() => {
      result.current.enqueue(sampleKirtan("1"));
    });

    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0].id).toBe("1");
  });

  it("dequeues in FIFO order", () => {
    const storage = createMemoryStorage();
    const { result } = renderHook(() => useQueue(storage));

    act(() => {
      result.current.enqueue(sampleKirtan("1"));
      result.current.enqueue(sampleKirtan("2"));
    });

    let next: KirtanSummary | null = null;
    act(() => {
      next = result.current.dequeue();
    });

    expect(next?.id).toBe("1");
    expect(result.current.queue[0].id).toBe("2");
  });

  it("clears queue", () => {
    const storage = createMemoryStorage();
    const { result } = renderHook(() => useQueue(storage));

    act(() => {
      result.current.enqueue(sampleKirtan("1"));
      result.current.clearQueue();
    });

    expect(result.current.queue).toHaveLength(0);
  });

  it("persists queue in storage", () => {
    const storage = createMemoryStorage();
    const { result, rerender } = renderHook(() => useQueue(storage));

    act(() => {
      result.current.enqueue(sampleKirtan("1"));
    });

    rerender();
    const stored = JSON.parse(storage.getItem("kirtan_queue_v1") || "[]");
    expect(stored).toHaveLength(1);
  });

  it("sets notice on enqueue", () => {
    const storage = createMemoryStorage();
    const { result } = renderHook(() => useQueue(storage));

    act(() => {
      result.current.enqueue(sampleKirtan("1"));
    });

    expect(result.current.notice).toMatch(/Added/);
  });

  it("isQueued reflects queue state", () => {
    const storage = createMemoryStorage();
    const { result } = renderHook(() => useQueue(storage));

    act(() => {
      result.current.enqueue(sampleKirtan("1"));
    });

    expect(result.current.isQueued("1")).toBe(true);
    expect(result.current.isQueued("2")).toBe(false);
  });

  it("vibrates on enqueue when supported", () => {
    const storage = createMemoryStorage();
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });

    const { result } = renderHook(() => useQueue(storage));

    act(() => {
      result.current.enqueue(sampleKirtan("1"));
    });

    expect(vibrate).toHaveBeenCalledWith(20);
  });
});
