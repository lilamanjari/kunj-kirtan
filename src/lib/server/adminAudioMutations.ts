import { getAdminKirtanDetail } from "@/lib/admin/data";
import { revalidateCmsAndPublicContent } from "@/lib/admin/revalidate";
import { deleteAudioFromR2, getStorageKeyFromAudioUrl } from "@/lib/server/r2KirtanAudio";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function publishCanonicalAudio(params: {
  kirtanId: string;
  audioFileId: string;
  currentAudioUrl: string;
  nextAudioUrl: string;
  fileName: string;
  durationSeconds: number;
  driveFileId: string;
}) {
  const { error: updateAudioError } = await supabaseAdmin
    .from("audio_files")
    .update({
      file_name: params.fileName,
      file_url: params.nextAudioUrl,
      duration_seconds: params.durationSeconds,
      drive_file_id: params.driveFileId,
    })
    .eq("id", params.audioFileId);

  if (updateAudioError) {
    throw new Error(updateAudioError.message);
  }

  const { error: kirtanUpdateError } = await supabaseAdmin
    .from("kirtans")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.kirtanId);

  if (kirtanUpdateError) {
    throw new Error(kirtanUpdateError.message);
  }

  let cleanupWarning: string | null = null;
  const currentStorageKey = getStorageKeyFromAudioUrl(params.currentAudioUrl);
  const nextStorageKey = getStorageKeyFromAudioUrl(params.nextAudioUrl);

  if (currentStorageKey !== nextStorageKey) {
    try {
      await deleteAudioFromR2(currentStorageKey);
    } catch {
      cleanupWarning =
        "The new audio is live, but the previous Cloudflare object could not be deleted automatically.";
    }
  }

  revalidateCmsAndPublicContent();

  return {
    kirtan: await getAdminKirtanDetail(params.kirtanId),
    cleanupWarning,
  };
}
