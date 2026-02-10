/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlayback } from "./usePlayback";
import type { KirtanSummary } from "@/types/kirtan";

const sampleKirtan = (id: string, type: "MM" | "BHJ"): KirtanSummary => ({
  id,
  audio_url: `https://example.com/${id}.m4a`,
  type,
  title: type === "MM" ? "Maha Mantra" : "Bhajan",
  lead_singer: "Singer",
  recorded_date: "2020-01-01",
  sanga: "Sanga",
  duration_seconds: 120,
});

describe("usePlayback", () => {
  it("starts paused with no current", () => {
    const { result } = renderHook(() => usePlayback());
    expect(result.current.current).toBeNull();
    expect(result.current.state).toBe("paused");
    expect(result.current.isPlaying()).toBe(false);
    expect(result.current.isLoading()).toBe(false);
  });

  it("play sets current and loading for new kirtan", () => {
    const { result } = renderHook(() => usePlayback());
    const k1 = sampleKirtan("1", "MM");

    act(() => {
      result.current.play(k1);
    });

    expect(result.current.current?.id).toBe("1");
    expect(result.current.state).toBe("loading");
    expect(result.current.isActive(k1)).toBe(true);
  });

  it("play resumes when same kirtan is paused", () => {
    const { result } = renderHook(() => usePlayback());
    const k1 = sampleKirtan("1", "MM");

    act(() => result.current.play(k1));
    act(() => result.current.setState("paused"));
    act(() => result.current.play(k1));

    expect(result.current.state).toBe("playing");
  });

  it("toggle switches between play and pause for active kirtan", () => {
    const { result } = renderHook(() => usePlayback());
    const k1 = sampleKirtan("1", "MM");

    act(() => result.current.play(k1));
    act(() => result.current.toggle(k1));

    expect(result.current.state).toBe("playing");

    act(() => result.current.toggle(k1));
    expect(result.current.state).toBe("paused");
  });

  it("toggle starts new kirtan when inactive", () => {
    const { result } = renderHook(() => usePlayback());
    const k1 = sampleKirtan("1", "MM");
    const k2 = sampleKirtan("2", "BHJ");

    act(() => result.current.play(k1));
    act(() => result.current.toggle(k2));

    expect(result.current.current?.id).toBe("2");
    expect(result.current.state).toBe("loading");
  });

  it("pause does nothing without current", () => {
    const { result } = renderHook(() => usePlayback());
    act(() => result.current.pause());
    expect(result.current.state).toBe("paused");
    expect(result.current.current).toBeNull();
  });

  it("onEnded clears current and pauses", () => {
    const { result } = renderHook(() => usePlayback());
    const k1 = sampleKirtan("1", "MM");

    act(() => result.current.play(k1));
    act(() => result.current.onEnded());

    expect(result.current.current).toBeNull();
    expect(result.current.state).toBe("paused");
  });
});
