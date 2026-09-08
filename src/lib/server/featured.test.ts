import { describe, expect, it, vi } from "vitest";
import type { PlayableKirtanRow } from "@/types/kirtan";

vi.mock("next/cache", () => ({
  unstable_cache:
    <T extends (...args: unknown[]) => unknown>(fn: T) =>
    (...args: Parameters<T>) =>
      fn(...args),
}));

vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from: vi.fn() } }));

import { selectNextRareGemInCycle } from "./featured";

function makeCandidate(id: string): PlayableKirtanRow {
  return {
    id,
    audio_url: `https://example.com/${id}.mp3`,
    type: "MM",
    title: id,
    lead_singer: null,
    lead_singer_id: null,
    recorded_date: null,
    sanga: "Kunj",
  };
}

describe("selectNextRareGemInCycle", () => {
  it("selects every candidate once before beginning another cycle", () => {
    const candidates = ["a", "b", "c", "d"].map(makeCandidate);
    const shown = new Set<string>();

    for (let index = 0; index < candidates.length; index += 1) {
      const selected = selectNextRareGemInCycle(
        candidates,
        shown,
        "home-rare-gems",
        1,
      );
      expect(selected).not.toBeNull();
      shown.add(selected!.id);
    }

    expect(shown).toEqual(new Set(["a", "b", "c", "d"]));
    expect(
      selectNextRareGemInCycle(candidates, shown, "home-rare-gems", 1),
    ).toBeNull();
  });

  it("uses a deterministic order within a cycle", () => {
    const candidates = ["a", "b", "c", "d"].map(makeCandidate);
    const firstSelection = selectNextRareGemInCycle(
      candidates,
      new Set(),
      "home-rare-gems",
      2,
    );
    const repeatedSelection = selectNextRareGemInCycle(
      candidates,
      new Set(),
      "home-rare-gems",
      2,
    );

    expect(firstSelection?.id).toBe(repeatedSelection?.id);
  });
});
