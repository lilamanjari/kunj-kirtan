import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/server/harmonium", () => ({
  fetchHarmoniumIds: vi.fn().mockResolvedValue({
    harmoniumIds: new Set<string>(),
    error: null,
  }),
}));

vi.mock("@/lib/server/featured", () => ({
  getDailyRareGem: vi.fn().mockResolvedValue({
    kirtan: {
      id: "k1",
      audio_url: "a1",
      type: "MM",
      title: "Maha Mantra",
      lead_singer: "S1",
      recorded_date: "2020-01-01",
      sanga: "X",
      duration_seconds: 120,
    },
    error: null,
  }),
}));

type MockResult = { data: unknown; error: null | { message: string } };
type MockBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
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
  self.limit = vi.fn(chain);
  self.order = vi.fn(chain);
  self.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);

  return self;
}

beforeEach(() => {
  fromMock.mockClear();
});

describe("GET /api/home", () => {
  it("returns home data with featured and recently added", async () => {
    const sequence: MockResult[] = [
      {
        data: [
          {
            id: "k2",
            audio_url: "a2",
            type: "BHJ",
            title: "Bhajan One",
            lead_singer: "S2",
            recorded_date: "2020-02-01",
            sanga: "Y",
            duration_seconds: 240,
          },
        ],
        error: null,
      },
    ];

    fromMock.mockImplementation(() => {
      const result = sequence.shift() ?? { data: [], error: null };
      builder = createMockBuilder(result);
      return builder;
    });

    const res = await GET();
    const json = await res.json();

    expect(json.primary_action).toBeTruthy();
    expect(json.recently_added).toHaveLength(1);
    expect(json.recently_added[0]).toMatchObject({
      id: "k2",
      title: "Bhajan One",
      duration_seconds: 240,
    });
  });

  it("returns error when featured kirtan lookup fails", async () => {
    const { getDailyRareGem } = await import("@/lib/server/featured");
    (getDailyRareGem as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      kirtan: null,
      error: "Featured error",
    });

    builder = createMockBuilder({ data: [], error: null });
    fromMock.mockImplementation(() => builder);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Featured error");
  });

  it("returns error when recently added lookup fails", async () => {
    const sequence: MockResult[] = [
      { data: null, error: { message: "Recent error" } },
    ];

    fromMock.mockImplementation(() => {
      const result = sequence.shift() ?? { data: [], error: null };
      builder = createMockBuilder(result);
      return builder;
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Recent error");
  });
});
