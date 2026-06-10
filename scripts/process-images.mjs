#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const R2_ENDPOINT = process.env.R2_IMAGES_ENDPOINT || process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID =
  process.env.R2_IMAGES_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY =
  process.env.R2_IMAGES_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
const IMAGES_BUCKET =
  process.env.R2_IMAGES_BUCKET ||
  process.env.IMAGES_BUCKET ||
  process.env.R2_BUCKET_IMAGES ||
  "images";

if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error("Missing R2 credentials in env.");
}

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const SOURCE_PREFIXES = new Set(["lead-singers", "page-art"]);
const DERIVED_FOLDER_NAME = "derived";
const DEFAULT_VERSION = "1";
const SUPPORTED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".heic",
  ".heif",
  ".tif",
  ".tiff",
]);
const VARIANTS = [
  { width: 160, height: 160 },
  { width: 320, height: 320 },
  { width: 480, height: 260 },
  { width: 560, height: 720 },
  { width: 720, height: 360 },
  { width: 1200, height: 380 },
  { width: 1200, height: 720 },
];

function printUsage() {
  console.log(`
Usage:
  node scripts/process-images.mjs sync [options]
  node scripts/process-images.mjs upload <file-or-dir> [more paths] --prefix=<lead-singers|page-art> [options]

Commands:
  sync
    Backfill derivatives for originals already in the R2 images bucket.

  upload
    Upload local originals to the images bucket and generate derivatives.

Options:
  --prefix=<lead-singers|page-art>   Restrict processing to one top-level folder.
  --bucket=<bucket-name>             Override the default bucket (${IMAGES_BUCKET}).
  --version=<n>                      Version suffix for derivative names. Default: ${DEFAULT_VERSION}
  --overwrite                        Replace existing originals/derivatives.
  --dry-run                          Print the work without uploading or deleting.
  --limit=<n>                        Process at most n originals during sync.
  --delete-stale                     Remove old derivative files for the same original/version family.
  --help                             Show this message.

Examples:
  node scripts/process-images.mjs sync --prefix=lead-singers
  node scripts/process-images.mjs upload ~/Desktop/Avadhuta-Maharaja.png --prefix=lead-singers
  node scripts/process-images.mjs upload ~/Desktop/page-art --prefix=page-art --overwrite
`);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {
    bucket: IMAGES_BUCKET,
    version: DEFAULT_VERSION,
    overwrite: false,
    dryRun: false,
    deleteStale: false,
    limit: null,
    prefix: null,
    help: false,
  };

  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    if (arg === "--overwrite") {
      flags.overwrite = true;
      continue;
    }

    if (arg === "--dry-run") {
      flags.dryRun = true;
      continue;
    }

    if (arg === "--delete-stale") {
      flags.deleteStale = true;
      continue;
    }

    if (arg === "--help") {
      flags.help = true;
      continue;
    }

    const [rawKey, rawValue] = arg.slice(2).split("=");
    const value = rawValue?.trim();

    switch (rawKey) {
      case "bucket":
        flags.bucket = value || flags.bucket;
        break;
      case "version":
        flags.version = value || flags.version;
        break;
      case "prefix":
        flags.prefix = value || null;
        break;
      case "limit":
        flags.limit = value ? Number.parseInt(value, 10) : null;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return { positional, flags };
}

function ensureMagickAvailable() {
  const result = spawnSync("magick", ["-version"], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(
      "ImageMagick is required. Install it first, for example: brew install imagemagick",
    );
  }
}

function ensureValidPrefix(prefix) {
  if (!prefix || !SOURCE_PREFIXES.has(prefix)) {
    throw new Error(
      `Invalid prefix "${prefix}". Expected one of: ${Array.from(SOURCE_PREFIXES).join(", ")}`,
    );
  }
}

function normalizeKey(key) {
  return String(key || "")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
}

function isSupportedImageKey(key) {
  return SUPPORTED_EXTENSIONS.has(path.extname(key).toLowerCase());
}

function isDerivedKey(key) {
  return key.includes(`/${DERIVED_FOLDER_NAME}/`);
}

function mimeTypeForKey(key) {
  switch (path.extname(key).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    case ".heic":
    case ".heif":
      return "image/heic";
    case ".tif":
    case ".tiff":
      return "image/tiff";
    default:
      return "application/octet-stream";
  }
}

function flattenRelativeStem(key) {
  const normalized = normalizeKey(key);
  const ext = path.extname(normalized);
  const withoutExt = ext ? normalized.slice(0, -ext.length) : normalized;
  const parts = withoutExt.split("/").slice(1);
  return parts.join("__");
}

function buildDerivedKey(originalKey, variant, version) {
  const normalized = normalizeKey(originalKey);
  const prefix = normalized.split("/")[0];
  const ext = path.extname(normalized);
  const stem = flattenRelativeStem(normalized);
  return `${prefix}/${DERIVED_FOLDER_NAME}/${stem}__${variant.width}x${variant.height}_v${version}${ext}`;
}

function buildStaleDerivativePattern(originalKey) {
  return `${flattenRelativeStem(originalKey)}__`;
}

function listSourcePrefixes(prefix) {
  if (prefix) {
    ensureValidPrefix(prefix);
    return [prefix];
  }

  return Array.from(SOURCE_PREFIXES);
}

async function listBucketKeys(bucket, prefix) {
  const keys = [];
  let continuationToken;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix ? `${prefix}/` : undefined,
        ContinuationToken: continuationToken,
      }),
    );

    for (const item of response.Contents ?? []) {
      if (item.Key) {
        keys.push(item.Key);
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

async function headObject(bucket, key) {
  try {
    return await s3.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound") {
      return null;
    }
    throw error;
  }
}

async function downloadObjectToFile(bucket, key, destinationPath) {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  const bytes = await response.Body.transformToByteArray();
  fs.writeFileSync(destinationPath, Buffer.from(bytes));
}

async function uploadFileToR2(bucket, key, filePath, options = {}) {
  const body = fs.readFileSync(filePath);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: options.contentType ?? mimeTypeForKey(key),
      CacheControl: options.cacheControl ?? "public, max-age=31536000, immutable",
      Metadata: options.metadata,
    }),
  );
}

