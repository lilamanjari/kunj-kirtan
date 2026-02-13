import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

type MockResult = { data: unknown; error: null | { message: string } };
type MockBuilder = {
  select: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
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
  self.ilike = vi.fn(chain);
  self.order = vi.fn(chain);
  self.limit = vi.fn(chain);
  self.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);

  return self;
}

beforeEach(() => {
  fromMock.mockClear();
});

describe("GET /api/explore/leads/suggest", () => {
  it("returns empty suggestions for short queries", async () => {
    builder = createMockBuilder({ data: [], error: null });

    const res = await GET(
      new Request("http://localhost/api/explore/leads/suggest?q=a"),
    );
    const json = await res.json();

    expect(json.suggestions).toEqual([]);
    expect(builder.select).not.toHaveBeenCalled();
  });

  it("returns empty suggestions when query is blank", async () => {
    builder = createMockBuilder({ data: [], error: null });

    const res = await GET(
      new Request("http://localhost/api/explore/leads/suggest?q=   "),
    );
    const json = await res.json();

    expect(json.suggestions).toEqual([]);
    expect(builder.select).not.toHaveBeenCalled();
  });

  it("returns ordered suggestions", async () => {
    builder = createMockBuilder({
      data: [{ display_name: "A" }, { display_name: "B" }],
      error: null,
    });

    const res = await GET(
      new Request("http://localhost/api/explore/leads/suggest?q=ab"),
    );
    const json = await res.json();

    expect(json.suggestions).toEqual(["A", "B"]);
    expect(builder.ilike).toHaveBeenCalledWith("display_name", "%ab%");
    expect(builder.limit).toHaveBeenCalledWith(8);
  });

  it("returns error payload when supabase fails", async () => {
    builder = createMockBuilder({
      data: null,
      error: { message: "DB down" },
    });

    const res = await GET(
      new Request("http://localhost/api/explore/leads/suggest?q=ga"),
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("DB down");
  });
});
