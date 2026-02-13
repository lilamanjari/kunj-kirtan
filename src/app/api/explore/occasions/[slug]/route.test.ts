import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

type MockResult = { data: unknown; error: null | { message: string } };
type MockBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
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
  self.maybeSingle = vi.fn(chain);
  self.in = vi.fn(chain);
  self.order = vi.fn(chain);
  self.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);

  return self;
}

beforeEach(() => {
  fromMock.mockClear();
});

describe("GET /api/explore/occasions/[slug]", () => {
  it("returns 404 when tag not found", async () => {
    const sequence: MockResult[] = [
      { data: null, error: null },
    ];

    fromMock.mockImplementation(() => {
      const result = sequence.shift() ?? { data: null, error: null };
      builder = createMockBuilder(result);
      return builder;
    });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "missing" }),
    });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Occasion not found");
  });

  it("returns empty list when no kirtans for occasion", async () => {
    const sequence: MockResult[] = [
      { data: { id: "t1", name: "Ekadasi", slug: "ekadasi" }, error: null },
      { data: [], error: null },
    ];

    fromMock.mockImplementation(() => {
      const result = sequence.shift() ?? { data: null, error: null };
      builder = createMockBuilder(result);
      return builder;
    });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "ekadasi" }),
    });
    const json = await res.json();

    expect(json.tag.slug).toBe("ekadasi");
    expect(json.kirtans).toEqual([]);
  });

  it("returns kirtans for occasion", async () => {
    const sequence: MockResult[] = [
      { data: { id: "t1", name: "Ekadasi", slug: "ekadasi" }, error: null },
      { data: [{ kirtan_id: "k1" }], error: null },
      {
        data: [
          {
            id: "k1",
            audio_url: "a1",
            type: "MM",
            title: "Maha Mantra",
            lead_singer: "S1",
            recorded_date: "2020-01-01",
            sanga: "X",
            duration_seconds: 120,
          },
        ],
        error: null,
      },
    ];

    fromMock.mockImplementation(() => {
      const result = sequence.shift() ?? { data: null, error: null };
      builder = createMockBuilder(result);
      return builder;
    });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "ekadasi" }),
    });
    const json = await res.json();

    expect(json.kirtans).toHaveLength(1);
    expect(json.kirtans[0]).toMatchObject({
      id: "k1",
      duration_seconds: 120,
    });
  });

  it("returns error when tag lookup fails", async () => {
    const sequence: MockResult[] = [
      { data: null, error: { message: "Tag error" } },
    ];

    fromMock.mockImplementation(() => {
      const result = sequence.shift() ?? { data: null, error: null };
      builder = createMockBuilder(result);
      return builder;
    });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "ekadasi" }),
    });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Occasion not found");
  });

  it("returns error when kirtan link lookup fails", async () => {
    const sequence: MockResult[] = [
      { data: { id: "t1", name: "Ekadasi", slug: "ekadasi" }, error: null },
      { data: null, error: { message: "Link error" } },
    ];

    fromMock.mockImplementation(() => {
      const result = sequence.shift() ?? { data: null, error: null };
      builder = createMockBuilder(result);
      return builder;
    });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "ekadasi" }),
    });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Link error");
  });

  it("returns error when kirtan lookup fails", async () => {
    const sequence: MockResult[] = [
      { data: { id: "t1", name: "Ekadasi", slug: "ekadasi" }, error: null },
      { data: [{ kirtan_id: "k1" }], error: null },
      { data: null, error: { message: "Kirtan error" } },
    ];

    fromMock.mockImplementation(() => {
      const result = sequence.shift() ?? { data: null, error: null };
      builder = createMockBuilder(result);
      return builder;
    });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "ekadasi" }),
    });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Kirtan error");
  });
});
