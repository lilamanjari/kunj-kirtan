import { NextResponse } from "next/server";
import { revalidateFeatureHomepage, warmFeatureHomepage } from "@/lib/server/featureHomepage";
import { SITE_URL } from "@/lib/seo";

export async function POST(request: Request) {
  try {
    const { stage } = await request.json();
    if (stage !== "revalidate" && stage !== "warm") return NextResponse.json({ error: "Invalid refresh step" }, { status: 400 });
    const origin = new URL(request.url).origin;
    const configuredOrigin = process.env.REVALIDATE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
    const publicOrigin = new URL(configuredOrigin).origin;
    const remote = publicOrigin !== origin ? publicOrigin : null;
    if (stage === "revalidate") {
      revalidateFeatureHomepage();
      if (remote) {
        if (!process.env.REVALIDATE_SECRET) throw new Error("Feature saved. The public site's revalidation secret is not configured.");
        const response = await fetch(`${remote}/api/revalidate/home`, {
          method: "POST", headers: { "x-revalidate-secret": process.env.REVALIDATE_SECRET }, signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error(`Public homepage revalidation failed (${response.status})`);
      }
    } else {
      await warmFeatureHomepage(publicOrigin);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Homepage refresh failed" }, { status: 503 });
  }
}
