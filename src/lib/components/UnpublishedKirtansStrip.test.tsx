// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  player: {
    unpublishedPreviewAvailable: true,
    unpublishedPreviewUnlocked: false,
    unpublishedPreviewLoading: false,
    unpublishedPreviewError: null,
    unpublishedKirtans: [],
    unlockUnpublishedPreview: vi.fn(),
    lockUnpublishedPreview: vi.fn(),
    isActive: vi.fn(),
    isPlaying: vi.fn(),
    isLoading: vi.fn(),
    toggle: vi.fn(),
    isFavorited: vi.fn(),
    isQueued: vi.fn(),
    toggleFavorite: vi.fn(),
    dequeueById: vi.fn(),
    enqueue: vi.fn(),
  },
}));

vi.mock("@/lib/audio/AudioPlayerContext", () => ({ useAudioPlayer: () => mocks.player }));
vi.mock("@/lib/components/HomeRailKirtanCard", () => ({ default: () => null }));
vi.mock("@/lib/components/HomeRailActionButtons", () => ({ default: () => null }));

import UnpublishedKirtansStrip from "./UnpublishedKirtansStrip";

describe("UnpublishedKirtansStrip", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    Object.assign(mocks.player, {
      unpublishedPreviewAvailable: true,
      unpublishedPreviewUnlocked: false,
      unpublishedPreviewLoading: false,
      unpublishedPreviewError: null,
      unpublishedKirtans: [],
    });
  });

  afterEach(() => cleanup());

  it("keeps unpublished content and the unlock prompt out of a regular home page", () => {
    render(<UnpublishedKirtansStrip />);

    expect(screen.queryByRole("heading", { name: "Unpublished kirtans" })).toBeNull();
    expect(screen.queryByLabelText("Preview passphrase")).toBeNull();
  });

  it("shows the passphrase prompt only when the preview fragment is requested", async () => {
    window.history.replaceState(null, "", "/#unpublished-preview");

    render(<UnpublishedKirtansStrip />);

    expect(await screen.findByLabelText("Preview passphrase")).toBeTruthy();
  });

  it("shows the private rail only when preview access is unlocked", () => {
    mocks.player.unpublishedPreviewUnlocked = true;

    render(<UnpublishedKirtansStrip />);

    expect(screen.getByRole("heading", { name: "Unpublished kirtans" })).toBeTruthy();
    expect(screen.getByText("No unpublished kirtans with audio are ready to preview.")).toBeTruthy();
  });
});
