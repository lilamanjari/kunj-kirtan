import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

type MockResult = { data: unknown; error: null | { message: string } };

let builder: ReturnType<typeof createMockBuilder>;
const fromMock = vi.fn(() => builder);

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

function createMockBuilder(result: MockResult) {
  const self: any = {};
  const chain = () => self;

  self.select = vi.fn(chain);
  self.eq = vi.fn(chain);
  self.order = vi.fn(chain);
  self.ilike = vi.fn(chain);
  self.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);

  return self;
}

beforeEach(() => {
  fromMock.mockClear();
});

describe("GET /api/explore/bhajans", () => {
  it("returns bhajans list", async () => {
    builder = createMockBuilder({
      data: [
        {
          id: "1",
          audio_url: "a1",
          type: "BHJ",
          title: "Bhajan One",
          lead_singer: "S1",
          recorded_date: "2020-01-01",
          sanga: "X",
          duration_seconds: 123,
        },
      ],
      error: null,
    });

    const res = await GET(new Request("http://localhost/api/explore/bhajans"));
    const json = await res.json();

    expect(json.bhajans).toHaveLength(1);
    expect(json.bhajans[0]).toMatchObject({
      id: "1",
      title: "Bhajan One",
      duration_seconds: 123,
    });
  });

  it("applies search filter", async () => {
    builder = createMockBuilder({ data: [], error: null });

    await GET(
      new Request("http://localhost/api/explore/bhajans?search=ram"),
    );

    expect(builder.ilike).toHaveBeenCalledWith("title", "%ram%");
  });

  it("returns error payload when supabase fails", async () => {
    builder = createMockBuilder({
      data: null,
      error: { message: "Query failed" },
    });

    const res = await GET(new Request("http://localhost/api/explore/bhajans"));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Query failed");
  });
});
