import { describe, expect, it } from "vitest";
import type { KirtanSummary } from "@/types/kirtan";
import {
  compareLeadDirectoryItems,
  compareOccasionKirtans,
} from "./occasionCurations";

function makeKirtan(
  id: string,
  type: "BHJ" | "MM",
  title: string,
): KirtanSummary {
  return {
    id,
    audio_url: `https://example.com/${id}.mp3`,
    type,
    title,
    lead_singer: null,
    recorded_date: null,
    sanga: "Kunj",
  };
}

describe("occasionCurations", () => {
  it("sorts occasion kirtans with bhajans first and alphabetically", () => {
    const sorted = [
      makeKirtan("3", "MM", "Hare Krishna"),
      makeKirtan("1", "BHJ", "Gurudeva"),
      makeKirtan("2", "BHJ", "Ayi Nanda-Tanuja"),
      makeKirtan("4", "MM", "Sri Krishna Caitanya"),
    ].sort(compareOccasionKirtans);

    expect(sorted.map((item) => `${item.type}:${item.title}`)).toEqual([
      "BHJ:Ayi Nanda-Tanuja",
      "BHJ:Gurudeva",
      "MM:Hare Krishna",
      "MM:Sri Krishna Caitanya",
    ]);
  });

  it("sorts lead directory by priority before name", () => {
    const sorted = [
      { display_name: "Aindra Prabhu", slug: "aindra-prabhu", priority: 100 },
      { display_name: "Srila Narayana Maharaja", slug: "srila-narayana-maharaja", priority: 1 },
      { display_name: "Bhakti Ballabh Tirtha Maharaja", slug: "bbt-maharaja", priority: 100 },
    ].sort(compareLeadDirectoryItems);

    expect(sorted[0].display_name).toBe("Srila Narayana Maharaja");
  });
});
