/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useKirtanDeepLink } from "./useKirtanDeepLink";
import type { KirtanSummary } from "@/types/kirtan";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("kirtan=test-id"),
}));

const fetchWithStatusMock = vi.fn();

vi.mock("@/lib/net/fetchWithStatus", () => ({
  fetchWithStatus: (...args: unknown[]) => fetchWithStatusMock(...args),
}));

describe("useKirtanDeepLink", () => {
  const kirtan: KirtanSummary = {
    id: "test-id",
    audio_url: "https://example.com/audio.mp3",
    type: "MM",
    title: "Maha Mantra",
    lead_singer: "Avadhut Maharaj",
    recorded_date: "2020-01-01",
    sanga: "Radhe Kunj Vrindavan",
  };

  beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
    fetchWithStatusMock.mockReset();
  });

  it("pins and selects the kirtan when query param matches", async () => {
    const onSelect = vi.fn();
    const onPin = vi.fn();

    renderHook(() =>
      useKirtanDeepLink({
        kirtans: [kirtan],
        onSelect,
        onPin,
      }),
    );

    await waitFor(() => {
      expect(onPin).toHaveBeenCalledWith(kirtan);
    });

    expect(onSelect).toHaveBeenCalledWith(kirtan);
  });

  it("does not re-select a fetched kirtan if it is already active", async () => {
    const onSelect = vi.fn();
    const onPin = vi.fn();

    fetchWithStatusMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ kirtan }),
    });

    renderHook(() =>
      useKirtanDeepLink({
        kirtans: [],
        onSelect,
        onPin,
        isActive: (item) => item.id === kirtan.id,
      }),
    );

    await waitFor(() => {
      expect(onPin).toHaveBeenCalledWith(kirtan);
    });

    expect(onSelect).not.toHaveBeenCalled();
  });
});
