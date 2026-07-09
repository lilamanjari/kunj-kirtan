import { NextResponse } from "next/server";
import { getAdminKirtanDetail } from "@/lib/admin/data";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const kirtan = await getAdminKirtanDetail(id);

    if (!kirtan) {
      return NextResponse.json({ error: "Kirtan not found" }, { status: 404 });
    }

    if (!kirtan.audio_url) {
      return NextResponse.json(
        { error: "No current audio file found for this kirtan" },
        { status: 404 },
      );
    }

    const upstreamResponse = await fetch(kirtan.audio_url, {
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch audio file (${upstreamResponse.status})` },
        { status: 502 },
      );
    }

    const arrayBuffer = await upstreamResponse.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          upstreamResponse.headers.get("content-type") ??
          "application/octet-stream",
        "Content-Length":
          upstreamResponse.headers.get("content-length") ??
          String(arrayBuffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to proxy audio file",
      },
      { status: 500 },
    );
  }
}
