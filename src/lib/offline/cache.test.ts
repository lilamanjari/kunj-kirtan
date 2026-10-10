// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { warmOfflineShell } from "./cache";
afterEach(() => vi.unstubAllGlobals());
it("warms route chunks embedded in Flight data as well as regular script tags", async () => {
  const put = vi.fn();
  vi.stubGlobal("caches", { open: async () => ({ put }) });
  const fetch = vi.fn(async (url: string) => new Response(url === "/en/favorites"
    ? '<script src="/_next/static/chunks/runtime.js"></script><script>self.__next_f.push([1,"static/chunks/favorites.js"])</script>'
    : "asset"));
  vi.stubGlobal("fetch", fetch);
  await warmOfflineShell(["/en/favorites"]);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/_next/static/chunks/favorites.js"), { cache: "reload" });
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/_next/static/chunks/runtime.js"), { cache: "reload" });
  expect(put).toHaveBeenCalledTimes(3);
});
