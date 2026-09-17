import { describe, it, expect, vi } from "vitest";
import { fetchKirtanTagContext, fetchKirtanTagFlags } from "./kirtanTags";

const fromMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => {
        const query = {
          in: () => query,
          eq: () => query,
          then: (
            onFulfilled: (value: unknown) => unknown,
            onRejected?: (reason: unknown) => unknown,
          ) => Promise.resolve(fromMock()).then(onFulfilled, onRejected),
        };
        return query;
      },
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

describe("fetchKirtanTagContext", () => {
  it("derives flags and only occasion/person display context", async () => {
    fromMock.mockReturnValueOnce({
      data: [
        { kirtan_id: "a", tags: { slug: "harmonium", name: "H", category: "instrument" } },
        { kirtan_id: "a", tags: { slug: "kartika", name: "Kartika", category: "occasion" } },
        { kirtan_id: "a", tags: { slug: "morning", name: "Morning Bhajan", category: "occasion" } },
        { kirtan_id: "a", tags: { slug: "srila-prabhupada", name: "Srila Prabhupada", category: "person" } },
        { kirtan_id: "b", tags: { slug: "rare-gem", name: "Rare Gem", category: "flag" } },
        { kirtan_id: "b", tags: { slug: "altar", name: "Deity Altar", category: "altar" } },
      ],
      error: null,
    });

    const result = await fetchKirtanTagContext(["a", "b"]);

    expect(result.harmoniumIds.has("a")).toBe(true);
    expect(result.rareGemIds.has("b")).toBe(true);
    expect(result.tagContextById.get("a")).toEqual({
      occasionTags: ["Kartika", "Morning Bhajan"],
      personTag: "Srila Prabhupada",
    });
    expect(result.tagContextById.has("b")).toBe(false);
  });

  it("returns an error without partial context", async () => {
    fromMock.mockReturnValueOnce({
      data: null,
      error: { message: "Boom" },
    });

    const result = await fetchKirtanTagContext(["a"]);

    expect(result.error).toBe("Boom");
    expect(result.harmoniumIds.size).toBe(0);
    expect(result.tagContextById.size).toBe(0);
  });
});
