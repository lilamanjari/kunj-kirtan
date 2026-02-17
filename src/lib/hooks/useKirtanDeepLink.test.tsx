import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useKirtanDeepLink } from "./useKirtanDeepLink";
import type { KirtanSummary } from "@/types/kirtan";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("kirtan=test-id"),
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
  });

  it("pins and selects the kirtan when query param matches", async () => {
    const onSelect = vi.fn();

    const { result } = renderHook(() =>
      useKirtanDeepLink({
        kirtans: [kirtan],
        onSelect,
      }),
    );

    await waitFor(() => {
      expect(result.current?.id).toBe("test-id");
    });

    expect(onSelect).toHaveBeenCalledWith(kirtan);
  });
});
