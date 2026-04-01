#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const SHEET_ID = process.env.SHEET_ID || "1H5vY1IvVdNeDmT8DagD1GNT_8TFk2FZE1XXPlpJiqQ8";
const SHEET_NAME = process.env.SHEET_NAME || "Metadata";
const SERVICE_ACCOUNT_FILE =
  process.env.SHEETS_SERVICE_ACCOUNT_FILE ||
  path.join(__dirname, "..", "secrets", "sheets-service-account.json");

const MM_FOLDER =
  process.env.MM_FOLDER ||
  "/Users/lailafrotjold/Documents/Radhe Kunj Kirtan/Maha Mantra";
const BHJ_FOLDER =
  process.env.BHJ_FOLDER ||
  "/Users/lailafrotjold/Documents/Radhe Kunj Kirtan/Bhajans";

const MEDIA_BASE_URL =
  process.env.MEDIA_BASE_URL || "https://media.kunjkirtan.com";
const REVALIDATE_BASE_URL =
  process.env.REVALIDATE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || "";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY;

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET || "kirtan";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
}

if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error("Missing R2 credentials in env.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const DRY_RUN =
  process.env.DRY_RUN === "true" || process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

function logStep(message) {
  if (VERBOSE) {
    console.log(message);
  }
}

async function triggerRevalidateAll() {
  if (!REVALIDATE_BASE_URL || !REVALIDATE_SECRET) {
    console.log(
      "Skipping revalidation: REVALIDATE_BASE_URL or REVALIDATE_SECRET is not configured.",
    );
    return;
  }

  const baseUrl = REVALIDATE_BASE_URL.replace(/\/$/, "");
  const url = `${baseUrl}/api/revalidate/all`;
  logStep(`Revalidating caches via ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-revalidate-secret": REVALIDATE_SECRET,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Revalidation failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  console.log(`Revalidation complete: ${payload.target}`);
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function parseList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseRecordedDate(value) {
  if (!value) return { recorded_date: null, recorded_date_precision: null };
  const raw = String(value).trim();
  const dayMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})(?:_(\d{2})(\d{2}))?$/);
  if (dayMatch) {
    const [, dd, mm, yyyy, hh, min] = dayMatch;
    const hour = hh ?? "00";
    const minute = min ?? "00";
    return {
      recorded_date: `${yyyy}-${mm}-${dd}T${hour}:${minute}:00`,
      recorded_date_precision: "day",
    };
  }
  const monthMatch = raw.match(/^(\d{2})-(\d{4})$/);
  if (monthMatch) {
    const [, mm, yyyy] = monthMatch;
    return {
      recorded_date: `${yyyy}-${mm}-01`,
      recorded_date_precision: "month",
    };
  }
  const yearMatch = raw.match(/^(\d{4})$/);
  if (yearMatch) {
    const [yyyy] = yearMatch;
    return {
      recorded_date: `${yyyy}-01-01`,
      recorded_date_precision: "year",
    };
  }
  return { recorded_date: null, recorded_date_precision: null };
}

function getFileExtension(filename) {
  const match = String(filename || "").match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "mp3";
}

function contentTypeForExt(ext) {
  switch (ext) {
    case "m4a":
      return "audio/mp4";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    default:
      return "application/octet-stream";
  }
}

function columnToA1(index) {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function getSheetsClient() {
  let keyPath = SERVICE_ACCOUNT_FILE;
  if (fs.existsSync(keyPath) && fs.lstatSync(keyPath).isDirectory()) {
    keyPath = path.join(keyPath, "sheets-service-account.json");
  }
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Service account JSON not found at ${keyPath}`);
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function getOrCreateLeadSinger(name) {
  const canonical = name?.trim() || "unidentified";
  logStep(`Lead singer: ${canonical}`);
  const { data, error } = await supabase
    .from("lead_singers")
    .select("id")
    .eq("canonical_name", canonical)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.id) return data.id;

  const { data: inserted, error: insertError } = await supabase
    .from("lead_singers")
    .insert({
      canonical_name: canonical,
      display_name: canonical,
      slug: slugify(canonical),
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);
  return inserted.id;
}

async function resolveSangaId(name) {
  if (!name) return null;
  logStep(`Sanga: ${name}`);
  const { data, error } = await supabase
    .from("sangas")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.id) return data.id;

  const { data: inserted, error: insertError } = await supabase
    .from("sangas")
    .insert({ name })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);
  return inserted.id;
}

