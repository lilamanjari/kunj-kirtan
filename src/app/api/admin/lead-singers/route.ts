import { NextResponse } from "next/server";
import {
  listAdminLeadSingers,
  slugifyLeadSingerName,
} from "@/lib/admin/data";
import {
  isAllowedAdminLeadSingerImageFile,
  MAX_ADMIN_LEAD_SINGER_IMAGE_UPLOAD_BYTES,
} from "@/lib/admin/leadSingerImageUpload";
import { revalidateCmsAndPublicContent } from "@/lib/admin/revalidate";
import { buildBucketImageUrl } from "@/lib/media";
import { buildLeadSingerImageStorageKey, uploadLeadSingerImageToR2 } from "@/lib/server/r2LeadSingerImages";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function parseBoolean(value: FormDataEntryValue | null, defaultValue = false) {
  if (value === null) return defaultValue;
  return String(value).trim().toLowerCase() === "true";
}

function parsePriority(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").trim() || "100");
  if (!Number.isFinite(parsed)) {
    throw new Error("Priority must be a number.");
  }
  return Math.max(0, Math.round(parsed));
}

function parseFocusCoordinate(
  value: FormDataEntryValue | null,
  fallback: number,
  fieldLabel: string,
) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldLabel} must be a number.`);
  }

  return Math.min(100, Math.max(0, parsed));
}

async function ensureUniqueLeadSinger({
  displayName,
  slug,
}: {
  displayName: string;
  slug: string;
}) {
  const [{ data: duplicateName, error: nameError }, { data: duplicateSlug, error: slugError }] =
    await Promise.all([
      supabaseAdmin
        .from("lead_singers")
        .select("id")
        .ilike("display_name", displayName)
        .maybeSingle(),
      supabaseAdmin
        .from("lead_singers")
        .select("id")
        .eq("slug", slug)
        .maybeSingle(),
    ]);

  if (nameError) throw new Error(nameError.message);
  if (slugError) throw new Error(slugError.message);
  if (duplicateName?.id) {
    return "A lead singer with this display name already exists.";
  }
  if (duplicateSlug?.id) {
    return "A lead singer with this slug already exists.";
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const identified = searchParams.get("identified");
    const leadSingers = await listAdminLeadSingers({
      search,
      identified:
        identified === "identified" || identified === "hidden" || identified === "all"
          ? identified
          : "all",
    });
    return NextResponse.json({ leadSingers });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load lead singers",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  let uploadedImageKey: string | null = null;

  try {
    const formData = await req.formData();
    const displayName = String(formData.get("displayName") ?? "").trim();
    const canonicalName = String(formData.get("canonicalName") ?? "").trim();
    const slugInput = String(formData.get("slug") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const homeSangaId = String(formData.get("homeSangaId") ?? "").trim();
    const isIdentified = parseBoolean(formData.get("isIdentified"), true);
    const priority = parsePriority(formData.get("priority"));
    const focusX = parseFocusCoordinate(
      formData.get("focusX"),
      50,
      "Portrait focus X",
    );
    const focusY = parseFocusCoordinate(
      formData.get("focusY"),
      35,
      "Portrait focus Y",
    );
    const image = formData.get("image");

    if (!displayName) {
      return NextResponse.json(
        { error: "Display name is required." },
        { status: 400 },
      );
    }

    const slug = slugifyLeadSingerName(slugInput || displayName);
    if (!slug) {
      return NextResponse.json({ error: "Slug is required." }, { status: 400 });
    }

    const uniquenessError = await ensureUniqueLeadSinger({
      displayName,
      slug,
    });
    if (uniquenessError) {
      return NextResponse.json({ error: uniquenessError }, { status: 409 });
    }

    let imageKey: string | null = null;
    let imageAlt: string | null = null;

    if (image instanceof File) {
      if (!isAllowedAdminLeadSingerImageFile(image)) {
        return NextResponse.json(
          { error: "Unsupported image format." },
          { status: 400 },
        );
      }

      if (
        image.size <= 0 ||
        image.size > MAX_ADMIN_LEAD_SINGER_IMAGE_UPLOAD_BYTES
      ) {
        return NextResponse.json(
          { error: "Image file size is invalid." },
          { status: 400 },
        );
      }

      imageKey = buildLeadSingerImageStorageKey({
        displayName,
        fileName: image.name,
      });
      imageAlt = displayName;
      await uploadLeadSingerImageToR2({
        storageKey: imageKey,
        body: new Uint8Array(await image.arrayBuffer()),
        fileName: image.name,
        contentType: image.type,
      });
      uploadedImageKey = imageKey;
    }

    const { data: insertedLeadSinger, error: insertLeadSingerError } =
      await supabaseAdmin
        .from("lead_singers")
        .insert({
          canonical_name: canonicalName || displayName,
          display_name: displayName,
          slug,
          description: description || null,
          is_identified: isIdentified,
          priority,
          home_sanga: homeSangaId || null,
          image_url: imageKey ? buildBucketImageUrl(imageKey) : null,
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

    if (insertLeadSingerError) {
      throw new Error(insertLeadSingerError.message);
    }

    if (insertedLeadSinger?.id && imageKey) {
      const { error: insertImageError } = await supabaseAdmin
        .from("lead_singer_images")
        .insert({
          lead_singer_id: insertedLeadSinger.id,
          image_key: imageKey,
          alt_text: imageAlt,
          focus_x: focusX,
          focus_y: focusY,
        });

      if (insertImageError) {
        throw new Error(insertImageError.message);
      }
    }

    revalidateCmsAndPublicContent();
    return NextResponse.json({ ok: true, id: insertedLeadSinger.id });
  } catch (error) {
    if (uploadedImageKey) {
      try {
        const { deleteLeadSingerImageFromR2 } = await import(
          "@/lib/server/r2LeadSingerImages"
        );
        await deleteLeadSingerImageFromR2(uploadedImageKey);
      } catch {}
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create lead singer",
      },
      { status: 500 },
    );
  }
}
