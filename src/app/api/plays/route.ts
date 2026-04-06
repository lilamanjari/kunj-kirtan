import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyPlayToken } from "@/lib/server/playTokens";

type PlayPayload = {
  kirtan_id?: string;
  seconds_played?: number;
  session_id?: string;
  client_id?: string;
  token?: string;
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
  const playbackTokenSecret = process.env.PLAYBACK_TOKEN_SECRET;
  if (!serviceRoleKey || !playbackTokenSecret) {
    return NextResponse.json(
      { error: "Missing analytics env" },
      { status: 500 },
    );
  }

  let payload: PlayPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kirtanId = payload.kirtan_id?.trim();
  const sessionId = payload.session_id?.trim() || null;
  const clientId = payload.client_id?.trim() || null;
  const token = payload.token?.trim() || null;
  const secondsPlayed = Math.round(payload.seconds_played ?? 0);

  if (!kirtanId) {
    return NextResponse.json({ error: "Missing kirtan_id" }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  if (secondsPlayed < 15 || secondsPlayed > 60 * 60 * 24) {
    return NextResponse.json(
      { error: "Invalid seconds_played" },
      { status: 400 },
    );
  }
  if (sessionId !== null && sessionId.length > 200) {
    return NextResponse.json({ error: "Invalid session_id" }, { status: 400 });
  }
  if (clientId !== null && clientId.length > 200) {
    return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
  }

  const tokenResult = verifyPlayToken(token, kirtanId);
  if (!tokenResult.ok) {
    return NextResponse.json({ error: tokenResult.error }, { status: 401 });
  }

  const { data: kirtan, error: kirtanError } = await supabaseAdmin
    .from("kirtans")
    .select("id")
    .eq("id", kirtanId)
    .maybeSingle();

  if (kirtanError) {
    return NextResponse.json({ error: kirtanError.message }, { status: 500 });
  }
  if (!kirtan) {
    return NextResponse.json({ error: "Kirtan not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("kirtan_plays").insert({
    kirtan_id: kirtanId,
    seconds_played: secondsPlayed,
    qualified: true,
    session_id: sessionId,
    client_id: clientId,
    user_agent: req.headers.get("user-agent"),
    country: inferCountry(req.headers),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
