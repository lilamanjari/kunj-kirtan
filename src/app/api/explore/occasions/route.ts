import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";

export const revalidate = 86400;

export async function GET() {
  const timing = new ServerTiming();
  const { data, error } = await timing.measure("db", async () =>
    await supabase
      .from("tags")
      .select("id, name, slug")
      .eq("category", "occasion")
      .order("name", { ascending: true }),
  );

  if (error) {
    return jsonWithServerTiming(
      { error: error.message },
      timing,
      { status: 500 },
    );
  }

  return jsonWithServerTiming({ occasions: data ?? [] }, timing);
}
