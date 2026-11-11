import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tagResult: { data: null as unknown, error: null as unknown },
  cachedCalls: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => async (...args: unknown[]) => {
    mocks.cachedCalls();
    return fn(...args);
  },
}));
vi.mock("@/lib/supabase", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/lib/server/kirtanTags", () => ({
  fetchKirtanTagContext: vi.fn(),
  fetchKirtanTagFlags: vi.fn(),
}));
vi.mock("@/lib/server/featured", () => ({ getDailyRareGem: vi.fn() }));
vi.mock("@/lib/server/leadSingerImages", () => ({ fetchPrimaryLeadSingerImages: vi.fn() }));

import { getOccasionPageData } from "./occasionPage";

describe("getOccasionPageData cache boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tagResult = { data: null, error: null };
    const query = { select: mocks.select, eq: mocks.eq, maybeSingle: mocks.maybeSingle };
    mocks.from.mockReturnValue(query);
    mocks.select.mockReturnValue(query);
    mocks.eq.mockReturnValue(query);
    mocks.maybeSingle.mockImplementation(() => Promise.resolve(mocks.tagResult));
  });

  it("returns a missing occasion without entering the cached data loader", async () => {
    const result = await getOccasionPageData("missing");

    expect(result.status).toBe(404);
    expect(result.data).toBeNull();
    expect(mocks.cachedCalls).not.toHaveBeenCalled();
  });

  it("treats tag lookup failures as transient server errors, not cached 404s", async () => {
    mocks.tagResult = { data: null, error: { message: "database unavailable" } };

    const result = await getOccasionPageData("ekadasi");

    expect(result.status).toBe(500);
    expect(result.error).toBe("database unavailable");
    expect(mocks.cachedCalls).not.toHaveBeenCalled();
  });
});
