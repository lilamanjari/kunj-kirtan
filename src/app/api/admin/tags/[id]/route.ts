import { NextResponse } from "next/server";
import { getAdminTagDetail } from "@/lib/admin/data";
import { revalidateCmsAndPublicContent } from "@/lib/admin/revalidate";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const tag = await getAdminTagDetail(id);

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    return NextResponse.json({ tag });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load tag",
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
      name?: string;
      category?: string;
      published?: boolean;
      browse_visible?: boolean;
    };

    const name = body.name?.trim() ?? "";
    const category = body.category?.trim() ?? "";
    const published = body.published ?? true;
    const browseVisible = published ? (body.browse_visible ?? false) : false;

    if (!name || !category) {
      return NextResponse.json(
        { error: "name and category are required" },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("tags")
      .update({
        name,
        category,
        published,
        browse_visible: browseVisible,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidateCmsAndPublicContent();

    return NextResponse.json({
      ok: true,
      tag: await getAdminTagDetail(id),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update tag",
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

    const { error: unlinkError } = await supabaseAdmin
      .from("kirtan_tags")
      .delete()
      .eq("tag_id", id);

    if (unlinkError) {
      return NextResponse.json({ error: unlinkError.message }, { status: 500 });
    }

    const { error } = await supabaseAdmin
      .from("tags")
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
        error: error instanceof Error ? error.message : "Failed to delete tag",
      },
      { status: 500 },
    );
  }
}
