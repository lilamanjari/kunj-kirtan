import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const { data, error } = await supabase
    .from("playable_kirtans_with_titles")
    .select("audio_url")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const audioUrl = data?.audio_url?.trim();
  if (!audioUrl) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(audioUrl);
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch audio source" },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Unable to fetch audio source" },
      { status: 502 },
    );
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  const contentLength = upstream.headers.get("content-length");
  const acceptRanges = upstream.headers.get("accept-ranges");

  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }
  if (acceptRanges) {
    headers.set("Accept-Ranges", acceptRanges);
  }
  headers.set("Cache-Control", "no-store");

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
