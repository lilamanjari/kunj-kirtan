import { describe, expect, it } from "vitest";

import { getDisplayKirtanTitle } from "./bhajanDisplayTitle";

describe("getDisplayKirtanTitle", () => {
  it("prefers display_title over the legacy kirtans title", () => {
    const result = getDisplayKirtanTitle(
      {
        type: "BHJ",
        title: "Legacy Title",
        display_title: "Sri Lalitastakam",
      },
    );

    expect(result).toBe("Sri Lalitastakam");
  });

  it("falls back from official to first line to legacy title", () => {
    expect(
      getDisplayKirtanTitle({
        type: "BHJ",
        title: "Legacy Title",
        official_title: "Sri Lalitastakam",
        first_line_title: "Radhe Jaya Jaya Madhava Dayite",
      }),
    ).toBe("Sri Lalitastakam");

    expect(
      getDisplayKirtanTitle({
        type: "BHJ",
        title: "Legacy Title",
        first_line_title: "Radhe Jaya Jaya Madhava Dayite",
      }),
    ).toBe("Radhe Jaya Jaya Madhava Dayite");

    const result = getDisplayKirtanTitle(
      {
        type: "BHJ",
        title: "Legacy Title",
      },
    );

    expect(result).toBe("Legacy Title");
  });

  it("keeps maha mantra formatting behavior unchanged", () => {
    const result = getDisplayKirtanTitle(
      {
        type: "MM",
        title: "Popular Kirtan",
        display_title: "Ignored",
      },
    );

    expect(result).toBe("Maha Mantra Popular Kirtan");
  });
});
