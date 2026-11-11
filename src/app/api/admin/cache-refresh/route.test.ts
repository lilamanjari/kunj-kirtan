import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ paths: vi.fn(), origins: vi.fn(), revalidate: vi.fn(), remote: vi.fn(), warm: vi.fn() }));
vi.mock("@/lib/server/cacheRefresh", () => ({ cacheWarmPaths: mocks.paths, refreshOrigins: mocks.origins, revalidateCacheTarget: mocks.revalidate, revalidateRemoteTarget: mocks.remote, warmCacheBatch: mocks.warm }));
import { POST } from "./route";
const request = (body: unknown) => new Request("https://cms.test/api/admin/cache-refresh", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks(); mocks.paths.mockResolvedValue(["/en/1", "/ru/1", "/en/2", "/ru/2"]);
  mocks.origins.mockReturnValue(["https://cms.test", "https://public.test"]);
});
describe("admin cache refresh", () => {
  it("revalidates local and remote targets before any warming", async () => {
    expect((await POST(request({ target: "all", stage: "revalidate" }))).status).toBe(200);
    expect(mocks.revalidate).toHaveBeenCalledWith("all");
    expect(mocks.remote).toHaveBeenCalledWith("https://cms.test", "all");
    expect(mocks.warm).not.toHaveBeenCalled();
  });
  it("warms bounded batches and supplies exact progress", async () => {
    const first = await POST(request({ target: "all", stage: "warm", offset: 0 }));
    expect(await first.json()).toMatchObject({ completed: 3, total: 4, nextOffset: 3 });
    expect(mocks.warm).toHaveBeenCalledWith(["https://cms.test", "https://public.test"], ["/en/1", "/ru/1", "/en/2"]);
    const last = await POST(request({ target: "all", stage: "warm", offset: 3 }));
    expect(await last.json()).toMatchObject({ completed: 4, total: 4, nextOffset: null });
  });
  it.each([{ target: "bad", stage: "warm" }, { target: "home", stage: "bad" }, { target: "home", stage: "warm", offset: -1 }, { target: "home", stage: "warm", offset: 99 }])("rejects invalid jobs: %o", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.warm).not.toHaveBeenCalled();
  });
  it("reports remote revalidation errors without starting warming", async () => {
    mocks.remote.mockRejectedValue(new Error("Public site unavailable"));
    expect((await POST(request({ target: "home", stage: "revalidate" }))).status).toBe(503);
    expect(mocks.warm).not.toHaveBeenCalled();
  });
});
