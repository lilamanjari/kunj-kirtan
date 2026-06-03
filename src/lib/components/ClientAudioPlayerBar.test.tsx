// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import ClientAudioPlayerBar from "./ClientAudioPlayerBar";
import type { KirtanSummary } from "@/types/kirtan";

const currentMock: { value: KirtanSummary | null } = {
  value: null,
};

vi.mock("@/lib/audio/AudioPlayerContext", () => ({
  useAudioPlayer: () => ({
    current: currentMock.value,
  }),
}));

vi.mock("@/lib/components/AudioPlayerBar", () => ({
  default: () => <div>Audio player bar</div>,
}));

describe("ClientAudioPlayerBar", () => {
  it("mounts the player bar once the component is mounted", async () => {
    currentMock.value = {
      id: "shared-track",
      audio_url: "https://example.com/shared.mp3",
      type: "BHJ",
      title: "Shared Track",
      lead_singer: "Singer",
      recorded_date: "2026-01-01",
      sanga: "Kunj",
    };

    render(<ClientAudioPlayerBar />);

    await waitFor(() => {
      expect(screen.getByText("Audio player bar")).toBeTruthy();
    });
  });

  it("stays hidden when there is no current kirtan", async () => {
    cleanup();
    currentMock.value = null;

    render(<ClientAudioPlayerBar />);

    await waitFor(() => {
      expect(screen.queryByText("Audio player bar")).toBeNull();
    });
  });
});
