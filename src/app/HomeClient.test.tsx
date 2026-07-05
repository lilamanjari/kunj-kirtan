// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes, ReactNode } from "react";
import HomeClient from "./HomeClient";
import type { HomeData } from "@/types/home";
import type { KirtanSummary } from "@/types/kirtan";

const audioPlayerMock = {
  isPlaying: vi.fn(() => false),
  isLoading: vi.fn(() => false),
  isActive: vi.fn(() => false),
  toggle: vi.fn(),
  enqueue: vi.fn(),
  dequeueById: vi.fn(),
  isQueued: vi.fn(() => false),
  toggleFavorite: vi.fn(),
  isFavorited: vi.fn(() => false),
  favorites: [],
  favoritesLoaded: true,
};

const featuredKirtan: KirtanSummary = {
  id: "featured-kirtan",
  audio_url: "https://example.com/featured.mp3",
  type: "MM",
  title: "Featured Kirtan",
  lead_singer: "Featured Singer",
  recorded_date: "2026-01-01",
  sanga: "Kunj",
};

vi.mock("next/image", () => ({
  default: ({
    priority: _priority,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    <img {...props} />
  ),
}));

vi.mock("@/lib/audio/AudioPlayerContext", () => ({
  useAudioPlayer: () => audioPlayerMock,
}));

vi.mock("@/lib/i18n/LocaleProvider", () => ({
  useLocale: () => "en",
  useDictionary: () => ({
    common: {
      discover: "Discover",
      recentlyAdded: "Recently Added",
      aboutKunjKirtan: "About Kunj Kirtan",
    },
    explore: {
      mahaMantra: "Maha Mantra",
      bhajans: "Bhajans",
      leadSingers: "Lead Singers",
      occasions: "Occasions",
    },
    home: {
      currentVrata: "Current Vrata",
      currentVrataSubtitle: "Current Vrata Subtitle",
    },
    actions: {
      dismiss: "Dismiss",
    },
  }),
}));

vi.mock("@/lib/components/LocalizedLink", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/components/HomeFavoritesStrip", () => ({
  default: () => <div>Favorites strip</div>,
}));

vi.mock("@/lib/components/HomePopularStrip", () => ({
  default: () => <div>Popular strip</div>,
}));

vi.mock("@/lib/components/HomeRecommendedStrip", () => ({
  default: () => <div>Recommended strip</div>,
}));

vi.mock("@/lib/components/KirtanListItem", () => ({
  default: ({ kirtan }: { kirtan: KirtanSummary }) => <li>{kirtan.title}</li>,
}));

vi.mock("@/lib/components/FeaturedKirtanCard", () => ({
  default: ({
    kirtan,
    label,
  }: {
    kirtan: KirtanSummary;
    label?: string;
  }) => (
    <div>
      <div>{label ?? "Featured"}</div>
      <div>{kirtan.title}</div>
    </div>
  ),
}));

describe("HomeClient", () => {
  const data: HomeData = {
    primary_action: {
      type: "featured",
      kirtan: featuredKirtan,
    },
    current_occasion: null,
    entry_points: [],
    popular: [],
    recommended: [],
    recently_added: [featuredKirtan],
  };

  it("renders the primary featured kirtan", () => {
    render(<HomeClient data={data} />);

    expect(screen.getByText("Featured")).toBeTruthy();
    expect(screen.getAllByText("Featured Kirtan").length).toBeGreaterThan(0);
  });
});
