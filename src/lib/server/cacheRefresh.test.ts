import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ tag: vi.fn(), path: vi.fn(), from: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.tag, revalidatePath: mocks.path }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from: mocks.from } }));
import { cacheWarmPaths, revalidateCacheTarget, warmCacheBatch } from "./cacheRefresh";
import { CACHE_TAGS, isCacheTarget } from "@/lib/admin/cacheTargets";

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.unstubAllGlobals());
function query(data: unknown[]) {
  const value = { data, error: null };
  return { select: vi.fn().mockReturnThis(), not: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), then: (resolve: (value: unknown) => unknown) => Promise.resolve(value).then(resolve) };
}
describe("public cache refresh targets", () => {
  it("only accepts explicitly listed targets", () => {
    expect(isCacheTarget("all")).toBe(true);
    expect(isCacheTarget("explore-leads-slugs")).toBe(true);
    expect(isCacheTarget("__proto__")).toBe(false);
    expect(isCacheTarget("https://untrusted.test")).toBe(false);
  });
  it("expires every tag immediately for all and invalidates localized pages", () => {
    revalidateCacheTarget("all");
    expect(mocks.tag.mock.calls).toEqual(CACHE_TAGS.map((tag) => [tag, { expire: 0 }]));
    expect(mocks.path).toHaveBeenCalledWith("/en", "page");
    expect(mocks.path).toHaveBeenCalledWith("/ru/explore/bhajans", "page");
    expect(mocks.path).toHaveBeenCalledWith("/[locale]/explore/leads/[slug]", "page");
  });
  it("keeps a specific target limited to its own tag", () => {
    revalidateCacheTarget("explore-bhajans");
    expect(mocks.tag.mock.calls).toEqual([["explore-bhajans", { expire: 0 }]]);
  });
  it("warms the homepage in both languages without querying the database", async () => {
    expect(await cacheWarmPaths("home")).toEqual(["/en", "/ru", "/api/home"]);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("builds complete directory plans and limits recording warming to recent uploads", async () => {
    const singers = query([{ slug: "singer-one" }]);
    const tags = query([{ slug: "kartika" }]);
    const kirtans = query([{ id: "12345678-1234-4234-8234-123456789abc", title: "Bhajan", lead_singer: "Singer" }]);
    mocks.from.mockReturnValueOnce(singers).mockReturnValueOnce(tags).mockReturnValueOnce(kirtans);
    const paths = await cacheWarmPaths("all");
    expect(paths).toContain("/en/explore/leads/singer-one");
    expect(paths).toContain("/ru/explore/occasions/kartika");
    expect(paths).toContain("/en/kirtans/12345678-1234-4234-8234-123456789abc-bhajan-singer");
    expect(kirtans.limit).toHaveBeenCalledWith(10);
    expect(new Set(paths).size).toBe(paths.length);
  });
  it("reports a failed page rather than claiming the batch is warm", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })));
    await expect(warmCacheBatch(["https://public.test"], ["/en"])).rejects.toThrow("HTTP 503");
  });
});
