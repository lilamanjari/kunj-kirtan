import { NextResponse } from "next/server";
import type { LeadItem } from "@/types/explore";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";
import { fetchLeadDirectory } from "@/lib/server/leadDirectory";

export const revalidate = 86400;

export async function GET() {
  const timing = new ServerTiming();
  const { leads, error } = await timing.measure("db", async () =>
    await fetchLeadDirectory(),
  );

  if (error) {
    return jsonWithServerTiming(
      { error },
      timing,
      { status: 500 },
    );
  }

  return jsonWithServerTiming({ leads: leads as LeadItem[] }, timing);
}
