// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AudioPlayerBar from "./AudioPlayerBar";
import type { KirtanSummary } from "@/types/kirtan";

const playMock = vi.fn();
const pauseMock = vi.fn();
const dequeueByIdMock = vi.fn();
const shareMock = vi.fn();

const currentKirtan: KirtanSummary = {
  id: "current-1",
  audio_url: "https://example.com/current.mp3",
  type: "BHJ",
  title: "Current Bhajan",
  lead_singer: "Current Singer",
  recorded_date: "2026-01-01",
  sanga: "Kunj",
  duration_seconds: 180,
};

const queuedKirtan: KirtanSummary = {
  id: "queued-1",
  audio_url: "https://example.com/queued.mp3",
  type: "BHJ",
  title: "Queued Bhajan",
  lead_singer: "Queued Singer",
  recorded_date: "2026-01-02",
  sanga: "Kunj",
  duration_seconds: 240,
  is_rare_gem: true,
};

vi.mock("@/lib/audio/AudioPlayerContext", () => ({
  useAudioPlayer: () => ({
    progress: 0,
    seekBy: vi.fn(),
    seekTo: vi.fn(),
    isPlaying: () => false,
    pause: pauseMock,
    play: playMock,
    playNext: vi.fn(),
    playPrev: vi.fn(),
    current: currentKirtan,
    queue: [queuedKirtan],
    clearQueue: vi.fn(),
    dequeueById: dequeueByIdMock,
    duration: currentKirtan.duration_seconds ?? 0,
    currentTime: 0,
    isBuffering: false,
  }),
}));

vi.mock("@/lib/hooks/useKirtanShare", () => ({
  useKirtanShare: () => shareMock,
}));

describe("AudioPlayerBar queue sheet", () => {
  beforeEach(() => {
    playMock.mockReset();
    pauseMock.mockReset();
    dequeueByIdMock.mockReset();
    shareMock.mockReset();
  });

  it("opens the queue sheet, plays a queued item, and removes it", () => {
    render(<AudioPlayerBar />);

    fireEvent.click(screen.getByRole("button", { name: "Open queue" }));

    expect(screen.getByText("Play queue")).toBeTruthy();
    expect(screen.getByText("Queued Bhajan")).toBeTruthy();

    fireEvent.click(screen.getByText("Queued Bhajan"));
    expect(dequeueByIdMock).toHaveBeenCalledWith("queued-1");
    expect(playMock).toHaveBeenCalledWith(queuedKirtan);

    fireEvent.click(screen.getByRole("button", { name: "Open queue" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove from queue" }));
    expect(dequeueByIdMock).toHaveBeenCalledWith("queued-1");
  });
});