async function deleteObject(bucket, key) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "kirtan-oasis-images-"));
}

function removeTempDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function runMagick(inputPath, outputPath, variant) {
  const resizeArg = `${variant.width}x${variant.height}^`;
  const extentArg = `${variant.width}x${variant.height}`;
  const args = [
    inputPath,
    "-auto-orient",
    "-resize",
    resizeArg,
    "-gravity",
    "center",
    "-extent",
    extentArg,
    outputPath,
  ];

  const result = spawnSync("magick", args, {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    throw new Error(
      `ImageMagick failed for ${path.basename(inputPath)} (${variant.width}x${variant.height}): ${result.stderr?.trim() || "unknown error"}`,
    );
  }
}

function collectLocalImages(targetPath) {
  const resolved = path.resolve(targetPath);
  const stats = fs.statSync(resolved);

  if (stats.isFile()) {
    return [resolved];
  }

  if (!stats.isDirectory()) {
    return [];
  }

  const files = [];
  const entries = fs.readdirSync(resolved, { withFileTypes: true });

  for (const entry of entries) {
    const childPath = path.join(resolved, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectLocalImages(childPath));
      continue;
    }

    if (entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(childPath);
    }
  }

  return files;
}

function buildOriginalKeyForUpload(prefix, localPath, rootPath) {
  const resolved = path.resolve(localPath);
  const stats = fs.statSync(rootPath);

  if (stats.isFile()) {
    return `${prefix}/${path.basename(resolved)}`;
  }

  const relativePath = path.relative(path.resolve(rootPath), resolved);
  return normalizeKey(`${prefix}/${relativePath}`);
}

async function maybeDeleteStaleDerivatives(bucket, originalKey, keepKeys, dryRun) {
  const prefix = originalKey.split("/")[0];
  const existingKeys = await listBucketKeys(bucket, `${prefix}/${DERIVED_FOLDER_NAME}`);
  const familyStem = buildStaleDerivativePattern(originalKey);
  const staleKeys = existingKeys.filter((key) => {
    const filename = path.basename(key);
    return filename.startsWith(familyStem) && !keepKeys.has(key);
  });

  for (const staleKey of staleKeys) {
    if (dryRun) {
      console.log(`[DRY_RUN] Would delete stale derivative: ${staleKey}`);
      continue;
    }

    await deleteObject(bucket, staleKey);
    console.log(`Deleted stale derivative: ${staleKey}`);
  }
}

async function createDerivativesForOriginal({
  bucket,
  originalKey,
  originalFilePath,
  version,
  overwrite,
  dryRun,
  deleteStale,
}) {
  const keepKeys = new Set();
  let generated = 0;
  let skipped = 0;

  for (const variant of VARIANTS) {
    const derivedKey = buildDerivedKey(originalKey, variant, version);
    keepKeys.add(derivedKey);

    if (!overwrite) {
      const existing = await headObject(bucket, derivedKey);
      if (existing) {
        skipped += 1;
        console.log(`Skipped existing derivative: ${derivedKey}`);
        continue;
      }
    }

    if (dryRun) {
      generated += 1;
      console.log(`[DRY_RUN] Would generate derivative: ${derivedKey}`);
      continue;
    }

    const ext = path.extname(derivedKey);
    const outputPath = path.join(
      path.dirname(originalFilePath),
      `${randomUUID()}${ext}`,
    );

    runMagick(originalFilePath, outputPath, variant);
    await uploadFileToR2(bucket, derivedKey, outputPath, {
      metadata: {
        source_key: originalKey,
        variant: `${variant.width}x${variant.height}`,
        version: String(version),
      },
    });
    fs.unlinkSync(outputPath);

    generated += 1;
    console.log(`Uploaded derivative: ${derivedKey}`);
  }

  if (deleteStale) {
    await maybeDeleteStaleDerivatives(bucket, originalKey, keepKeys, dryRun);
  }

  return { generated, skipped };
}

