import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const fetchKirtanTagFlagsMock = vi.fn();

vi.mock("@/lib/server/kirtanTags", () => ({
  fetchKirtanTagFlags: (...args: unknown[]) => fetchKirtanTagFlagsMock(...args),
}));

vi.mock("@/lib/server/featured", () => ({
  getDailyRareGem: vi.fn().mockResolvedValue({
    kirtan: null,
    error: null,
  }),
}));

type MockResult = { data: unknown; error: null | { message: string } };
type MockBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
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
    from: () => fromMock(),
  },
}));

function createMockBuilder(result: MockResult): MockBuilder {
  const self = {} as MockBuilder;
  const chain = () => self;

  self.select = vi.fn(chain);
  self.eq = vi.fn(chain);
  self.order = vi.fn(chain);
  self.ilike = vi.fn(chain);
  self.or = vi.fn(chain);
  self.limit = vi.fn(chain);
  self.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);

  return self;
}

beforeEach(() => {
  fromMock.mockClear();
  fetchKirtanTagFlagsMock.mockReset();
  fetchKirtanTagFlagsMock.mockResolvedValue({
    harmoniumIds: new Set<string>(),
    rareGemIds: new Set<string>(),
    error: null,
  });
});

describe("GET /api/explore/bhajans", () => {
  it("returns bhajans list", async () => {
    builder = createMockBuilder({
      data: [
        {
          browse_id: "browse-1",
          kirtan_id: "1",
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
    expect(json.has_more).toBe(false);
    expect(json.next_cursor).toBeNull();
    expect(json.featured).toBeNull();
    expect(json.alphabet_index).toBeDefined();
  });

  it("returns multiple browse entries for the same underlying kirtan", async () => {
    builder = createMockBuilder({
      data: [
        {
          browse_id: "browse-official",
          kirtan_id: "shared-kirtan",
          audio_url: "a1",
          type: "BHJ",
          title: "Sri Goswamyastakam",
          lead_singer: "S1",
          recorded_date: "2020-01-01",
          sanga: "X",
          duration_seconds: 123,
        },
        {
          browse_id: "browse-first-line",
          kirtan_id: "shared-kirtan",
          audio_url: "a1",
          type: "BHJ",
          title: "Indranila Mani Manjula Varnah",
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

    expect(json.bhajans).toHaveLength(2);
    expect(json.bhajans[0].id).toBe("shared-kirtan");
    expect(json.bhajans[1].id).toBe("shared-kirtan");
    expect(json.bhajans[0].title).toBe("Sri Goswamyastakam");
    expect(json.bhajans[1].title).toBe("Indranila Mani Manjula Varnah");
    expect(fetchKirtanTagFlagsMock).toHaveBeenCalledWith(["shared-kirtan"]);
  });

  it("applies search filter", async () => {
    builder = createMockBuilder({ data: [], error: null });

    await GET(
      new Request("http://localhost/api/explore/bhajans?search=ram"),
    );

    expect(builder.ilike).toHaveBeenCalledWith("searchable_text", "%ram%");
  });

  it("searches through alias text, not only the visible browse title", async () => {
    builder = createMockBuilder({
      data: [
        {
          browse_id: "browse-first-line",
          kirtan_id: "shared-kirtan",
          audio_url: "a1",
          type: "BHJ",
          title: "Indranila Mani Manjula Varnah",
          searchable_text: "indranila mani manjula varnah sri goswamyastakam",
          lead_singer: "S1",
          recorded_date: "2020-01-01",
          sanga: "X",
          duration_seconds: 123,
        },
      ],
      error: null,
    });

    const res = await GET(
      new Request("http://localhost/api/explore/bhajans?search=%C5%9Ar%C4%AB%20Go%C5%9Bw%C4%81my%C4%81%E1%B9%A3%E1%B9%ADakam"),
    );
    const json = await res.json();

    expect(builder.ilike).toHaveBeenCalledWith(
      "searchable_text",
      "%sri goswamyastakam%",
    );
    expect(json.bhajans).toHaveLength(1);
    expect(json.bhajans[0]).toMatchObject({
      id: "shared-kirtan",
      title: "Indranila Mani Manjula Varnah",
    });
  });

  it("applies cursor pagination", async () => {
    builder = createMockBuilder({ data: [], error: null });

    await GET(
      new Request(
        "http://localhost/api/explore/bhajans?cursor_title=Bhajan%20A&cursor_id=abc",
      ),
    );

    expect(builder.or).toHaveBeenCalledWith(
      'title.gt."Bhajan A",and(title.eq."Bhajan A",browse_id.gt.abc)',
    );
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
