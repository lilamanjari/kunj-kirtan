import { beforeEach, describe, expect, it, vi } from "vitest";

type MockResult = { data: unknown; error: null | { message: string } };

const fromMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

function createQueryBuilder(resolveResult: (state: {
  table: string;
  ilikeCalls: Array<{ column: string; pattern: string }>;
}) => MockResult) {
  const state = {
    table: "",
    ilikeCalls: [] as Array<{ column: string; pattern: string }>,
  };

  const builder = {
    select: vi.fn(() => builder),
    ilike: vi.fn((column: string, pattern: string) => {
      state.ilikeCalls.push({ column, pattern });
      return builder;
    }),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (
      onFulfilled: (value: MockResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(resolveResult(state)).then(onFulfilled, onRejected),
  };

  return { builder, state };
}

describe("buildBhajanAlphabetIndex", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("returns browse cursors keyed by letter", async () => {
    fromMock.mockImplementation((table: string) => {
      const { builder, state } = createQueryBuilder(() => {
        const letterFilter = state.ilikeCalls.find(
          (call) => call.column === "title" && call.pattern.endsWith("%"),
        );

        if (letterFilter?.pattern === "S%") {
          return {
            data: [{ browse_id: "browse-sri", title: "Sri Goswamyastakam" }],
            error: null,
          };
        }

        return { data: [], error: null };
      });

      state.table = table;
      return builder;
    });

    const { buildBhajanAlphabetIndex } = await import("./bhajanAlphabet");
    const result = await buildBhajanAlphabetIndex(null);

    expect(result.S).toEqual({
      title: "Sri Goswamyastakam",
      id: "browse-sri",
    });
  });

  it("uses normalized searchable text when search is active", async () => {
    const createdStates: Array<{
      table: string;
      ilikeCalls: Array<{ column: string; pattern: string }>;
    }> = [];

    fromMock.mockImplementation((table: string) => {
      const { builder, state } = createQueryBuilder(() => ({ data: [], error: null }));
      state.table = table;
      createdStates.push(state);
      return builder;
    });

    const { buildBhajanAlphabetIndex } = await import("./bhajanAlphabet");
    await buildBhajanAlphabetIndex("Śrī Gośwāmyāṣṭakam");

    expect(createdStates.length).toBeGreaterThan(0);
    expect(createdStates[0].table).toBe("playable_bhajan_titles");
    expect(createdStates[0].ilikeCalls).toContainEqual({
      column: "searchable_text",
      pattern: "%sri goswamyastakam%",
    });
  });
});
