import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

type MockResult = { data: unknown; error: null | { message: string } };
type MockBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  then: (
    onFulfilled: (value: MockResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise<unknown>;
};

let builder: MockBuilder;
const fromMock = vi.fn((..._args: unknown[]) => builder);

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
  self.limit = vi.fn(chain);
  self.ilike = vi.fn(chain);
  self.gte = vi.fn(chain);
  self.lte = vi.fn(chain);
  self.or = vi.fn(chain);
  self.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);

  return self;
}

beforeEach(() => {
  fromMock.mockClear();
});

describe("GET /api/explore/maha-mantras", () => {
  it("returns paginated mantras with cursor", async () => {
    builder = createMockBuilder({
      data: [
        {
          id: "3",
          audio_url: "a3",
          type: "MM",
          title: "Maha Mantra",
          lead_singer: "S1",
          recorded_date: "2020-01-03",
          sanga: "X",
          duration_seconds: 100,
          created_at: "2025-02-03T00:00:00Z",
        },
        {
          id: "2",
          audio_url: "a2",
          type: "MM",
          title: "Maha Mantra",
          lead_singer: "S2",
          recorded_date: "2020-01-02",
          sanga: "Y",
          duration_seconds: 200,
          created_at: "2025-02-02T00:00:00Z",
        },
        {
          id: "1",
          audio_url: "a1",
          type: "MM",
          title: "Maha Mantra",
          lead_singer: "S3",
          recorded_date: "2020-01-01",
          sanga: "Z",
          duration_seconds: 300,
          created_at: "2025-02-01T00:00:00Z",
        },
      ],
      error: null,
    });

    const res = await GET(
      new Request("http://localhost/api/explore/maha-mantras?limit=2"),
    );
    const json = await res.json();

    expect(json.mantras).toHaveLength(2);
    expect(json.has_more).toBe(true);
    expect(json.next_cursor).toEqual({
      created_at: "2025-02-02T00:00:00Z",
      id: "2",
    });
  });

  it("applies duration filter buckets", async () => {
    builder = createMockBuilder({ data: [], error: null });

    await GET(
      new Request(
        "http://localhost/api/explore/maha-mantras?duration=UNDER_10",
      ),
    );

    expect(builder.lte).toHaveBeenCalledWith("duration_seconds", 600);
    expect(builder.gte).not.toHaveBeenCalled();
  });

  it("applies cursor pagination", async () => {
    builder = createMockBuilder({ data: [], error: null });

    await GET(
      new Request(
        "http://localhost/api/explore/maha-mantras?cursor_created_at=2025-02-02T00:00:00Z&cursor_id=abc",
      ),
    );

    expect(builder.or).toHaveBeenCalledWith(
      "created_at.lt.2025-02-02T00:00:00Z,and(created_at.eq.2025-02-02T00:00:00Z,id.lt.abc)",
    );
  });

  it("applies search and duration filters together", async () => {
    builder = createMockBuilder({ data: [], error: null });

    await GET(
      new Request(
        "http://localhost/api/explore/maha-mantras?search=radha&duration=BETWEEN_10_20",
      ),
    );

    expect(builder.ilike).toHaveBeenCalledWith("lead_singer", "%radha%");
    expect(builder.gte).toHaveBeenCalledWith("duration_seconds", 600);
    expect(builder.lte).toHaveBeenCalledWith("duration_seconds", 1200);
  });

  it("returns error payload when supabase fails", async () => {
    builder = createMockBuilder({
      data: null,
      error: { message: "Boom" },
    });

    const res = await GET(
      new Request("http://localhost/api/explore/maha-mantras"),
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Boom");
  });
});
