import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { fetchLeadDirectory } from "@/lib/server/leadDirectory";

vi.mock("@/lib/server/leadDirectory", () => ({
  fetchLeadDirectory: vi.fn(),
}));

describe("GET /api/explore/leads", () => {
  beforeEach(() => {
    vi.mocked(fetchLeadDirectory).mockReset();
  });

  it("returns leads with counts and the grouped others row last", async () => {
    vi.mocked(fetchLeadDirectory).mockResolvedValue({
      leads: [
        {
          id: "lead-1",
          display_name: "Krishna Das",
          slug: "krishna-das",
          count: 24,
        },
        {
          id: "others",
          display_name: "Other Lead Singers",
          slug: "others",
          count: 7,
        },
      ],
      otherLeadIds: ["lead-2", "lead-3"],
      otherCounts: { MM: 2, BHJ: 4, HK: 1 },
      error: null,
    });

    const res = await GET();
    const json = await res.json();

    expect(json.leads).toEqual([
      {
        id: "lead-1",
        display_name: "Krishna Das",
        slug: "krishna-das",
        count: 24,
      },
      {
        id: "others",
        display_name: "Other Lead Singers",
        slug: "others",
        count: 7,
      },
    ]);
  });
});
