import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LeadResponse } from "@/types/leads";

const maybeSingleMock = vi.fn();
const fetchLeadDirectoryMock = vi.fn();
const fetchLeadCountsMock = vi.fn();
const fetchLeadKirtansPageMock = vi.fn();
const fetchKirtanTagFlagsMock = vi.fn();
const getDailyRareGemMock = vi.fn();

vi.mock("next/cache", () => ({
  unstable_cache:
    <T extends (...args: any[]) => any>(fn: T) =>
    (...args: Parameters<T>) =>
      fn(...args),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: maybeSingleMock,
        })),
      })),
    })),
  },
}));

vi.mock("@/lib/server/leadDirectory", () => ({
  fetchLeadDirectory: (...args: unknown[]) => fetchLeadDirectoryMock(...args),
  OTHER_LEAD_ID: "others",
  OTHER_LEAD_SLUG: "others",
  OTHER_LEAD_LABEL: "Other Lead Singers",
}));

vi.mock("@/lib/server/leadKirtans", () => ({
  fetchLeadCounts: (...args: unknown[]) => fetchLeadCountsMock(...args),
  fetchLeadKirtansPage: (...args: unknown[]) => fetchLeadKirtansPageMock(...args),
  firstAvailableLeadType: (counts: Record<string, number>) =>
    counts.MM > 0 ? "MM" : counts.BHJ > 0 ? "BHJ" : counts.HK > 0 ? "HK" : null,
}));

vi.mock("@/lib/server/kirtanTags", () => ({
  fetchKirtanTagFlags: (...args: unknown[]) => fetchKirtanTagFlagsMock(...args),
}));

vi.mock("@/lib/server/featured", () => ({
  getDailyRareGem: (...args: unknown[]) => getDailyRareGemMock(...args),
}));

const row = {
  id: "k1",
  audio_url: "https://example.com/1.mp3",
  type: "MM" as const,
  title: "Maha Mantra",
  lead_singer: "Singer",
  lead_singer_id: "lead-1",
  recorded_date: "2026-01-01",
  recorded_date_precision: "day" as const,
  sanga: "Kunj",
  duration_seconds: 120,
  sequence_num: 1,
};

describe("getLeadPageData", () => {
  beforeEach(() => {
    maybeSingleMock.mockReset();
    fetchLeadDirectoryMock.mockReset();
    fetchLeadCountsMock.mockReset();
    fetchLeadKirtansPageMock.mockReset();
    fetchKirtanTagFlagsMock.mockReset();
    getDailyRareGemMock.mockReset();

    maybeSingleMock.mockResolvedValue({
      data: { id: "lead-1", display_name: "Lead Singer" },
      error: null,
    });

    fetchLeadCountsMock.mockResolvedValue({
      counts: { MM: 1, BHJ: 0, HK: 0 },
      error: null,
    });

    fetchLeadKirtansPageMock.mockResolvedValue({
      rows: [row],
      hasMore: false,
      nextCursor: null,
      error: null,
    });

    fetchKirtanTagFlagsMock.mockResolvedValue({
      harmoniumIds: new Set<string>(),
      rareGemIds: new Set<string>(),
      error: null,
    });

    getDailyRareGemMock.mockResolvedValue({
      kirtan: null,
      error: null,
    });
  });

  it("returns page data successfully for a normal lead", async () => {
    const { getLeadPageData } = await import("./leadPage");
    const result = await getLeadPageData("lead-singer");

    expect(result.status).toBe(200);
    expect(result.error).toBeNull();
    expect((result.data as LeadResponse).kirtans).toHaveLength(1);
  });

  it("does not fail the page when featured lookup errors", async () => {
    getDailyRareGemMock.mockResolvedValue({
      kirtan: null,
      error: "temporary featured failure",
    });

    const { getLeadPageData } = await import("./leadPage");
    const result = await getLeadPageData("lead-singer");

    expect(result.status).toBe(200);
    expect(result.error).toBeNull();
    expect(result.data?.featured).toBeNull();
  });

  it("does not fail the page when tag lookup errors", async () => {
    fetchKirtanTagFlagsMock.mockResolvedValue({
      harmoniumIds: new Set<string>(),
      rareGemIds: new Set<string>(),
      error: "temporary tag failure",
    });

    const { getLeadPageData } = await import("./leadPage");
    const result = await getLeadPageData("lead-singer");

    expect(result.status).toBe(200);
    expect(result.error).toBeNull();
    expect(result.data?.kirtans[0].has_harmonium).toBe(false);
    expect(result.data?.kirtans[0].is_rare_gem).toBe(false);
  });

  it("retries once when a transient fetch failure occurs", async () => {
    fetchLeadCountsMock
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValueOnce({
        counts: { MM: 1, BHJ: 0, HK: 0 },
        error: null,
      });

    const { getLeadPageData } = await import("./leadPage");
    const result = await getLeadPageData("lead-singer");

    expect(result.status).toBe(200);
    expect(fetchLeadCountsMock).toHaveBeenCalledTimes(2);
  });

  it("returns a 500-shaped result after retry exhaustion", async () => {
    fetchLeadCountsMock.mockRejectedValue(new Error("fetch failed"));

    const { getLeadPageData } = await import("./leadPage");
    const result = await getLeadPageData("lead-singer");

    expect(result.status).toBe(500);
    expect(result.error).toContain("Temporary network issue");
  });
});
