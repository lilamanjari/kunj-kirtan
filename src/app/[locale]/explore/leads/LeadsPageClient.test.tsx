// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import LeadsPageClient from "./LeadsPageClient";
import type { LeadItem } from "@/types/explore";

vi.mock("@/lib/i18n/LocaleProvider", () => ({
  useLocale: () => "en",
  useDictionary: () => ({
    common: { home: "Home" },
    explore: { noLeadSingersFound: "No lead singers found." },
  }),
}));

vi.mock("@/lib/components/SubpageHeader", () => ({
  default: () => <div>Header</div>,
}));

describe("LeadsPageClient", () => {
  it("uses the saved portrait focus instead of a server-side square crop", () => {
    const lead: LeadItem = {
      id: "lead-1",
      display_name: "Kancana Devi Dasi",
      slug: "kancana-devi-dasi",
      count: 12,
      image_url: "https://img.kunjkirtans.com/lead-singers/kancana.jpg",
      image_focus_x: 42,
      image_focus_y: 18,
    };

    const { container } = render(<LeadsPageClient leads={[lead]} />);

    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    expect(image?.getAttribute("src")).toContain("w=160");
    expect(image?.getAttribute("src")).not.toContain("h=160");
    expect(image?.getAttribute("style")).toContain(
      "object-position: 42% 18%",
    );
  });
});
