// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CacheRefreshPanel from "./CacheRefreshPanel";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
describe("cache refresh controls", () => {
  it("refreshes all in order and displays completed warming counts", async () => {
    const calls: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body); calls.push(body);
      if (body.stage === "revalidate") return json({ ok: true });
      return body.offset === 0 ? json({ completed: 3, total: 4, nextOffset: 3 }) : json({ completed: 4, total: 4, nextOffset: null });
    }));
    const busy = vi.fn(); render(<CacheRefreshPanel onBusyChange={busy} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh all" }));
    expect(await screen.findByText(/Ready · 4 pages/)).toBeTruthy();
    expect(calls).toEqual([{ target: "all", stage: "revalidate", offset: 0 }, { target: "all", stage: "warm", offset: 0 }, { target: "all", stage: "warm", offset: 3 }]);
    expect(busy.mock.calls).toEqual([[true], [false]]);
  });
  it("allows an individual explore target and displays failures", async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => json({ error: "Could not reach public site" }, 503)); vi.stubGlobal("fetch", fetch);
    render(<CacheRefreshPanel onBusyChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Individual explore targets" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh Occasion pages" }));
    expect(await screen.findByText("Could not reach public site")).toBeTruthy();
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body)).target).toBe("explore-occasion-slugs");
    expect(screen.queryByText(/Ready/)).toBeNull();
  });
});
