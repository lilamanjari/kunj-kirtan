import { describe, it, expect, vi } from "vitest";
import { fetchHarmoniumIds } from "./harmonium";

const fromMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({
            then: (onFulfilled: any, onRejected: any) =>
              Promise.resolve(fromMock()).then(onFulfilled, onRejected),
          }),
        }),
      }),
    }),
  },
}));

describe("fetchHarmoniumIds", () => {
  it("returns empty set for empty ids", async () => {
    const result = await fetchHarmoniumIds([]);
    expect(result.harmoniumIds.size).toBe(0);
  });

  it("returns ids when query succeeds", async () => {
    fromMock.mockReturnValueOnce({
      data: [{ kirtan_id: "a" }, { kirtan_id: "b" }],
      error: null,
    });

    const result = await fetchHarmoniumIds(["a", "b"]);
    expect(result.harmoniumIds.has("a")).toBe(true);
    expect(result.harmoniumIds.has("b")).toBe(true);
  });

  it("returns error when query fails", async () => {
    fromMock.mockReturnValueOnce({
      data: null,
      error: { message: "Boom" },
    });

    const result = await fetchHarmoniumIds(["a"]);
    expect(result.error).toBe("Boom");
  });
});
