import { NextResponse } from "next/server";
import {
  getAdminLeadSingerDetail,
  slugifyLeadSingerName,
} from "@/lib/admin/data";
import {
  isAllowedAdminLeadSingerImageFile,
  MAX_ADMIN_LEAD_SINGER_IMAGE_UPLOAD_BYTES,
} from "@/lib/admin/leadSingerImageUpload";
import { revalidateCmsAndPublicContent } from "@/lib/admin/revalidate";
import { buildBucketImageUrl } from "@/lib/media";
import {
  buildLeadSingerImageStorageKey,
  deleteLeadSingerImageFromR2,
  uploadLeadSingerImageToR2,
} from "@/lib/server/r2LeadSingerImages";
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

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const leadSinger = await getAdminLeadSingerDetail(id);

    if (!leadSinger) {
      return NextResponse.json(
        { error: "Lead singer not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ leadSinger });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load lead singer",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  let uploadedImageKey: string | null = null;

  try {
    const { id } = await context.params;
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

    const [{ data: duplicateName, error: nameError }, { data: duplicateSlug, error: slugError }] =
      await Promise.all([
        supabaseAdmin
          .from("lead_singers")
          .select("id")
          .ilike("display_name", displayName)
          .neq("id", id)
          .maybeSingle(),
        supabaseAdmin
          .from("lead_singers")
          .select("id")
          .eq("slug", slug)
          .neq("id", id)
          .maybeSingle(),
      ]);

    if (nameError) {
      return NextResponse.json({ error: nameError.message }, { status: 500 });
    }
    if (slugError) {
      return NextResponse.json({ error: slugError.message }, { status: 500 });
    }
    if (duplicateName?.id) {
      return NextResponse.json(
        { error: "A lead singer with this display name already exists." },
        { status: 409 },
      );
    }
    if (duplicateSlug?.id) {
      return NextResponse.json(
        { error: "A lead singer with this slug already exists." },
        { status: 409 },
      );
    }

    const { data: currentImages, error: currentImagesError } = await supabaseAdmin
      .from("lead_singer_images")
      .select("id, image_key")
      .eq("lead_singer_id", id)
      .order("created_at", { ascending: false });

    if (currentImagesError) {
      return NextResponse.json(
        { error: currentImagesError.message },
        { status: 500 },
      );
    }

    let nextImageKey: string | null = null;

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

      nextImageKey = buildLeadSingerImageStorageKey({
        displayName,
        fileName: image.name,
      });

      await uploadLeadSingerImageToR2({
        storageKey: nextImageKey,
        body: new Uint8Array(await image.arrayBuffer()),
        fileName: image.name,
        contentType: image.type,
      });
      uploadedImageKey = nextImageKey;
    }

    const { error: updateLeadSingerError } = await supabaseAdmin
      .from("lead_singers")
      .update({
        canonical_name: canonicalName || displayName,
        display_name: displayName,
        slug,
        description: description || null,
        is_identified: isIdentified,
        priority,
        home_sanga: homeSangaId || null,
        image_url: nextImageKey
          ? buildBucketImageUrl(nextImageKey)
          : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateLeadSingerError) {
      throw new Error(updateLeadSingerError.message);
    }

    if (nextImageKey) {
      const { error: insertImageError } = await supabaseAdmin
        .from("lead_singer_images")
        .insert({
          lead_singer_id: id,
          image_key: nextImageKey,
          alt_text: displayName,
          focus_x: focusX,
          focus_y: focusY,
        });

      if (insertImageError) {
        throw new Error(insertImageError.message);
      }

      const currentImageIds = (currentImages ?? [])
        .map((row) => row.id)
        .filter((value): value is string => Boolean(value));

      if (currentImageIds.length > 0) {
        const { error: deleteRowsError } = await supabaseAdmin
          .from("lead_singer_images")
          .delete()
          .in("id", currentImageIds);

        if (deleteRowsError) {
          throw new Error(deleteRowsError.message);
        }
      }

      for (const row of currentImages ?? []) {
        if (!row.image_key || row.image_key === nextImageKey) continue;
        await deleteLeadSingerImageFromR2(row.image_key);
      }
    } else if ((currentImages?.length ?? 0) > 0) {
      const { error: updateImageError } = await supabaseAdmin
        .from("lead_singer_images")
        .update({
          alt_text: displayName,
          focus_x: focusX,
          focus_y: focusY,
        })
        .eq("lead_singer_id", id);

      if (updateImageError) {
        throw new Error(updateImageError.message);
      }
    }

    revalidateCmsAndPublicContent();
    return NextResponse.json({
      ok: true,
      leadSinger: await getAdminLeadSingerDetail(id),
    });
  } catch (error) {
    if (uploadedImageKey) {
      try {
        await deleteLeadSingerImageFromR2(uploadedImageKey);
      } catch {}
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update lead singer",
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
    const leadSinger = await getAdminLeadSingerDetail(id);

    if (!leadSinger) {
      return NextResponse.json(
        { error: "Lead singer not found" },
        { status: 404 },
      );
    }

    if (leadSinger.kirtan_count > 0) {
      return NextResponse.json(
        {
          error:
            "This lead singer is still linked to kirtans. Reassign those kirtans before deleting.",
        },
        { status: 409 },
      );
    }

    const { data: images, error: imagesError } = await supabaseAdmin
      .from("lead_singer_images")
      .select("image_key")
      .eq("lead_singer_id", id);

    if (imagesError) {
      return NextResponse.json({ error: imagesError.message }, { status: 500 });
    }

    for (const row of images ?? []) {
      if (!row.image_key) continue;
      await deleteLeadSingerImageFromR2(row.image_key);
    }

    const { error: deleteFeaturedError } = await supabaseAdmin
      .from("featured_items")
      .delete()
      .eq("entity_table", "lead_singers")
      .eq("entity_id", id);

    if (deleteFeaturedError) {
      return NextResponse.json(
        { error: deleteFeaturedError.message },
        { status: 500 },
      );
    }

    const { error: deleteLeadSingerError } = await supabaseAdmin
      .from("lead_singers")
      .delete()
      .eq("id", id);

    if (deleteLeadSingerError) {
      return NextResponse.json(
        { error: deleteLeadSingerError.message },
        { status: 500 },
      );
    }

    revalidateCmsAndPublicContent();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete lead singer",
      },
      { status: 500 },
    );
  }
}
