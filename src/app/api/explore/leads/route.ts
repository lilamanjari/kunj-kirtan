import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { LeadItem } from "@/types/explore";

export async function GET() {
  const { data, error } = await supabase
    .from("lead_singers")
    .select("id, display_name, slug")
    .eq("is_identified", true)
    .order("display_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const leads: LeadItem[] =
    data?.map((lead) => ({
      id: lead.id,
      display_name: lead.display_name,
      slug: lead.slug,
    })) ?? [];

  return NextResponse.json({ leads });
}