async function processExistingOriginal({
  bucket,
  originalKey,
  version,
  overwrite,
  dryRun,
  deleteStale,
}) {
  const tempDir = createTempDir();

  try {
    const ext = path.extname(originalKey);
    const localOriginalPath = path.join(tempDir, `source${ext}`);

    if (!dryRun) {
      await downloadObjectToFile(bucket, originalKey, localOriginalPath);
    }

    console.log(`Processing original: ${originalKey}`);

    return await createDerivativesForOriginal({
      bucket,
      originalKey,
      originalFilePath: localOriginalPath,
      version,
      overwrite,
      dryRun,
      deleteStale,
    });
  } finally {
    removeTempDir(tempDir);
  }
}

async function syncBucket({ bucket, prefix, version, overwrite, dryRun, deleteStale, limit }) {
  const prefixes = listSourcePrefixes(prefix);
  const originals = [];

  for (const sourcePrefix of prefixes) {
    const keys = await listBucketKeys(bucket, sourcePrefix);
    for (const key of keys) {
      const normalized = normalizeKey(key);
      if (isDerivedKey(normalized)) continue;
      if (!isSupportedImageKey(normalized)) continue;
      originals.push(normalized);
    }
  }

  originals.sort((a, b) => a.localeCompare(b));

  const selected = Number.isInteger(limit) && limit > 0
    ? originals.slice(0, limit)
    : originals;

  let generated = 0;
  let skipped = 0;

  for (const originalKey of selected) {
    const result = await processExistingOriginal({
      bucket,
      originalKey,
      version,
      overwrite,
      dryRun,
      deleteStale,
    });

    generated += result.generated;
    skipped += result.skipped;
  }

  console.log(
    `Sync complete. originals=${selected.length}, generated=${generated}, skipped=${skipped}, dryRun=${dryRun}`,
  );
}

async function uploadOriginalAndDerivatives({
  bucket,
  originalKey,
  localPath,
  version,
  overwrite,
  dryRun,
  deleteStale,
}) {
  if (!overwrite) {
    const existing = await headObject(bucket, originalKey);
    if (existing) {
      throw new Error(
        `Original already exists in bucket: ${originalKey}. Re-run with --overwrite to replace it.`,
      );
    }
  }

  if (dryRun) {
    console.log(`[DRY_RUN] Would upload original: ${originalKey}`);
  } else {
    await uploadFileToR2(bucket, originalKey, localPath, {
      cacheControl: "public, max-age=14400",
    });
    console.log(`Uploaded original: ${originalKey}`);
  }

  const result = await createDerivativesForOriginal({
    bucket,
    originalKey,
    originalFilePath: localPath,
    version,
    overwrite: true,
    dryRun,
    deleteStale,
  });

  return result;
}

async function uploadLocalPaths({
  bucket,
  prefix,
  localTargets,
  version,
  overwrite,
  dryRun,
  deleteStale,
}) {
  ensureValidPrefix(prefix);

  const uploadItems = [];

  for (const target of localTargets) {
    const resolved = path.resolve(target);
    const rootStats = fs.statSync(resolved);

    if (rootStats.isFile()) {
      if (!SUPPORTED_EXTENSIONS.has(path.extname(resolved).toLowerCase())) {
        console.log(`Skipping unsupported file: ${resolved}`);
        continue;
      }

      uploadItems.push({
        localPath: resolved,
        originalKey: buildOriginalKeyForUpload(prefix, resolved, resolved),
      });
      continue;
    }

    const files = collectLocalImages(resolved);
    for (const localPath of files) {
      uploadItems.push({
        localPath,
        originalKey: buildOriginalKeyForUpload(prefix, localPath, resolved),
      });
    }
  }

  let generated = 0;

  for (const item of uploadItems) {
    const result = await uploadOriginalAndDerivatives({
      bucket,
      originalKey: item.originalKey,
      localPath: item.localPath,
      version,
      overwrite,
      dryRun,
      deleteStale,
    });
    generated += result.generated;
  }

  console.log(
    `Upload complete. originals=${uploadItems.length}, generated=${generated}, dryRun=${dryRun}`,
  );
}

async function main() {
  ensureMagickAvailable();

  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "--help") {
    printUsage();
    return;
  }

  const command = argv[0];
  const { positional, flags } = parseArgs(argv.slice(1));

  if (flags.help || !command) {
    printUsage();
    return;
  }

  switch (command) {
    case "sync":
      await syncBucket({
        bucket: flags.bucket,
        prefix: flags.prefix,
        version: flags.version,
        overwrite: flags.overwrite,
        dryRun: flags.dryRun,
        deleteStale: flags.deleteStale,
        limit: flags.limit,
      });
      return;

    case "upload":
      if (positional.length === 0) {
        throw new Error("Provide at least one local file or directory to upload.");
      }

      await uploadLocalPaths({
        bucket: flags.bucket,
        prefix: flags.prefix,
        localTargets: positional,
        version: flags.version,
        overwrite: flags.overwrite,
        dryRun: flags.dryRun,
        deleteStale: flags.deleteStale,
      });
      return;

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
