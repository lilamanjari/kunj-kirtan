import { expect, it } from "vitest";
import type { KirtanSummary, KirtanType } from "@/types/kirtan";
import { selectFavorites } from "./selectFavorites";
const item = (id: string, type: KirtanType, title: string, recorded_date: string | null): KirtanSummary => ({
  id, type, title, recorded_date, audio_url: "/audio", lead_singer: null, sanga: "",
});
it.each(["MM", "HK"] as const)("sorts %s by recording date descending, undated last", type => {
  const favorites = [item("none", type, "Undated", null), item("old", type, "Older", "2020-01-01"), item("new", type, "Newer", "2026-01-01"), item("other", "BHJ", "Bhajan", null)];
  expect(selectFavorites(favorites, type).map(x => x.id)).toEqual(["new", "old", "none"]);
  expect(favorites[0].id).toBe("none");
});
it("sorts bhajans alphabetically ignoring case and accents", () => {
  const favorites = [item("z", "BHJ", "Zebra", null), item("b", "BHJ", "bhajan", null), item("a", "BHJ", "Ārati", null)];
  expect(selectFavorites(favorites, "BHJ").map(x => x.id)).toEqual(["a", "b", "z"]);
});
