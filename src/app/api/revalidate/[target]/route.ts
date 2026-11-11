import { NextResponse } from "next/server";
import { isCacheTarget } from "@/lib/admin/cacheTargets";
import { revalidateCacheTarget } from "@/lib/server/cacheRefresh";

const SECRET_HEADER = "x-revalidate-secret";

function isAuthorized(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "REVALIDATE_SECRET is not configured" },
        { status: 500 },
      ),
    };
  }

  const provided = req.headers.get(SECRET_HEADER);
  if (provided !== secret) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true as const };
}

export async function POST(
  req: Request,
  context: { params: Promise<{ target: string }> },
) {
  const auth = isAuthorized(req);
  if (!auth.ok) {
    return auth.response;
  }

  const { target } = await context.params;
  if (!isCacheTarget(target)) {
    return NextResponse.json({ error: "Unknown revalidation target" }, { status: 400 });
  }
  revalidateCacheTarget(target);
  return NextResponse.json({
    revalidated: true,
    target,
    ...(["all", "home", "rare-gems", "explore"].includes(target) ? {} : { mode: "tag" }),
  });
}