async function getNextSequenceNum(leadSingerId) {
  const { data, error } = await supabase
    .from("kirtans")
    .select("sequence_num")
    .eq("lead_singer_id", leadSingerId)
    .eq("type", "MM")
    .order("sequence_num", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const max = data?.[0]?.sequence_num ?? 0;
  return Number(max) + 1;
}

async function getOrCreateTag(name, category) {
  const cleanName = String(name).trim();
  if (!cleanName) return null;
  const slug = slugify(cleanName);
  const { data, error } = await supabase
    .from("tags")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.id) return data.id;

  const { data: inserted, error: insertError } = await supabase
    .from("tags")
    .insert({ name: cleanName, category, slug })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);
  return inserted.id;
}

async function linkTag(kirtanId, tagId) {
  if (!tagId) return;
  const { data, error } = await supabase
    .from("kirtan_tags")
    .select("kirtan_id")
    .eq("kirtan_id", kirtanId)
    .eq("tag_id", tagId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.kirtan_id) return;

  const { error: insertError } = await supabase
    .from("kirtan_tags")
    .insert({ kirtan_id: kirtanId, tag_id: tagId });
  if (insertError) throw new Error(insertError.message);
}

async function uploadToR2(localPath, storagePath) {
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Upload ${localPath} -> ${storagePath}`);
    return `${MEDIA_BASE_URL}/${storagePath}`;
  }
  logStep(`Uploading to R2: ${storagePath}`);
  const ext = getFileExtension(localPath);
  const body = fs.createReadStream(localPath);
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: storagePath,
    Body: body,
    ContentType: contentTypeForExt(ext),
  });
  await s3.send(command);
  return `${MEDIA_BASE_URL}/${storagePath}`;
}

async function findKirtanByDriveFileId(fileId) {
  logStep(`Finding kirtan by drive_file_id=${fileId}`);
  const { data, error } = await supabase
    .from("audio_files")
    .select("id,kirtan_id")
    .eq("drive_file_id", fileId)
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.kirtan_id) return null;

  const { data: kirtan, error: kirtanError } = await supabase
    .from("kirtans")
    .select("id,sequence_num,type")
    .eq("id", data.kirtan_id)
    .maybeSingle();
  if (kirtanError) throw new Error(kirtanError.message);
  return kirtan ?? null;
}

async function upsertAudioFile({
  kirtanId,
  fileId,
  sourceFile,
  durationSeconds,
  storagePath,
}) {
  if (DRY_RUN) {
    console.log(
      `[DRY_RUN] Upsert audio_files for kirtan_id=${kirtanId} file=${sourceFile}`,
    );
    return null;
  }
  logStep(`Upserting audio_files for kirtan_id=${kirtanId}`);
  const audioUrl = `${MEDIA_BASE_URL}/${storagePath}`;
  const { data: existing, error: existingError } = await supabase
    .from("audio_files")
    .select("id")
    .eq("kirtan_id", kirtanId)
    .eq("drive_file_id", fileId)
    .eq("is_current", true)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const payload = {
    kirtan_id: kirtanId,
    drive_file_id: fileId,
    file_name: sourceFile,
    file_url: audioUrl,
    is_current: true,
    duration_seconds: durationSeconds ?? null,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("audio_files")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("audio_files")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

async function main() {
  const sheets = await getSheetsClient();
  const sheetRange = `${SHEET_NAME}`;
  const sheet = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: sheetRange,
  });

  const values = sheet.data.values;
  if (!values || values.length < 2) {
    console.log("No rows to process.");
    return;
  }

  const headers = values[0];
  const col = Object.fromEntries(headers.map((h, i) => [h, i]));
  let processed = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failures = 0;

  for (let i = 1; i < values.length; i += 1) {
    const row = values[i];
    const status = row[col.status];
    if (status !== "NEW" && status !== "UPDATE") {
      skipped += 1;
      continue;
    }
    processed += 1;
    logStep(`\nRow ${i + 1} status=${status}`);

    const fileId = row[col.file_id];
    const type = row[col.type];
    const sourceFile = row[col.source_file];
    const durationSeconds = row[col.duration_seconds]
      ? Number(row[col.duration_seconds])
      : null;
    const sanga = row[col.sanga] || null;
    const title = row[col.title] || null;
    const singer = row[col.singer] || null;
    const raga = row[col.raga] || null;

    const { recorded_date, recorded_date_precision } = parseRecordedDate(
      row[col.date],
    );

    try {
      const leadSingerId = await getOrCreateLeadSinger(singer);
      logStep(`Lead singer id: ${leadSingerId}`);
      const sangaId = await resolveSangaId(sanga);
      if (sangaId) logStep(`Sanga id: ${sangaId}`);

      let kirtanId = null;
      let existingKirtan = null;

      if (status === "UPDATE") {
        if (DRY_RUN) {
          console.log(`[DRY_RUN] Would update kirtan for file_id=${fileId}`);
        }
        existingKirtan = await findKirtanByDriveFileId(fileId);
        if (!existingKirtan) {
          throw new Error(
            `UPDATE row but no audio_files match for drive_file_id=${fileId}`,
          );
        }
        kirtanId = existingKirtan.id;
        updated += 1;
      }

      if (!kirtanId) {
        if (DRY_RUN) {
          console.log(`[DRY_RUN] Would insert new kirtan for file_id=${fileId}`);
          inserted += 1;
          continue;
        }
        const payload = {
          title,
          lead_singer_id: leadSingerId,
          type,
          raga,
          recorded_date,
          recorded_date_precision,
          sanga_id: sangaId,
          updated_at: new Date().toISOString(),
        };
        if (type === "MM") {
          payload.sequence_num = await getNextSequenceNum(leadSingerId);
        }
        const { data, error } = await supabase
          .from("kirtans")
          .insert(payload)
          .select("id,sequence_num")
          .single();
        if (error) throw new Error(error.message);
        kirtanId = data.id;
        existingKirtan = { id: data.id, sequence_num: data.sequence_num };
        logStep(`Inserted kirtan id: ${kirtanId}`);
        inserted += 1;
      } else {
        if (DRY_RUN) {
          console.log(`[DRY_RUN] Would update kirtan_id=${kirtanId}`);
          updated += 1;
          continue;
        }
        const payload = {
          title,
          lead_singer_id: leadSingerId,
          type,
          raga,
          recorded_date,
          recorded_date_precision,
          sanga_id: sangaId,
          updated_at: new Date().toISOString(),
        };
        if (type === "MM" && !existingKirtan.sequence_num) {
          payload.sequence_num = await getNextSequenceNum(leadSingerId);
        }
        const { error } = await supabase
          .from("kirtans")
          .update(payload)
          .eq("id", kirtanId);
        if (error) throw new Error(error.message);
        logStep(`Updated kirtan id: ${kirtanId}`);
      }

      const ext = getFileExtension(sourceFile);
      const folder = type === "MM" ? "mm" : "bhajans";
      const storagePath = `${folder}/${kirtanId}.${ext}`;
      const localBase = type === "MM" ? MM_FOLDER : BHJ_FOLDER;
      const localPath = path.join(localBase, sourceFile);

      if (!fs.existsSync(localPath)) {
        throw new Error(`File not found: ${localPath}`);
      }

      if (VERBOSE) {
        console.log(`Uploading ${localPath} -> ${storagePath}`);
      }
      await uploadToR2(localPath, storagePath);

      await upsertAudioFile({
        kirtanId,
        fileId,
        sourceFile,
        durationSeconds,
        storagePath,
      });
      logStep(`Audio linked: ${MEDIA_BASE_URL}/${storagePath}`);

      if (!DRY_RUN) {
        const tags = [
          ...parseList(row[col.occasions]).map((name) => ({
            name,
            category: "occasion",
          })),
          ...parseList(row[col.person]).map((name) => ({
            name,
            category: "person",
          })),
          ...parseList(row[col.instrument]).map((name) => ({
            name,
            category: "instrument",
          })),
          ...parseList(row[col.flag]).map((name) => ({
            name,
            category: "flag",
          })),
        ];

        for (const tag of tags) {
          const tagId = await getOrCreateTag(tag.name, tag.category);
          await linkTag(kirtanId, tagId);
          logStep(`Tagged ${tag.category}: ${tag.name}`);
        }
      }

      if (!DRY_RUN) {
        const statusCell = `${SHEET_NAME}!${columnToA1(col.status)}${i + 1}`;
        const updatedCell = `${SHEET_NAME}!${columnToA1(col.last_updated)}${
          i + 1
        }`;
        const updates = [
          { range: statusCell, values: [["IMPORTED"]] },
          { range: updatedCell, values: [[new Date().toISOString()]] },
        ];

        if (col.sequence_num !== undefined) {
          const seqCell = `${SHEET_NAME}!${columnToA1(col.sequence_num)}${
            i + 1
          }`;
          updates.push({
            range: seqCell,
            values: [[existingKirtan?.sequence_num ?? ""]],
          });
        }

        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: SHEET_ID,
          requestBody: {
            valueInputOption: "RAW",
            data: updates,
          },
        });
      }
    } catch (err) {
      failures += 1;
      console.error(`Row ${i + 1} failed:`, err.message || err);
      if (DRY_RUN) continue;
    }
  }

  if (!DRY_RUN && inserted + updated > 0) {
    try {
      await triggerRevalidateAll();
    } catch (err) {
      console.error(`Post-ingest revalidation failed: ${err.message || err}`);
    }
  }

  console.log(DRY_RUN ? "Dry run complete." : "Ingest complete.");
  console.log(
    `Rows processed=${processed}, inserted=${inserted}, updated=${updated}, skipped=${skipped}, failed=${failures}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
