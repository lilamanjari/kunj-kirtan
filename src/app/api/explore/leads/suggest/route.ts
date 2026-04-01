import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";

export async function GET(req: Request) {
  const timing = new ServerTiming();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return jsonWithServerTiming({ suggestions: [] }, timing);
  }

  const { data, error } = await timing.measure("db", async () =>
    await supabase
      .from("lead_singers")
      .select("display_name")
      .ilike("display_name", `%${q}%`)
      .order("display_name", { ascending: true })
      .limit(8),
  );

  if (error) {
    return jsonWithServerTiming(
      { error: error.message },
      timing,
      { status: 500 },
    );
  }

  const suggestions = (data ?? []).map((row) => row.display_name);

  return jsonWithServerTiming({ suggestions }, timing);
}
