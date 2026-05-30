import { NextResponse } from "next/server";
import { getAdminKirtanDetail } from "@/lib/admin/data";
import { revalidateCmsAndPublicContent } from "@/lib/admin/revalidate";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as { tagId?: string };
    const tagId = body.tagId?.trim();

    if (!tagId) {
      return NextResponse.json({ error: "tagId is required" }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("kirtan_tags")
      .select("kirtan_id")
      .eq("kirtan_id", id)
      .eq("tag_id", tagId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (!existing) {
      const { error } = await supabaseAdmin
        .from("kirtan_tags")
        .insert({ kirtan_id: id, tag_id: tagId });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    revalidateCmsAndPublicContent();

    return NextResponse.json({
      ok: true,
      kirtan: await getAdminKirtanDetail(id),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add tag",
      },
      { status: 500 },
    );
  }
}
