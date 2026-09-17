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

import {
  selectNextRareGemInCycle,
  selectRareGemCycleBatch,
} from "./featured";

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

  it("fills a multi-slot surface with unseen candidates before starting a new cycle", () => {
    const candidates = ["a", "b", "c", "d"].map(makeCandidate);
    const result = selectRareGemCycleBatch(
      candidates,
      new Set(["a", "b"]),
      new Set(),
      "home-recommended-rare-gems",
      1,
      4,
    );

    expect(result.selected).toHaveLength(4);
    expect(new Set(result.selected.map((candidate) => candidate.id))).toHaveLength(4);
    expect(result.selected.slice(0, 2).map((candidate) => candidate.id)).toEqual(
      expect.arrayContaining(["c", "d"]),
    );
    expect(result.cycleNumber).toBe(2);
  });

  it("does not repeat candidates when a rail has more slots than rare gems", () => {
    const candidates = ["a", "b", "c"].map(makeCandidate);
    const result = selectRareGemCycleBatch(
      candidates,
      new Set(),
      new Set(),
      "home-recommended-rare-gems",
      1,
      6,
    );

    expect(result.selected).toHaveLength(3);
    expect(new Set(result.selected.map((candidate) => candidate.id))).toHaveLength(3);
  });
});
