import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const { data, error } = await supabase
    .from("lead_singers")
    .select("display_name")
    .ilike("display_name", `%${q}%`)
    .order("display_name", { ascending: true })
    .limit(8);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const suggestions = (data ?? []).map((row) => row.display_name);

  return NextResponse.json({ suggestions });
}
