import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ revalidate: vi.fn(), warm: vi.fn() }));
vi.mock("@/lib/server/featureHomepage", () => ({ revalidateFeatureHomepage: mocks.revalidate, warmFeatureHomepage: mocks.warm }));
import { POST } from "./route";

const request = (stage: string, origin = "https://cms.test") => new Request(`${origin}/api/admin/features/refresh`, { method: "POST", body: JSON.stringify({ stage }) });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("REVALIDATE_BASE_URL", ""); vi.stubEnv("NEXT_PUBLIC_SITE_URL", ""); vi.stubEnv("REVALIDATE_SECRET", "");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("feature homepage refresh", () => {
  it("invalidates before warming the canonical public site", async () => {
    const publicOrigin = "https://www.kunjkirtans.com";
    expect((await POST(request("revalidate", publicOrigin))).status).toBe(200);
    expect(mocks.revalidate).toHaveBeenCalledOnce();
    expect(mocks.warm).not.toHaveBeenCalled();
    expect((await POST(request("warm", publicOrigin))).status).toBe(200);
    expect(mocks.warm).toHaveBeenCalledWith("https://www.kunjkirtans.com");
  });
  it("revalidates and warms the configured public site", async () => {
    vi.stubEnv("REVALIDATE_BASE_URL", "https://public.test/"); vi.stubEnv("REVALIDATE_SECRET", "test-secret");
    const fetch = vi.fn(async () => new Response("{}")); vi.stubGlobal("fetch", fetch);
    expect((await POST(request("revalidate"))).status).toBe(200);
    expect(fetch).toHaveBeenCalledWith("https://public.test/api/revalidate/home", expect.objectContaining({ method: "POST", headers: { "x-revalidate-secret": "test-secret" } }));
    expect((await POST(request("warm"))).status).toBe(200);
    expect(mocks.warm.mock.calls).toEqual([["https://public.test"]]);
  });
  it("reports a failed warm without claiming success", async () => {
    mocks.warm.mockRejectedValue(new Error("Cache offline"));
    const response = await POST(request("warm"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Cache offline" });
  });
  it("does not silently skip a configured public site without a secret", async () => {
    vi.stubEnv("REVALIDATE_BASE_URL", "https://public.test");
    expect((await POST(request("revalidate"))).status).toBe(503);
  });
});
