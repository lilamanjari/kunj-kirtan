import { NextResponse } from "next/server";
import {
  getAdminTagCategories,
  listAdminTags,
  slugifyTagName,
} from "@/lib/admin/data";
import { revalidateCmsAndPublicContent } from "@/lib/admin/revalidate";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");

    const [tags, categories] = await Promise.all([
      listAdminTags({ search, category }),
      getAdminTagCategories(),
    ]);

    return NextResponse.json({ tags, categories });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load tags",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      category?: string;
    };

    const name = body.name?.trim() ?? "";
    const category = body.category?.trim() ?? "";

    if (!name || !category) {
      return NextResponse.json(
        { error: "name and category are required" },
        { status: 400 },
      );
    }

    const slug = slugifyTagName(name);

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("tags")
      .select("id")
      .eq("name", name)
      .eq("category", category)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing?.id) {
      return NextResponse.json(
        { error: "A tag with this name already exists in that category" },
        { status: 409 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("tags")
      .insert({ name, category, slug })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidateCmsAndPublicContent();

    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create tag",
      },
      { status: 500 },
    );
  }
}
