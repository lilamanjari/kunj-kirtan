import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker(fetch: ReturnType<typeof vi.fn>, entries: Record<string, Response>) {
  const match = vi.fn(async (key: string | Request) => entries[typeof key === "string" ? key : key.url]);
  const put = vi.fn();
  const listeners: Record<string, (event: unknown) => void> = {};
  const context = vm.createContext({
    self: { location: new URL("https://app.test"), addEventListener: (name: string, handler: (event: unknown) => void) => { listeners[name] = handler; } },
    caches: { open: async () => ({ match, put }) },
    fetch, URL, Response, AbortController, setTimeout, clearTimeout,
  });
  vm.runInContext(readFileSync("public/sw.js", "utf8"), context);
  return { navigate: (url: string) => context.networkFirst(new Request(url)) as Promise<Response>, put, listeners, context };
}

describe("service worker cache boundaries", () => {
  it.each([
    ["https://app.test/admin/kirtans", "", "navigate"],
    ["https://app.test/api/admin/kirtans/123/waveform", "", "cors"],
    ["https://app.test/_next/static/chunks/admin.js", "https://app.test/admin/kirtans", "cors"],
    ["https://app.test/_next/webpack-hmr", "", "cors"],
  ])("leaves %s on the network", (url, referrer, mode) => {
    const { listeners } = worker(vi.fn(), {});
    const respondWith = vi.fn();
    listeners.fetch({ request: { method: "GET", headers: new Headers(), url, referrer, mode }, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });

  it("never intercepts requests on localhost, including reused development chunks", () => {
    const { listeners, context } = worker(vi.fn(), {});
    context.self.location = new URL("http://localhost:3000");
    const respondWith = vi.fn();
    listeners.fetch({ request: { method: "GET", headers: new Headers(), url: "http://localhost:3000/_next/static/chunks/app.js", destination: "script" }, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });
});

describe("offline document recovery", () => {
  it("redirects an uncached deep link to cached favorites in the same locale", async () => {
    const { navigate } = worker(vi.fn().mockRejectedValue(new Error("offline")), {
      "https://app.test/ru/favorites": new Response("favorites"),
    });
    const response = await navigate("https://app.test/ru/explore/leads/someone");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://app.test/ru/favorites");
  });
  it("serves favorites with query parameters without a redirect loop", async () => {
    const { navigate } = worker(vi.fn().mockRejectedValue(new Error("offline")), {
      "https://app.test/en/favorites": new Response("favorites"),
    });
    expect(await (await navigate("https://app.test/en/favorites?source=home")).text()).toBe("favorites");
  });
  it("recovers from server errors as well as network failures", async () => {
    const { navigate } = worker(vi.fn().mockResolvedValue(new Response("error", { status: 503 })), {
      "https://app.test/en/favorites": new Response("favorites"),
    });
    expect((await navigate("https://app.test/en")).status).toBe(302);
  });
  it("recovers when a navigation request stalls", async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi.fn((_request, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")));
      }));
      const { navigate } = worker(fetch, {
        "https://app.test/en/favorites": new Response("favorites"),
      });
      const pending = navigate("https://app.test/en");
      await vi.advanceTimersByTimeAsync(4000);
      expect((await pending).status).toBe(302);
    } finally {
      vi.useRealTimers();
    }
  });
  it("keeps successful online navigation and caches it", async () => {
    const { navigate, put } = worker(vi.fn().mockResolvedValue(new Response("home")), {});
    expect(await (await navigate("https://app.test/en")).text()).toBe("home");
    expect(put).toHaveBeenCalledOnce();
  });
  it("falls back to the requested document when favorites were never cached", async () => {
    const { navigate } = worker(vi.fn().mockRejectedValue(new Error("offline")), {
      "https://app.test/en": new Response("home"),
    });
    expect(await (await navigate("https://app.test/en")).text()).toBe("home");
  });
});
