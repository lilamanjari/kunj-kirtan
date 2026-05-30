import { NextResponse } from "next/server";
import { getAdminKirtanDetail } from "@/lib/admin/data";
import { revalidateCmsAndPublicContent } from "@/lib/admin/revalidate";
import { supabaseAdmin } from "@/lib/supabase-admin";

function isEditableKind(value: string): value is "first_line" | "official" {
  return value === "first_line" || value === "official";
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string; kind: string }> },
) {
  try {
    const { id, kind } = await context.params;
    if (!isEditableKind(kind)) {
      return NextResponse.json({ error: "Unsupported title kind" }, { status: 400 });
    }

    const body = (await req.json()) as { title?: string };
    const title = body.title?.trim() ?? "";

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("kirtan_titles")
      .select("kirtan_id")
      .eq("kirtan_id", id)
      .eq("kind", kind)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing) {
      const { error } = await supabaseAdmin
        .from("kirtan_titles")
        .update({ title })
        .eq("kirtan_id", id)
        .eq("kind", kind);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabaseAdmin
        .from("kirtan_titles")
        .insert({ kirtan_id: id, kind, title });

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
        error: error instanceof Error ? error.message : "Failed to save title",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string; kind: string }> },
) {
  try {
    const { id, kind } = await context.params;
    if (!isEditableKind(kind)) {
      return NextResponse.json({ error: "Unsupported title kind" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("kirtan_titles")
      .delete()
      .eq("kirtan_id", id)
      .eq("kind", kind);

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
        error: error instanceof Error ? error.message : "Failed to delete title",
      },
      { status: 500 },
    );
  }
}
