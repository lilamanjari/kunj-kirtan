// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { KirtanSummary } from "@/types/kirtan";
import type { LeadResponse } from "@/types/leads";
import LeadPageClient from "./LeadPageClient";

const playCollectionMock = vi.fn();

vi.mock("@/lib/audio/AudioPlayerContext", () => ({
  useAudioPlayer: () => ({
    isActive: () => false,
    isPlaying: () => false,
    isLoading: () => false,
    toggle: vi.fn(),
    playCollection: playCollectionMock,
    enqueue: vi.fn(),
    dequeueById: vi.fn(),
    isQueued: () => false,
    select: vi.fn(),
  }),
}));

vi.mock("@/lib/components/KirtanListItem", () => ({
  default: ({ kirtan }: { kirtan: KirtanSummary }) => <li>{kirtan.title}</li>,
}));

vi.mock("@/lib/components/FeaturedKirtanCard", () => ({
  default: () => <div>Featured</div>,
}));

vi.mock("@/lib/components/SubpageHeader", () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/lib/net/fetchWithStatus", () => ({
  fetchWithStatus: vi.fn(),
}));

vi.mock("@/lib/components/KirtanDeepLinkHandler", () => ({
  default: ({
    kirtans,
    onPin,
  }: {
    kirtans: KirtanSummary[];
    onPin: (kirtan: KirtanSummary) => void;
  }) => (
    <button type="button" onClick={() => onPin(kirtans[1])}>
      Pin second
    </button>
  ),
}));

const firstKirtan: KirtanSummary = {
  id: "kirtan-1",
  audio_url: "https://example.com/1.mp3",
  type: "MM",
  title: "First",
  lead_singer: "Singer",
  recorded_date: "2026-01-01",
  sanga: "Kunj",
};

const secondKirtan: KirtanSummary = {
  id: "kirtan-2",
  audio_url: "https://example.com/2.mp3",
  type: "MM",
  title: "Second",
  lead_singer: "Singer",
  recorded_date: "2026-01-02",
  sanga: "Kunj",
};

const initialData: LeadResponse = {
  lead: {
    id: "lead-1",
    display_name: "Lead Singer",
  },
  counts: {
    MM: 2,
    BHJ: 0,
    HK: 0,
  },
  active_type: "MM",
  has_more: false,
  next_cursor: null,
  kirtans: [firstKirtan, secondKirtan],
  featured: null,
};

describe("LeadPageClient play controls", () => {
  beforeEach(() => {
    playCollectionMock.mockReset();
  });

  it("plays the underlying visible list order even when a kirtan is pinned visually", () => {
    render(<LeadPageClient slug="lead-singer" initialData={initialData} />);

    fireEvent.click(screen.getByText("Pin second"));
    fireEvent.click(screen.getByRole("button", { name: "Play all kirtans" }));

    expect(playCollectionMock).toHaveBeenCalledWith([firstKirtan, secondKirtan]);
  });
});
