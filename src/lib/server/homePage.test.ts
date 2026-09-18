import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache:
    <T extends (...args: unknown[]) => unknown>(fn: T) =>
    (...args: Parameters<T>) =>
      fn(...args),
}));

vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));
vi.mock("@/lib/server/featured", () => ({
  getDailyRareGem: vi.fn(),
  getDailyRareGems: vi.fn(),
}));

describe("getStartOfCurrentUtcWeek", () => {
  it("returns Monday midnight in UTC", async () => {
    const { getStartOfCurrentUtcWeek } = await import("./homePage");

    expect(getStartOfCurrentUtcWeek(new Date("2026-09-20T23:59:59Z"))).toBe(
      "2026-09-14T00:00:00.000Z",
    );
    expect(getStartOfCurrentUtcWeek(new Date("2026-09-21T00:00:00Z"))).toBe(
      "2026-09-21T00:00:00.000Z",
    );
  });
});
