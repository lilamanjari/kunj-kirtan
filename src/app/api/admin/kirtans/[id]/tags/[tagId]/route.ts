import { NextResponse } from "next/server";
import { getAdminKirtanDetail } from "@/lib/admin/data";
import { revalidateCmsAndPublicContent } from "@/lib/admin/revalidate";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string; tagId: string }> },
) {
  try {
    const { id, tagId } = await context.params;

    const { error } = await supabaseAdmin
      .from("kirtan_tags")
      .delete()
      .eq("kirtan_id", id)
      .eq("tag_id", tagId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidateCmsAndPublicContent();

    return NextResponse.json({
      ok: true,
      kirtan: await getAdminKirtanDetail(id),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to remove tag",
      },
      { status: 500 },
    );
  }
}
