import { NextResponse } from "next/server";
import { isCacheTarget } from "@/lib/admin/cacheTargets";
import { cacheWarmPaths, refreshOrigins, revalidateCacheTarget, revalidateRemoteTarget, warmCacheBatch } from "@/lib/server/cacheRefresh";

export async function POST(request: Request) {
  try {
    const { target, stage, offset = 0 } = await request.json();
    if (!isCacheTarget(target) || (stage !== "revalidate" && stage !== "warm")) return NextResponse.json({ error: "Choose a valid cache target and refresh step." }, { status: 400 });
    const origin = new URL(request.url).origin;
    if (stage === "revalidate") {
      revalidateCacheTarget(target);
      await revalidateRemoteTarget(origin, target);
      return NextResponse.json({ ok: true });
    }
    if (!Number.isSafeInteger(offset) || offset < 0) return NextResponse.json({ error: "Invalid warming position" }, { status: 400 });
    const paths = await cacheWarmPaths(target);
    if (offset > paths.length) return NextResponse.json({ error: "Invalid warming position" }, { status: 400 });
    const batch = paths.slice(offset, offset + 3);
    await warmCacheBatch(refreshOrigins(origin), batch);
    const completed = Math.min(offset + batch.length, paths.length);
    return NextResponse.json({ ok: true, completed, total: paths.length, nextOffset: completed < paths.length ? completed : null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cache refresh failed" }, { status: 503 });
  }
}
