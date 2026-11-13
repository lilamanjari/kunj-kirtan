import { NextResponse } from "next/server";
import { FeatureInputError } from "@/lib/server/adminFeatures";
import { saveFeaturedKirtan, getFeaturedKirtanOverview } from "@/lib/server/adminFeaturedKirtans";
import { revalidateFeatureHomepage } from "@/lib/server/featureHomepage";

export async function GET() {
  try {
    return NextResponse.json(await getFeaturedKirtanOverview(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load featured kirtans" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new FeatureInputError("Invalid feature details.");
    const id = await saveFeaturedKirtan(body);
    revalidateFeatureHomepage();
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not schedule featured kirtan" }, { status: error instanceof FeatureInputError ? error.status : 500 });
  }
}
