// @vitest-environment jsdom
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import KirtanDetailPageClient from "./KirtanDetailPageClient";
import type { PublicKirtanPageData } from "@/lib/server/kirtanPage";

const selectMock = vi.fn();

const baseKirtan = {
  id: "shared-kirtan",
  audio_url: "https://example.com/shared.mp3",
  type: "BHJ" as const,
  title: "Shared Kirtan",
  lead_singer: "Shared Singer",
  recorded_date: "2026-01-02",
  sanga: "Kunj",
};

const pageData: PublicKirtanPageData = {
  kirtan: baseKirtan,
  moreByLeadSinger: [],
  featuredKirtans: [],
  popularKirtans: [],
};

vi.mock("@/lib/components/FeaturedKirtanCard", () => ({
  default: () => <div>Featured card</div>,
}));

vi.mock("@/lib/components/HomeCuratedKirtanStrip", () => ({
  default: () => <div>Strip</div>,
}));

vi.mock("@/lib/components/LocalizedLink", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/components/SubpageHeader", () => ({
  default: () => <div>Header</div>,
}));

vi.mock("@/lib/i18n/LocaleProvider", () => ({
  useLocale: () => "en",
  useDictionary: () => ({
    home: {
      recommended: "Recommended",
      popular: "Popular",
    },
    common: {
      aboutKunjKirtan: "About Kunj Kirtan",
    },
  }),
}));

const useAudioPlayerMock = vi.fn();

vi.mock("@/lib/audio/AudioPlayerContext", () => ({
  useAudioPlayer: () => useAudioPlayerMock(),
}));

describe("KirtanDetailPageClient", () => {
  beforeEach(() => {
    selectMock.mockReset();
    useAudioPlayerMock.mockReset();
  });

  it("selects the page kirtan so the player is primed when idle", () => {
    useAudioPlayerMock.mockReturnValue({
      current: null,
      state: "paused",
      select: selectMock,
      play: vi.fn(),
      isActive: vi.fn(() => false),
      isPlaying: vi.fn(() => false),
      isLoading: vi.fn(() => false),
      enqueue: vi.fn(),
      dequeueById: vi.fn(),
      isQueued: vi.fn(() => false),
      toggleFavorite: vi.fn(),
      isFavorited: vi.fn(() => false),
    });

    render(<KirtanDetailPageClient data={pageData} />);

    expect(selectMock).toHaveBeenCalledWith(baseKirtan);
  });

  it("does not replace a different kirtan that is already playing", () => {
    useAudioPlayerMock.mockReturnValue({
      current: {
        ...baseKirtan,
        id: "other-kirtan",
        title: "Other Kirtan",
      },
      state: "playing",
      select: selectMock,
      play: vi.fn(),
      isActive: vi.fn(() => false),
      isPlaying: vi.fn(() => false),
      isLoading: vi.fn(() => false),
      enqueue: vi.fn(),
      dequeueById: vi.fn(),
      isQueued: vi.fn(() => false),
      toggleFavorite: vi.fn(),
      isFavorited: vi.fn(() => false),
    });

    render(<KirtanDetailPageClient data={pageData} />);

    expect(selectMock).not.toHaveBeenCalled();
  });
});
