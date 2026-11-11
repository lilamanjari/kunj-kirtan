import { NextResponse } from "next/server";
import { FeatureInputError, getFeatureOverview, saveFeature } from "@/lib/server/adminFeatures";
import { revalidateFeatureHomepage } from "@/lib/server/featureHomepage";

export async function GET() {
  try { return NextResponse.json(await getFeatureOverview(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load features" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new FeatureInputError("Invalid feature details.");
    const id = await saveFeature(body);
    revalidateFeatureHomepage();
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save feature" }, { status: error instanceof FeatureInputError ? error.status : 500 });
  }
}
