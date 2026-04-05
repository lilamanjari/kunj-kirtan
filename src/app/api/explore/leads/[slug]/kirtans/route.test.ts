import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { fetchLeadDirectory } from "@/lib/server/leadDirectory";

vi.mock("@/lib/server/kirtanTags", () => ({
  fetchKirtanTagFlags: vi.fn().mockResolvedValue({
    harmoniumIds: new Set<string>(),
    rareGemIds: new Set<string>(),
    error: null,
  }),
}));

vi.mock("@/lib/server/leadDirectory", () => ({
  fetchLeadDirectory: vi.fn().mockResolvedValue({
    leads: [],
    otherLeadIds: [],
    otherCounts: { MM: 0, BHJ: 0, HK: 0 },
    error: null,
  }),
  OTHER_LEAD_ID: "others",
  OTHER_LEAD_SLUG: "others",
}));

type QueryState = {
  table: string;
  filters: Record<string, string>;
  limit: number | null;
};

type MockResult = {
  data?: unknown;
  error: null | { message: string };
};

type MockBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (
    onFulfilled: (value: MockResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise<unknown>;
};

const lead = { id: "lead-1" };
const bhjRows = [
  {
    id: "bhj-1",
    audio_url: "audio-bhj-1",
    type: "BHJ",
    title: "A Title",
    lead_singer: "Krishna Das",
    recorded_date: "2025-01-01",
    recorded_date_precision: "day",
    sanga: "Radhe Kunj",
    duration_seconds: 300,
    sequence_num: null,
  },
  {
    id: "bhj-2",
    audio_url: "audio-bhj-2",
    type: "BHJ",
    title: "B Title",
    lead_singer: "Krishna Das",
    recorded_date: "2025-01-02",
    recorded_date_precision: "day",
    sanga: "Radhe Kunj",
    duration_seconds: 320,
    sequence_num: null,
  },
];

function buildResult(state: QueryState): MockResult {
  if (state.table === "lead_singers") {
    return { data: lead, error: null };
  }

  if (state.table === "playable_kirtans") {
    return {
      data: bhjRows.slice(0, state.limit ?? bhjRows.length),
      error: null,
    };
  }

  return { data: null, error: null };
}

function createMockBuilder(table: string): MockBuilder {
  const state: QueryState = {
    table,
    filters: {},
    limit: null,
  };
  const self = {} as MockBuilder;

  self.select = vi.fn(() => self);
  self.eq = vi.fn((column: string, value: string) => {
    state.filters[column] = value;
    return self;
  });
  self.in = vi.fn(() => self);
  self.order = vi.fn(() => self);
  self.limit = vi.fn((value: number) => {
    state.limit = value;
    return self;
  });
  self.or = vi.fn(() => self);
  self.is = vi.fn(() => self);
  self.lt = vi.fn(() => self);
  self.maybeSingle = vi.fn(() => self);
  self.then = (onFulfilled, onRejected) =>
    Promise.resolve(buildResult(state)).then(onFulfilled, onRejected);

  return self;
}

const fromMock = vi.fn((table: string) => createMockBuilder(table));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

beforeEach(() => {
  fromMock.mockClear();
  vi.mocked(fetchLeadDirectory).mockResolvedValue({
    leads: [],
    otherLeadIds: [],
    otherCounts: { MM: 0, BHJ: 0, HK: 0 },
    error: null,
  });
});

describe("GET /api/explore/leads/[slug]/kirtans", () => {
  it("returns a paginated type-filtered list", async () => {
    const res = await GET(
      new Request("http://localhost/api/explore/leads/krishna-das/kirtans?lead_id=lead-1&type=BHJ&limit=1"),
      {
        params: Promise.resolve({ slug: "krishna-das" }),
      },
    );
    const json = await res.json();

    expect(json.type).toBe("BHJ");
    expect(json.has_more).toBe(true);
    expect(json.next_cursor).toEqual({
      title: "A Title",
      id: "bhj-1",
    });
    expect(json.kirtans).toHaveLength(1);
    expect(json.kirtans[0]).toMatchObject({
      type: "BHJ",
      title: "A Title",
    });
    expect(fromMock).not.toHaveBeenCalledWith("lead_singers");
  });

  it("returns grouped kirtans for the others slug", async () => {
    vi.mocked(fetchLeadDirectory).mockResolvedValue({
      leads: [],
      otherLeadIds: ["lead-2", "lead-3"],
      otherCounts: { MM: 0, BHJ: 0, HK: 0 },
      error: null,
    });

    const res = await GET(
      new Request("http://localhost/api/explore/leads/others/kirtans?lead_id=others&type=BHJ&limit=1"),
      {
        params: Promise.resolve({ slug: "others" }),
      },
    );
    const json = await res.json();

    expect(json.type).toBe("BHJ");
    expect(json.has_more).toBe(true);
    expect(json.next_cursor).toEqual({
      title: "A Title",
      id: "bhj-1",
    });
    expect(json.kirtans[0]).toMatchObject({
      type: "BHJ",
      title: "A Title",
    });
    expect(fromMock).not.toHaveBeenCalledWith("lead_singers");
  });
});
