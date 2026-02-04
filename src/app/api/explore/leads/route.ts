import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type LeadItem = {
  id: string;
  display_name: string;
  slug: string;
};

export async function GET() {
  const { data, error } = await supabase
    .from("lead_singers")
    .select("id, display_name, slug")
    .eq("is_identified", true)
    .order("display_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const grouped: Record<string, LeadItem[]> = {};

  for (const lead of data ?? []) {
    const letter = lead.display_name.charAt(0).toUpperCase();

    if (!grouped[letter]) {
      grouped[letter] = [];
    }

    grouped[letter].push({
      id: lead.id,
      display_name: lead.display_name,
      slug: lead.slug,
    });
  }

  const leads = Object.keys(grouped)
    .sort()
    .map((letter) => ({
      letter,
      items: grouped[letter],
    }));

  return NextResponse.json({ leads });
}
