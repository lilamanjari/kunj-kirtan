import { describe, it, expect, vi } from "vitest";
import { fetchKirtanTagFlags } from "./kirtanTags";

const fromMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: () => ({
          in: () => ({
            then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
              Promise.resolve(fromMock()).then(onFulfilled, onRejected),
          }),
        }),
      }),
    }),
  },
}));

describe("fetchKirtanTagFlags", () => {
  it("returns empty sets for empty ids", async () => {
    const result = await fetchKirtanTagFlags([]);
    expect(result.harmoniumIds.size).toBe(0);
    expect(result.rareGemIds.size).toBe(0);
  });

  it("returns ids for both harmonium and rare gem tags", async () => {
    fromMock.mockReturnValueOnce({
      data: [
        { kirtan_id: "a", slug: "harmonium" },
        { kirtan_id: "b", slug: "rare-gem" },
        { kirtan_id: "c", slug: "harmonium" },
      ],
      error: null,
    });

    const result = await fetchKirtanTagFlags(["a", "b", "c"]);
    expect(result.harmoniumIds.has("a")).toBe(true);
    expect(result.harmoniumIds.has("c")).toBe(true);
    expect(result.rareGemIds.has("b")).toBe(true);
  });

  it("returns error when query fails", async () => {
    fromMock.mockReturnValueOnce({
      data: null,
      error: { message: "Boom" },
    });

    const result = await fetchKirtanTagFlags(["a"]);
    expect(result.error).toBe("Boom");
  });
});
