import { NextResponse } from "next/server";
import { getAdminSangaDetail } from "@/lib/admin/data";
import { revalidateCmsAndPublicContent } from "@/lib/admin/revalidate";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const sanga = await getAdminSangaDetail(id);

    if (!sanga) {
      return NextResponse.json({ error: "Sanga not found" }, { status: 404 });
    }

    return NextResponse.json({ sanga });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load sanga",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as { name?: string };
    const name = body.name?.trim() ?? "";

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("sangas")
      .select("id")
      .ilike("name", name)
      .neq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing?.id) {
      return NextResponse.json(
        { error: "A sanga with this name already exists" },
        { status: 409 },
      );
    }

    const { error } = await supabaseAdmin
      .from("sangas")
      .update({ name })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidateCmsAndPublicContent();

    return NextResponse.json({
      ok: true,
      sanga: await getAdminSangaDetail(id),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update sanga",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const [{ error: kirtansError }, { error: leadSingersError }] =
      await Promise.all([
        supabaseAdmin
          .from("kirtans")
          .update({ sanga_id: null })
          .eq("sanga_id", id),
        supabaseAdmin
          .from("lead_singers")
          .update({ home_sanga: null })
          .eq("home_sanga", id),
      ]);

    if (kirtansError) {
      return NextResponse.json({ error: kirtansError.message }, { status: 500 });
    }
    if (leadSingersError) {
      return NextResponse.json(
        { error: leadSingersError.message },
        { status: 500 },
      );
    }

    const { error } = await supabaseAdmin
      .from("sangas")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidateCmsAndPublicContent();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete sanga",
      },
      { status: 500 },
    );
  }
}
