// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AudioPlayerProvider, useAudioPlayer } from "./AudioPlayerContext";
import type { KirtanSummary } from "@/types/kirtan";

const {
  getOfflineAudioObjectUrlMock,
  enqueueOfflinePlayLogMock,
  flushOfflinePlayLogsMock,
  offlineFavoritesMockState,
} = vi.hoisted(() => ({
  getOfflineAudioObjectUrlMock: vi.fn(),
  enqueueOfflinePlayLogMock: vi.fn(),
  flushOfflinePlayLogsMock: vi.fn().mockResolvedValue({ flushed: 0 }),
  offlineFavoritesMockState: {
    downloadedIdsKey: "kirtan-1",
  },
}));

const setQueueMock = vi.fn();

vi.mock("./useQueue", () => ({
  useQueue: () => ({
    queue: [],
    enqueue: vi.fn(),
    setQueue: setQueueMock,
    dequeue: vi.fn(),
    dequeueById: vi.fn(),
    clearQueue: vi.fn(),
    isQueued: vi.fn(),
    notice: null,
    loaded: true,
  }),
}));

vi.mock("@/lib/offline/useOfflineFavorites", () => ({
  useOfflineFavorites: () => ({
    offlineLoaded: true,
    offlineSupported: true,
    offlineEnabled: true,
    offlineSelectedCount: 1,
    offlineDownloadedCount: 1,
    offlineDownloadingCount: 0,
    downloadedIdsKey: offlineFavoritesMockState.downloadedIdsKey,
    isOfflineSelected: () => true,
    isOfflineAvailable: () => true,
    isOfflineDownloading: () => false,
    getOfflineAudioObjectUrl: getOfflineAudioObjectUrlMock,
    toggleOfflineEnabled: vi.fn(),
    toggleOfflineForKirtan: vi.fn(),
  }),
}));

vi.mock("@/lib/offline/playLogQueue", () => ({
  enqueueOfflinePlayLog: enqueueOfflinePlayLogMock,
  flushOfflinePlayLogs: flushOfflinePlayLogsMock,
}));

const testKirtan: KirtanSummary = {
  id: "kirtan-1",
  audio_url: "https://example.com/test.mp3",
  type: "BHJ",
  title: "Test Bhajan",
  lead_singer: "Singer",
  recorded_date: "2020-01-01",
  sanga: "Test",
};

const secondKirtan: KirtanSummary = {
  id: "kirtan-2",
  audio_url: "https://example.com/test-2.mp3",
  type: "BHJ",
  title: "Second Bhajan",
  lead_singer: "Singer",
  recorded_date: "2020-01-02",
  sanga: "Test",
};

function TestHarness() {
  const player = useAudioPlayer();
  return (
    <div>
      <button type="button" onClick={() => player.play(testKirtan)}>
        Play
      </button>
      <button type="button" onClick={() => player.play(secondKirtan)}>
        Play second
      </button>
      <button type="button" onClick={() => player.select(testKirtan)}>
        Select
      </button>
      <button
        type="button"
        onClick={() =>
          player.playCollection([
            testKirtan,
            secondKirtan,
            testKirtan,
          ])
        }
      >
        Play collection
      </button>
      <div data-testid="current-id">{player.current?.id ?? "none"}</div>
    </div>
  );
}

