import { revalidatePath, revalidateTag } from "next/cache";
import { type CacheTarget, tagsForTarget } from "@/lib/admin/cacheTargets";
import { supportedLocales } from "@/lib/i18n/config";
import { buildKirtanDetailRoute } from "@/lib/kirtanDetailHref";
import { SITE_URL } from "@/lib/seo";

const explorePaths = ["/explore/bhajans", "/explore/maha-mantras", "/explore/leads", "/explore/occasions"];

function basePaths(target: CacheTarget) {
  if (target === "all" || target === "rare-gems") return ["", ...explorePaths];
  if (target === "home") return [""];
  if (target === "explore") return explorePaths;
  if (target === "kirtan-page") return [];
  if (target.startsWith("explore-leads")) return ["/explore/leads"];
  if (target === "explore-occasion-slugs") return [];
  if (target.startsWith("explore-occasion")) return ["/explore/occasions"];
  return [target === "explore-bhajans" ? "/explore/bhajans" : "/explore/maha-mantras"];
}

export function revalidateCacheTarget(target: CacheTarget) {
  // Warming must see a cache miss, rather than a stale-while-revalidate response.
  for (const tag of tagsForTarget(target)) revalidateTag(tag, { expire: 0 });
  for (const path of basePaths(target)) {
    revalidatePath(path || "/", "page");
    revalidatePath(path ? `/api${path}` : "/api/home", "page");
    for (const locale of supportedLocales) revalidatePath(`/${locale}${path}`, "page");
  }
  if (["all", "explore", "rare-gems", "kirtan-page"].includes(target)) revalidatePath("/[locale]/kirtans/[slug]", "page");
  if (["all", "explore", "rare-gems", "explore-leads-slugs"].includes(target)) revalidatePath("/[locale]/explore/leads/[slug]", "page");
  if (["all", "explore", "rare-gems", "explore-occasion-slugs"].includes(target)) revalidatePath("/[locale]/explore/occasions/[slug]", "page");
  revalidatePath("/sitemap.xml", "page");
}

export async function cacheWarmPaths(target: CacheTarget) {
  const routes = [...basePaths(target)];
  const needsEntities = ["all", "explore", "rare-gems", "explore-leads-slugs", "explore-occasion-slugs", "kirtan-page"].includes(target);
  const db = needsEntities ? (await import("@/lib/supabase-admin")).supabaseAdmin : null;
  if (["all", "explore", "rare-gems", "explore-leads-slugs"].includes(target)) {
    const { data, error } = await db!.from("lead_singers").select("slug").not("slug", "is", null).order("slug").limit(500);
    if (error) throw new Error(error.message);
    for (const singer of data ?? []) if (singer.slug) routes.push(`/explore/leads/${encodeURIComponent(singer.slug)}`);
    routes.push("/explore/leads/other");
  }
  if (["all", "explore", "rare-gems", "explore-occasion-slugs"].includes(target)) {
    let occasionTags = db!.from("tags").select("slug").eq("category", "occasion").eq("published", true);
    if (target === "explore-occasion-slugs") occasionTags = occasionTags.eq("browse_visible", true);
    const { data, error } = await occasionTags.not("slug", "is", null).order("slug").limit(500);
    if (error) throw new Error(error.message);
    for (const tag of data ?? []) if (tag.slug) routes.push(`/explore/occasions/${encodeURIComponent(tag.slug)}`);
  }
  if (["all", "rare-gems", "kirtan-page"].includes(target)) {
    // Warm recent recording detail pages; all other recording entries expire too
    // and rebuild when visited. Avoid a long job for the entire audio library.
    const { data, error } = await db!.from("playable_kirtans_with_titles").select("id, title, lead_singer").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(10);
    if (error) throw new Error(error.message);
    for (const kirtan of data ?? []) routes.push(buildKirtanDetailRoute(kirtan));
  }
  const paths = routes.flatMap((path) => supportedLocales.map((locale) => `/${locale}${path}`));
  if (routes.includes("")) paths.push("/api/home");
  return [...new Set(paths)];
}

function publicOrigin() {
  // The CMS can be hosted on a private/local address (for example 0.0.0.0).
  // Always warm the canonical public site unless an operator explicitly
  // configured a different public deployment.
  const configured = process.env.REVALIDATE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  return new URL(configured).origin;
}

export function refreshOrigins(_origin: string) {
  // Warming is useful on the public deployment, while the CMS request host can
  // be an internal bind address that is not a browsable site origin.
  return [publicOrigin()];
}

export async function revalidateRemoteTarget(origin: string, target: CacheTarget) {
  const remote = publicOrigin();
  if (remote === origin) return;
  if (!process.env.REVALIDATE_SECRET) throw new Error("The public site's revalidation secret is not configured.");
  const response = await fetch(`${remote}/api/revalidate/${target}`, {
    method: "POST", headers: { "x-revalidate-secret": process.env.REVALIDATE_SECRET }, signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Public site revalidation failed (${response.status})`);
}

export async function warmCacheBatch(origins: string[], paths: string[]) {
  const failures: string[] = [];
  await Promise.all(origins.flatMap((origin) => paths.map(async (path) => {
    try {
      const response = await fetch(new URL(path, origin), { cache: "no-store", signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // Consume streamed HTML fully, so the next batch doesn't outrun rendering.
      await response.text();
    } catch (error) { failures.push(`${origin}${path}: ${error instanceof Error ? error.message : "Could not load page"}`); }
  })));
  if (failures.length) throw new Error(failures.join("; "));
}
