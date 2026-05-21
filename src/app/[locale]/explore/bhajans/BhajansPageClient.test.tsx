/* @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeAll } from "vitest";
import BhajansPageClient from "./BhajansPageClient";
import type { BhajansResponse } from "@/types/bhajans";

vi.mock("@/lib/audio/AudioPlayerContext", () => ({
  useAudioPlayer: () => ({
    toggle: vi.fn(),
    isActive: vi.fn(() => false),
    isPlaying: vi.fn(() => false),
    isLoading: vi.fn(() => false),
    playCollection: vi.fn(),
    enqueue: vi.fn(),
    dequeueById: vi.fn(),
    isQueued: vi.fn(() => false),
    toggleFavorite: vi.fn(),
    isFavorited: vi.fn(() => false),
    select: vi.fn(),
  }),
}));

vi.mock("@/lib/i18n/LocaleProvider", () => ({
  useDictionary: () => ({
    explore: {
      bhajans: "Bhajans",
      noBhajansMatch: "No bhajans match",
      loadingMore: "Loading more",
      moreBelow: "More below",
    },
    common: {
      home: "Home",
    },
    actions: {
      playAll: "Play all",
      shuffle: "Shuffle",
    },
  }),
}));

vi.mock("@/lib/components/KirtanListItem", () => ({
  default: ({ kirtan }: { kirtan: { title: string; id: string; browse_id?: string } }) => (
    <div data-testid="kirtan-row">
      {kirtan.title}::{kirtan.id}::{kirtan.browse_id ?? "none"}
    </div>
  ),
}));

vi.mock("@/lib/components/KirtanDeepLinkHandler", () => ({
  default: () => null,
}));

vi.mock("@/lib/components/FeaturedKirtanCard", () => ({
  default: () => null,
}));

vi.mock("@/lib/components/SubpageHeader", () => ({
  default: () => null,
}));

vi.mock("@/lib/components/AlphabetRail", () => ({
  default: () => null,
}));

vi.mock("@/lib/net/fetchWithStatus", () => ({
  fetchWithStatus: vi.fn(),
}));

vi.mock("@/lib/theme/pagePalettes", () => ({
  bhajansPalette: { featuredCard: {} },
}));

vi.mock("@bradleyhodges/sfsymbols-react", () => ({
  SFIcon: () => null,
}));

vi.mock("@bradleyhodges/sfsymbols", () => ({
  sfPlaySquareStackFill: {},
  sfShuffleCircle: {},
}));

beforeAll(() => {
  class IntersectionObserverMock {
    observe() {}
    disconnect() {}
  }

  vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
});

describe("BhajansPageClient", () => {
  it("renders multiple browse entries for the same underlying kirtan id", () => {
    const initialData: BhajansResponse = {
      bhajans: [
        {
          id: "shared-kirtan",
          browse_id: "browse-official",
          audio_url: "a1",
          type: "BHJ",
          title: "Sri Gandharva-Samprartha...",
          lead_singer: "Singer",
          recorded_date: "2025-12-09",
          sanga: "Radhe Kunj",
          duration_seconds: 243,
        },
        {
          id: "shared-kirtan",
          browse_id: "browse-first-line",
          audio_url: "a1",
          type: "BHJ",
          title: "Vrndavane Viharator",
          lead_singer: "Singer",
          recorded_date: "2025-12-09",
          sanga: "Radhe Kunj",
          duration_seconds: 243,
        },
      ],
      has_more: false,
      has_before: false,
      next_cursor: null,
      prev_cursor: null,
      featured: null,
      alphabet_index: {},
    };

    render(<BhajansPageClient initialData={initialData} />);

    expect(screen.getAllByTestId("kirtan-row")).toHaveLength(2);
    expect(screen.getByText(/Sri Gandharva-Samprartha/)).toBeTruthy();
    expect(screen.getByText(/Vrndavane Viharator/)).toBeTruthy();
  });
});
