// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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
  select: vi.fn(),
};

const sharedKirtan: KirtanSummary = {
  id: "shared-kirtan",
  audio_url: "https://example.com/shared.mp3",
  type: "BHJ",
  title: "Shared Kirtan",
  lead_singer: "Shared Singer",
  recorded_date: "2026-01-02",
  sanga: "Kunj",
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
      sharedWithYou: "Shared with you",
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
      sharedKirtanContext: "Someone shared this kirtan with you.",
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
    onDismiss,
  }: {
    kirtan: KirtanSummary;
    label?: string;
    onDismiss?: () => void;
  }) => (
    <div>
      <div>{label ?? "Featured"}</div>
      <div>{kirtan.title}</div>
      {onDismiss ? <button onClick={onDismiss}>Dismiss</button> : null}
    </div>
  ),
}));

vi.mock("@/lib/components/KirtanDeepLinkHandler", () => ({
  default: ({ onPin }: { onPin: (kirtan: KirtanSummary) => void }) => (
    <button onClick={() => onPin(sharedKirtan)}>Trigger shared kirtan</button>
  ),
}));

describe("HomeClient shared kirtan UX", () => {
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

  it("renders a dismissible shared card separate from the featured card", () => {
    vi.useFakeTimers();

    render(<HomeClient data={data} />);

    expect(screen.getByText("Featured")).toBeTruthy();
    expect(screen.getAllByText("Featured Kirtan").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("Trigger shared kirtan"));

    expect(screen.getByText("Shared with you")).toBeTruthy();
    expect(screen.getAllByText("Shared Kirtan").length).toBeGreaterThan(0);
    expect(screen.getByText("Featured")).toBeTruthy();

    fireEvent.click(screen.getByText("Dismiss"));

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText("Shared with you")).toBeNull();
    expect(screen.getByText("Featured")).toBeTruthy();

    vi.useRealTimers();
  });
});
