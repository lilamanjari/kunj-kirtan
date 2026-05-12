import { describe, expect, it, vi } from "vitest";
import type { PlayableKirtanRow } from "@/types/kirtan";

vi.mock("next/cache", () => ({
  unstable_cache:
    <T extends (...args: unknown[]) => unknown>(fn: T) =>
    (...args: Parameters<T>) =>
      fn(...args),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/lib/server/featured", () => ({
  getDailyRareGem: vi.fn(),
}));

function makeRow(
  id: string,
  leadSingerId: string,
  leadSinger = leadSingerId,
): PlayableKirtanRow {
  return {
    id,
    audio_url: `https://example.com/${id}.mp3`,
    type: "MM",
    title: `Title ${id}`,
    lead_singer: leadSinger,
    lead_singer_id: leadSingerId,
    recorded_date: "2026-01-01",
    recorded_date_precision: "day",
    sanga: "Kunj",
    duration_seconds: 120,
    sequence_num: 1,
  };
}

describe("selectWeeklyRecommendedRareGems", () => {
  it("spreads duplicate lead singers apart when enough distinct singers exist", async () => {
    const { selectWeeklyRecommendedRareGems } = await import("./homePage");
    const candidates = [
      makeRow("a-1", "lead-a", "Lead A"),
      makeRow("a-2", "lead-a", "Lead A"),
      makeRow("b-1", "lead-b", "Lead B"),
      makeRow("b-2", "lead-b", "Lead B"),
      makeRow("c-1", "lead-c", "Lead C"),
      makeRow("c-2", "lead-c", "Lead C"),
      makeRow("d-1", "lead-d", "Lead D"),
      makeRow("e-1", "lead-e", "Lead E"),
    ];

    const selected = selectWeeklyRecommendedRareGems(
      candidates,
      8,
      new Date("2026-05-11T00:00:00Z"),
    );

    expect(selected).toHaveLength(8);

    for (let index = 1; index < selected.length; index += 1) {
      expect(selected[index].lead_singer_id).not.toBe(
        selected[index - 1].lead_singer_id,
      );
    }
  });

  it("returns at most one per singer before cycling back for duplicates", async () => {
    const { selectWeeklyRecommendedRareGems } = await import("./homePage");
    const candidates = [
      makeRow("a-1", "lead-a", "Lead A"),
      makeRow("a-2", "lead-a", "Lead A"),
      makeRow("a-3", "lead-a", "Lead A"),
      makeRow("b-1", "lead-b", "Lead B"),
      makeRow("b-2", "lead-b", "Lead B"),
      makeRow("c-1", "lead-c", "Lead C"),
    ];

    const selected = selectWeeklyRecommendedRareGems(
      candidates,
      6,
      new Date("2026-05-11T00:00:00Z"),
    );

    expect(selected.slice(0, 3).map((item) => item.lead_singer_id)).toHaveLength(
      new Set(selected.slice(0, 3).map((item) => item.lead_singer_id)).size,
    );
  });

  it("rotates selections when the week changes", async () => {
    const { selectWeeklyRecommendedRareGems } = await import("./homePage");
    const candidates = [
      makeRow("a-1", "lead-a", "Lead A"),
      makeRow("b-1", "lead-b", "Lead B"),
      makeRow("c-1", "lead-c", "Lead C"),
      makeRow("d-1", "lead-d", "Lead D"),
      makeRow("e-1", "lead-e", "Lead E"),
      makeRow("f-1", "lead-f", "Lead F"),
      makeRow("g-1", "lead-g", "Lead G"),
      makeRow("h-1", "lead-h", "Lead H"),
      makeRow("i-1", "lead-i", "Lead I"),
    ];

    const firstWeek = selectWeeklyRecommendedRareGems(
      candidates,
      8,
      new Date("2026-05-11T00:00:00Z"),
    );
    const secondWeek = selectWeeklyRecommendedRareGems(
      candidates,
      8,
      new Date("2026-05-18T00:00:00Z"),
    );

    expect(firstWeek.map((item) => item.id)).not.toEqual(
      secondWeek.map((item) => item.id),
    );
  });
});
