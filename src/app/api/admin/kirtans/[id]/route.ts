import { NextResponse } from "next/server";
import { getAdminKirtanDetail } from "@/lib/admin/data";
import { revalidateCmsAndPublicContent } from "@/lib/admin/revalidate";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const kirtan = await getAdminKirtanDetail(id);

    if (!kirtan) {
      return NextResponse.json({ error: "Kirtan not found" }, { status: 404 });
    }

    return NextResponse.json({ kirtan });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load kirtan",
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
    const body = (await req.json()) as {
      published?: boolean;
    };

    if (typeof body.published !== "boolean") {
      return NextResponse.json(
        { error: "Only published updates are supported here" },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("kirtans")
      .update({
        published: body.published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

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
        error: error instanceof Error ? error.message : "Failed to update kirtan",
      },
      { status: 500 },
    );
  }
}