describe("AudioPlayerContext resume behavior", () => {
  let audioElement: HTMLAudioElement;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    setQueueMock.mockReset();
    offlineFavoritesMockState.downloadedIdsKey = "kirtan-1";
    flushOfflinePlayLogsMock.mockReset();
    flushOfflinePlayLogsMock.mockResolvedValue({ flushed: 0 });
    getOfflineAudioObjectUrlMock.mockReset();
    getOfflineAudioObjectUrlMock.mockResolvedValue("blob:offline-kirtan-1");
    enqueueOfflinePlayLogMock.mockReset();
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    };
    vi.stubGlobal("localStorage", mockStorage);
    vi.stubGlobal("sessionStorage", mockStorage);

    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:offline-kirtan-1"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/plays/token")) {
          return new Response(JSON.stringify({ token: "play-token-1" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/plays/batch")) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (url.includes("/api/plays")) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    audioElement = document.createElement("audio");
    vi.stubGlobal(
      "Audio",
      vi.fn(() => audioElement) as unknown as typeof Audio,
    );

    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLMediaElement.prototype, "load", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(audioElement, "duration", {
      configurable: true,
      writable: true,
      value: 120,
    });
  });

  it("does not overwrite restored position with 0 on next render", async () => {
    const saved = {
      kirtan: testKirtan,
      time: 20,
      duration: 120,
    };
    localStorage.setItem("kirtan_last_playback_v1", JSON.stringify(saved));

    render(
      <AudioPlayerProvider locale="en">
        <TestHarness />
      </AudioPlayerProvider>,
    );

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("kirtan_last_playback_v1")!)).toMatchObject({
        time: 20,
      });
    });
  });

  it("replaces the queue and starts from the first deduped kirtan when playing a collection", () => {
    render(
      <AudioPlayerProvider locale="en">
        <TestHarness />
      </AudioPlayerProvider>,
    );

    fireEvent.click(screen.getByText("Play collection"));

    expect(screen.getByTestId("current-id").textContent).toBe("kirtan-1");
    expect(setQueueMock).toHaveBeenCalledWith([secondKirtan]);
  });

  it("flushes queued offline play logs when the browser comes back online", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });

    render(
      <AudioPlayerProvider locale="en">
        <TestHarness />
      </AudioPlayerProvider>,
    );

    expect(flushOfflinePlayLogsMock).not.toHaveBeenCalled();

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
    fireEvent(window, new Event("online"));

    await waitFor(() => {
      expect(flushOfflinePlayLogsMock).toHaveBeenCalledTimes(1);
    });
  });

  it("logs a downloaded favorite normally when played while online, even if the token resolves after playback starts", async () => {
    let resolveToken: ((value: Response) => void) | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/plays/token")) {
          return new Promise<Response>((resolve) => {
            resolveToken = resolve;
          });
        }
        if (url.includes("/api/plays")) {
          return Promise.resolve(
            new Response(JSON.stringify({ ok: true }), { status: 200 }),
          );
        }
        if (url.includes("/api/plays/batch")) {
          return Promise.resolve(
            new Response(JSON.stringify({ ok: true }), { status: 200 }),
          );
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      }),
    );

    render(
      <AudioPlayerProvider locale="en">
        <TestHarness />
      </AudioPlayerProvider>,
    );

    fireEvent.click(screen.getByText("Play"));

    await waitFor(() => {
      expect((global.fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        "/api/plays/token?kirtan_id=kirtan-1",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    Object.defineProperty(audioElement, "currentTime", {
      configurable: true,
      writable: true,
      value: 15,
    });
    fireEvent(audioElement, new Event("timeupdate"));

    expect(enqueueOfflinePlayLogMock).not.toHaveBeenCalled();
    expect((global.fetch as ReturnType<typeof vi.fn>)).not.toHaveBeenCalledWith(
      "/api/plays",
      expect.anything(),
    );

    resolveToken?.(
      new Response(JSON.stringify({ token: "play-token-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await waitFor(() => {
      expect((global.fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        "/api/plays",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"token":"play-token-1"'),
        }),
      );
    });
    expect(enqueueOfflinePlayLogMock).not.toHaveBeenCalled();
  });

  it("does not restart the current downloaded track when another offline download completes", async () => {
    getOfflineAudioObjectUrlMock.mockResolvedValue("blob:offline-kirtan-1");

    const { rerender } = render(
      <AudioPlayerProvider locale="en">
        <TestHarness />
      </AudioPlayerProvider>,
    );

    fireEvent.click(screen.getByText("Play"));

    await waitFor(() => {
      expect(audioElement.src).toBe("blob:offline-kirtan-1");
    });

    Object.defineProperty(audioElement, "currentTime", {
      configurable: true,
      writable: true,
      value: 42,
    });

    offlineFavoritesMockState.downloadedIdsKey = "kirtan-1|kirtan-2";
    rerender(
      <AudioPlayerProvider locale="en">
        <TestHarness />
      </AudioPlayerProvider>,
    );

    await waitFor(() => {
      expect(audioElement.currentTime).toBe(42);
    });
    expect(getOfflineAudioObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalledTimes(1);
  });

  it("switches audio sources when moving from one downloaded track to another", async () => {
    getOfflineAudioObjectUrlMock.mockImplementation(async (kirtanId: string) =>
      kirtanId === "kirtan-2" ? "blob:offline-kirtan-2" : "blob:offline-kirtan-1",
    );

    render(
      <AudioPlayerProvider locale="en">
        <TestHarness />
      </AudioPlayerProvider>,
    );

    fireEvent.click(screen.getByText("Play"));

    await waitFor(() => {
      expect(audioElement.src).toBe("blob:offline-kirtan-1");
    });

    fireEvent.click(screen.getByText("Play second"));

    await waitFor(() => {
      expect(audioElement.src).toBe("blob:offline-kirtan-2");
    });
  });
});
