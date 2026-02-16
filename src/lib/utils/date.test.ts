import { describe, it, expect } from "vitest";
import { formatDateLong, formatDateShort } from "./date";

describe("date utils", () => {
  it("formats YYYY-MM-DD safely for short format", () => {
    const formatted = formatDateShort("2025-12-05");
    expect(formatted).toMatch(/05 Dec 2025|5 Dec 2025/);
  });

  it("formats YYYY-MM-DD safely for long format", () => {
    const formatted = formatDateLong("2025-12-05");
    expect(formatted).toMatch(/05 December 2025|5 December 2025/);
  });

  it("formats month precision without day", () => {
    const formatted = formatDateShort("2002-11-01", "month");
    expect(formatted).toMatch(/Nov 2002/);
  });

  it("formats year precision without month/day", () => {
    const formatted = formatDateLong("2002-01-01", "year");
    expect(formatted).toMatch(/2002/);
  });

  it("returns empty string when date is missing", () => {
    const formatted = formatDateShort(null);
    expect(formatted).toBe("");
  });
});
