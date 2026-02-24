import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { AudioPlayerProvider, useAudioPlayer } from "./AudioPlayerContext";
import type { KirtanSummary } from "@/types/kirtan";

vi.mock("./useQueue", () => ({
  useQueue: () => ({
    queue: [],
    enqueue: vi.fn(),
    dequeue: vi.fn(),
    clearQueue: vi.fn(),
    isQueued: vi.fn(),
    notice: null,
    loaded: true,
  }),
}));

const testKirtan: KirtanSummary = {
  id: "kirtan-1",
  audio_url: "https://example.com/test.mp3",
  type: "BHJ",
  title: "Test Bhajan",
  lead_singer: "Singer",
  recorded_date: "2020-01-01",
  sanga: "Test",
};

function TestHarness() {
  const player = useAudioPlayer();
  return (
    <button type="button" onClick={() => player.select(testKirtan)}>
      Select
    </button>
  );
}

describe("AudioPlayerContext resume behavior", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not overwrite restored position with 0 on next render", async () => {
    const saved = {
      kirtan: testKirtan,
      time: 20,
      duration: 120,
    };
    localStorage.setItem("kirtan_last_playback_v1", JSON.stringify(saved));

    render(
      <AudioPlayerProvider>
        <TestHarness />
      </AudioPlayerProvider>,
    );

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("kirtan_last_playback_v1")!)).toMatchObject({
        time: 20,
      });
    });
  });
});
