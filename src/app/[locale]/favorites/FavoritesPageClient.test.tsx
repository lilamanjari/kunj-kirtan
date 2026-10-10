// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { KirtanSummary } from "@/types/kirtan";
import FavoritesPageClient from "./FavoritesPageClient";

const { playCollection, favorites } = vi.hoisted(() => ({
  playCollection: vi.fn(),
  favorites: [
    { id: "old", type: "MM", title: "Old", recorded_date: "2020-01-01" },
    { id: "new", type: "MM", title: "New", recorded_date: "2026-01-01" },
    { id: "z", type: "BHJ", title: "Zebra" },
    { id: "a", type: "BHJ", title: "Arati" },
  ],
}));
vi.mock("@/lib/audio/AudioPlayerContext", () => ({ useAudioPlayer: () => ({
  favorites, favoritesLoaded: true, offlineLoaded: false, playCollection,
  isActive: () => false, isPlaying: () => false, isLoading: () => false,
  isQueued: () => false, isFavorited: () => true,
}) }));
vi.mock("@/lib/components/KirtanListItem", () => ({ default: ({ kirtan }: { kirtan: KirtanSummary }) => <li>{kirtan.title}</li> }));
vi.mock("@/lib/components/SubpageHeader", () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("switches categories locally and plays only the selected sorted list", () => {
  const { rerender } = render(<FavoritesPageClient />);
  expect(screen.getAllByRole("listitem").map(item => item.textContent)).toEqual(["New", "Old"]);
  fireEvent.click(screen.getByRole("button", { name: "Bhajan (2)" }));
  expect(screen.getAllByRole("listitem").map(item => item.textContent)).toEqual(["Arati", "Zebra"]);
  fireEvent.click(screen.getByRole("button", { name: "Play all" }));
  expect(playCollection.mock.calls[0][0].map((item: KirtanSummary) => item.id)).toEqual(["a", "z"]);
  expect(screen.queryByRole("button", { name: /Hari Katha/ })).toBeNull();

  // Removing the selected category falls back to the remaining content,
  // and removes the tab row when there is no longer a category choice.
  const removed = favorites.splice(2);
  try {
    rerender(<FavoritesPageClient />);
    expect(screen.queryByRole("button", { name: /Maha Mantra|Bhajan|Hari Katha/ })).toBeNull();
    expect(screen.getAllByRole("listitem").map(item => item.textContent)).toEqual(["New", "Old"]);
  } finally {
    favorites.push(...removed);
  }
});
