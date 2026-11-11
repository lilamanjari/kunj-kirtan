import { describe, expect, it } from "vitest";
import { featureStatus, oneMonthAfter, toLocalDateTime, type AdminFeature } from "./features";

const feature = { is_active: true, starts_at: "2026-10-26T10:00:00Z", ends_at: "2026-11-26T10:00:00Z" } as AdminFeature;
describe("feature scheduling", () => {
  it("switches from scheduled to current at the start and ends at the exact end", () => {
    expect(featureStatus(feature, Date.parse("2026-10-26T09:59:59Z"))).toBe("scheduled");
    expect(featureStatus(feature, Date.parse(feature.starts_at!))).toBe("current");
    expect(featureStatus(feature, Date.parse(feature.ends_at!))).toBe("ended");
    expect(featureStatus({ ...feature, is_active: false }, Date.parse(feature.starts_at!))).toBe("ended");
  });
  it("clamps one month ahead to the last valid day while preserving local time", () => {
    const next = oneMonthAfter(new Date(2026, 0, 31, 18, 25));
    expect(toLocalDateTime(next)).toBe("2026-02-28T18:25");
    expect(toLocalDateTime(oneMonthAfter(new Date(2028, 0, 31, 9, 0)))).toBe("2028-02-29T09:00");
  });
});
