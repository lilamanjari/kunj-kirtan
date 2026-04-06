import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createPlayToken } from "@/lib/server/playTokens";

export async function GET(req: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const playbackTokenSecret = process.env.PLAYBACK_TOKEN_SECRET;
  if (!serviceRoleKey || !playbackTokenSecret) {
    return NextResponse.json(
      { error: "Missing analytics env" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const kirtanId = searchParams.get("kirtan_id")?.trim();
  if (!kirtanId) {
    return NextResponse.json({ error: "Missing kirtan_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("kirtans")
    .select("id")
    .eq("id", kirtanId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Kirtan not found" }, { status: 404 });
  }

  return NextResponse.json({ token: createPlayToken(kirtanId) });
}
