/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, renderHook, act } from "@testing-library/react";
import React from "react";
import { AudioPlayerProvider, useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import type { KirtanSummary } from "@/types/kirtan";

class MockAudio {
  src = "";
  currentTime = 0;
  duration = 120;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  private listeners = new Map<string, Set<() => void>>();

  addEventListener(event: string, cb: () => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(cb);
  }

  removeEventListener(event: string, cb: () => void) {
    this.listeners.get(event)?.delete(cb);
  }

  emit(event: string) {
    this.listeners.get(event)?.forEach((cb) => cb());
  }
}

const sampleKirtan = (id: string): KirtanSummary => ({
  id,
  audio_url: `https://example.com/${id}.m4a`,
  type: "MM",
  title: "Maha Mantra",
  lead_singer: "Singer",
  recorded_date: "2020-01-01",
  sanga: "Sanga",
  duration_seconds: 120,
});

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("AudioPlayerContext", () => {
  let audioInstances: MockAudio[] = [];

  beforeEach(() => {
    audioInstances = [];
    vi.stubGlobal("Audio", vi.fn(() => {
      const audio = new MockAudio();
      audioInstances.push(audio);
      return audio;
    }));
  });

  it("creates a single audio element per provider", () => {
    function Consumer() {
      useAudioPlayer();
      return null;
    }

    const { unmount } = render(
      <AudioPlayerProvider>
        <Consumer />
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(audioInstances).toHaveLength(1);
    unmount();
  });

  it("plays on load and does not pause immediately", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AudioPlayerProvider>{children}</AudioPlayerProvider>
    );
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    const k1 = sampleKirtan("1");

    await act(async () => {
      result.current.play(k1);
      await flushMicrotasks();
    });

    const audio = audioInstances[0];
    expect(audio.play).toHaveBeenCalled();
    expect(audio.pause).not.toHaveBeenCalled();
  });

  it("updates progress on timeupdate", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AudioPlayerProvider>{children}</AudioPlayerProvider>
    );
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    const audio = audioInstances[0];
    audio.duration = 200;
    audio.currentTime = 50;

    await act(async () => {
      audio.emit("timeupdate");
      await flushMicrotasks();
    });

    expect(result.current.progress).toBeCloseTo(0.25, 5);
  });

  it("handles ended event by clearing current", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AudioPlayerProvider>{children}</AudioPlayerProvider>
    );
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    const k1 = sampleKirtan("1");

    await act(async () => {
      result.current.play(k1);
      await flushMicrotasks();
    });

    await act(async () => {
      audioInstances[0].emit("ended");
      await flushMicrotasks();
    });

    expect(result.current.current).toBeNull();
  });
});
