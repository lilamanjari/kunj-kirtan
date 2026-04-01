import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { LeadItem } from "@/types/explore";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";

export const revalidate = 86400;

export async function GET() {
  const timing = new ServerTiming();
  const { data, error } = await timing.measure("db", async () =>
    await supabase
      .from("lead_singers")
      .select("id, display_name, slug")
      .eq("is_identified", true)
      .order("display_name", { ascending: true }),
  );

  if (error) {
    return jsonWithServerTiming(
      { error: error.message },
      timing,
      { status: 500 },
    );
  }

  const leads: LeadItem[] =
    data?.map((lead) => ({
      id: lead.id,
      display_name: lead.display_name,
      slug: lead.slug,
    })) ?? [];

  return jsonWithServerTiming({ leads }, timing);
}
