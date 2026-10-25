import { NextResponse } from "next/server";
import { getAdminKirtanDetail } from "@/lib/admin/data";
import { getAdminWaveform } from "@/lib/server/adminWaveform";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const kirtan = await getAdminKirtanDetail(id);
    if (!kirtan?.audio_url) {
      return NextResponse.json({ error: "No current audio file found" }, { status: 404 });
    }
    return NextResponse.json({ peaks: await getAdminWaveform(kirtan.audio_url) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Admin waveform generation failed", error);
    return NextResponse.json({ error: "Waveform preview could not be generated" }, { status: 503 });
  }
}
