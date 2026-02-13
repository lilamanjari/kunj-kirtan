import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

type MockResult = { data: unknown; error: null | { message: string } };
type MockBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  then: (
    onFulfilled: (value: MockResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise<unknown>;
};

let builder: MockBuilder;
const fromMock = vi.fn(() => builder);

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

function createMockBuilder(result: MockResult): MockBuilder {
  const self = {} as MockBuilder;
  const chain = () => self;

  self.select = vi.fn(chain);
  self.eq = vi.fn(chain);
  self.order = vi.fn(chain);
  self.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);

  return self;
}

beforeEach(() => {
  fromMock.mockClear();
});

describe("GET /api/explore/occasions", () => {
  it("returns occasions list", async () => {
    builder = createMockBuilder({
      data: [
        { id: "1", name: "Ekadasi", slug: "ekadasi" },
        { id: "2", name: "Janmashtami", slug: "janmashtami" },
      ],
      error: null,
    });

    const res = await GET();
    const json = await res.json();

    expect(json.occasions).toHaveLength(2);
    expect(builder.eq).toHaveBeenCalledWith("category", "occasion");
  });

  it("returns error payload when supabase fails", async () => {
    builder = createMockBuilder({
      data: null,
      error: { message: "DB error" },
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("DB error");
  });
});
