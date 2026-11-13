import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { HOME_PRIMARY_KIRTAN_SLOT } from "@/lib/server/homeFeaturedItem";
import { revalidateFeatureHomepage } from "@/lib/server/featureHomepage";

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { data, error } = await supabaseAdmin.from("featured_items")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id).eq("slot", HOME_PRIMARY_KIRTAN_SLOT).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Featured kirtan not found" }, { status: 404 });
  revalidateFeatureHomepage();
  return NextResponse.json({ ok: true });
}
