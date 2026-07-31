import { NextResponse } from "next/server";
import { getAdminKirtanDetail } from "@/lib/admin/data";
import { revalidateCmsAndPublicContent } from "@/lib/admin/revalidate";
import { deleteAudioFromR2, getStorageKeyFromAudioUrl } from "@/lib/server/r2KirtanAudio";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { KirtanType } from "@/types/kirtan";

function isEditableType(value: unknown): value is KirtanType {
  return value === "MM" || value === "BHJ" || value === "HK";
}

async function getNextSequenceNum(leadSingerId: string | null) {
  if (!leadSingerId) {
    return 1;
  }

  const { data, error } = await supabaseAdmin
    .from("kirtans")
    .select("sequence_num")
    .eq("lead_singer_id", leadSingerId)
    .eq("type", "MM")
    .order("sequence_num", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const max = data?.[0]?.sequence_num ?? 0;
  return Number(max) + 1;
}

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
      type?: KirtanType;
    };

    if (typeof body.published === "boolean") {
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
    }

    if (!isEditableType(body.type)) {
      return NextResponse.json(
        { error: "Only published or type updates are supported here" },
        { status: 400 },
      );
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("kirtans")
      .select("id, type, title, lead_singer_id, sequence_num")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Kirtan not found" }, { status: 404 });
    }

    const nextType = body.type;
    const updatePayload: {
      type: KirtanType;
      title?: string;
      sequence_num?: number | null;
      updated_at: string;
    } = {
      type: nextType,
      updated_at: new Date().toISOString(),
    };

    if (nextType === "MM") {
      updatePayload.title = "Maha Mantra";
      updatePayload.sequence_num =
        existing.sequence_num ??
        (await getNextSequenceNum(existing.lead_singer_id ?? null));
    } else {
      updatePayload.sequence_num = null;
    }

    const { error: updateError } = await supabaseAdmin
      .from("kirtans")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (nextType !== "BHJ") {
      const { error: deleteTitlesError } = await supabaseAdmin
        .from("kirtan_titles")
        .delete()
        .eq("kirtan_id", id)
        .in("kind", ["first_line", "official"]);

      if (deleteTitlesError) {
        return NextResponse.json(
          { error: deleteTitlesError.message },
          { status: 500 },
        );
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
        error: error instanceof Error ? error.message : "Failed to update kirtan",
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

    const { data: audioFiles, error: audioFilesError } = await supabaseAdmin
      .from("audio_files")
      .select("id, file_url")
      .eq("kirtan_id", id);

    if (audioFilesError) {
      return NextResponse.json({ error: audioFilesError.message }, { status: 500 });
    }

    for (const audioFile of audioFiles ?? []) {
      if (!audioFile.file_url) {
        continue;
      }

      try {
        await deleteAudioFromR2(getStorageKeyFromAudioUrl(audioFile.file_url));
      } catch (deleteStorageError) {
        return NextResponse.json(
          {
            error:
              deleteStorageError instanceof Error
                ? deleteStorageError.message
                : "Failed to delete audio from Cloudflare",
          },
          { status: 500 },
        );
      }
    }

    const { error: deleteTagsError } = await supabaseAdmin
      .from("kirtan_tags")
      .delete()
      .eq("kirtan_id", id);

    if (deleteTagsError) {
      return NextResponse.json({ error: deleteTagsError.message }, { status: 500 });
    }

    const { error: deleteTitlesError } = await supabaseAdmin
      .from("kirtan_titles")
      .delete()
      .eq("kirtan_id", id);

    if (deleteTitlesError) {
      return NextResponse.json({ error: deleteTitlesError.message }, { status: 500 });
    }

    const { error: deleteAudioRowsError } = await supabaseAdmin
      .from("audio_files")
      .delete()
      .eq("kirtan_id", id);

    if (deleteAudioRowsError) {
      return NextResponse.json(
        { error: deleteAudioRowsError.message },
        { status: 500 },
      );
    }

    const { error: deleteKirtanError } = await supabaseAdmin
      .from("kirtans")
      .delete()
      .eq("id", id);

    if (deleteKirtanError) {
      return NextResponse.json({ error: deleteKirtanError.message }, { status: 500 });
    }

    revalidateCmsAndPublicContent();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete kirtan",
      },
      { status: 500 },
    );
  }
}
