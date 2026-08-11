import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type BatchPlayPayload = {
  plays?: Array<{
    id?: string;
    kirtan_id?: string;
    seconds_played?: number;
    session_id?: string | null;
    client_id?: string | null;
    played_at?: string;
  }>;
};

function inferCountry(headers: Headers) {
  return (
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country") ||
    null
  );
}

export async function POST(req: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing analytics env" },
      { status: 500 },
    );
  }

  let payload: BatchPlayPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const plays = Array.isArray(payload.plays) ? payload.plays : [];
  if (plays.length === 0 || plays.length > 100) {
    return NextResponse.json({ error: "Invalid plays payload" }, { status: 400 });
  }

  const normalized = plays.map((play) => ({
    kirtan_id: play.kirtan_id?.trim() ?? "",
    seconds_played: Math.round(play.seconds_played ?? 0),
    session_id: play.session_id?.trim() || null,
    client_id: play.client_id?.trim() || null,
  }));

  if (
    normalized.some(
      (play) =>
        !play.kirtan_id ||
        play.seconds_played < 15 ||
        play.seconds_played > 60 * 60 * 24 ||
        (play.session_id !== null && play.session_id.length > 200) ||
        (play.client_id !== null && play.client_id.length > 200),
    )
  ) {
    return NextResponse.json({ error: "Invalid play payload" }, { status: 400 });
  }

  const uniqueIds = Array.from(new Set(normalized.map((play) => play.kirtan_id)));
  const { data: kirtans, error: kirtanError } = await supabaseAdmin
    .from("kirtans")
    .select("id")
    .in("id", uniqueIds);

  if (kirtanError) {
    return NextResponse.json({ error: kirtanError.message }, { status: 500 });
  }

  const foundIds = new Set((kirtans ?? []).map((item) => item.id));
  if (uniqueIds.some((id) => !foundIds.has(id))) {
    return NextResponse.json({ error: "Kirtan not found" }, { status: 404 });
  }

  const country = inferCountry(req.headers);
  const userAgent = req.headers.get("user-agent");

  const { error } = await supabaseAdmin.from("kirtan_plays").insert(
    normalized.map((play) => ({
      kirtan_id: play.kirtan_id,
      seconds_played: play.seconds_played,
      qualified: true,
      session_id: play.session_id,
      client_id: play.client_id,
      user_agent: userAgent,
      country,
    })),
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: normalized.length });
}
