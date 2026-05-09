#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const INBOX_ROOT =
  process.env.KIRTAN_INBOX_ROOT ||
  "/Users/lailafrotjold/Documents/Radhe Kunj Kirtan/Inbox";
const DEFAULT_PROCESSING_FOLDERS = [
  path.join(process.env.MM_INBOX_FOLDER || path.join(INBOX_ROOT, "Maha Mantra"), "Audioprocessing"),
  path.join(process.env.BHJ_INBOX_FOLDER || path.join(INBOX_ROOT, "Bhajans"), "Audioprocessing"),
  path.join(process.env.HK_INBOX_FOLDER || path.join(INBOX_ROOT, "Hari Katha"), "Audioprocessing"),
];

const TARGET_EXTENSIONS = new Set([
  ".m4a",
  ".mp3",
  ".wav",
  ".aif",
  ".aiff",
  ".mov",
  ".qta",
  ".mp4",
]);
const CONVERT_TO_M4A_EXTENSIONS = new Set([".mov", ".qta", ".mp4", ".wav", ".aif", ".aiff"]);

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const OVERWRITE = args.includes("--overwrite");
const DELETE_ORIGINALS = args.includes("--delete-originals");
const VERBOSE = args.includes("--verbose");
const folders = args
  .filter((arg) => !arg.startsWith("--"))
  .map((folder) => path.resolve(folder));

const scanFolders = folders.length > 0 ? folders : DEFAULT_PROCESSING_FOLDERS;

function logVerbose(message) {
  if (VERBOSE) {
    console.log(message);
  }
}

function assertFfmpegAvailable() {
  const result = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(
      "ffmpeg is required. Install it first, for example: brew install ffmpeg",
    );
  }
}

function collectFiles(folder) {
  if (!fs.existsSync(folder)) {
    console.warn(`Skipping missing folder: ${folder}`);
    return [];
  }

  const entries = fs.readdirSync(folder, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(folder, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (TARGET_EXTENSIONS.has(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}

function getDestinationPath(inputPath) {
  const normalized = path.resolve(inputPath);
  const parts = normalized.split(path.sep);
  const processingIndex = parts.lastIndexOf("Audioprocessing");

  if (processingIndex === -1) {
    throw new Error(`Expected Audioprocessing in path: ${inputPath}`);
  }

  const archiveBase = parts.slice(0, processingIndex).join(path.sep) || path.sep;
  const afterProcessing = parts.slice(processingIndex + 1);
  const inputExt = path.extname(inputPath).toLowerCase();
  const outputExt = CONVERT_TO_M4A_EXTENSIONS.has(inputExt) ? ".m4a" : inputExt;

  const relativeDir = afterProcessing.length > 1 ? afterProcessing.slice(0, -1).join(path.sep) : "";
  const fileName = `${path.parse(inputPath).name}${outputExt}`;

  return path.join(archiveBase, relativeDir, fileName);
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function normalizeFile(inputPath) {
  const outputPath = getDestinationPath(inputPath);

  if (fs.existsSync(outputPath) && !OVERWRITE) {
    return { status: "skipped", inputPath, outputPath, reason: "output exists" };
  }

  const ext = path.extname(outputPath).toLowerCase();
  const codecArgs =
    ext === ".mp3"
      ? ["-c:a", "libmp3lame", "-b:a", "192k"]
      : ["-c:a", "aac", "-b:a", "128k"];

  const ffmpegArgs = [
    OVERWRITE ? "-y" : "-n",
    "-i",
    inputPath,
    "-vn",
    "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11",
    ...codecArgs,
    outputPath,
  ];

  if (DRY_RUN) {
    return { status: "dry-run", inputPath, outputPath };
  }

  ensureParentDir(outputPath);
  logVerbose(`ffmpeg ${ffmpegArgs.map((arg) => JSON.stringify(arg)).join(" ")}`);

  const result = spawnSync("ffmpeg", ffmpegArgs, {
    encoding: "utf8",
    stdio: VERBOSE ? "inherit" : "pipe",
  });

  if (result.status !== 0) {
    return {
      status: "failed",
      inputPath,
      outputPath,
      reason: result.stderr?.trim() || result.error?.message || "ffmpeg failed",
    };
  }

  if (DELETE_ORIGINALS) {
    fs.unlinkSync(inputPath);
  }

  return { status: "normalized", inputPath, outputPath };
}

function main() {
  if (!DRY_RUN) {
    assertFfmpegAvailable();
  }

  const files = scanFolders.flatMap((folder) => {
    console.log(`Scanning: ${folder}`);
    return collectFiles(folder);
  });

  if (files.length === 0) {
    console.log("No audio files found in Audioprocessing folders.");
    return;
  }

  const results = files.map(normalizeFile);

  for (const result of results) {
    const relativeInput = path.relative(process.cwd(), result.inputPath);
    const relativeOutput = path.relative(process.cwd(), result.outputPath);

    if (result.status === "normalized") {
      const deleteNote = DELETE_ORIGINALS ? " and deleted original" : "";
      console.log(`Normalized${deleteNote}: ${relativeInput} -> ${relativeOutput}`);
      continue;
    }

    if (result.status === "dry-run") {
      console.log(`[DRY_RUN] Would normalize: ${relativeInput} -> ${relativeOutput}`);
      continue;
    }

    if (result.status === "skipped") {
      console.log(`Skipped: ${relativeInput} (${result.reason})`);
      continue;
    }

    console.error(`Failed: ${relativeInput} (${result.reason})`);
  }

  const normalized = results.filter((result) => result.status === "normalized").length;
  const skipped = results.filter((result) => result.status === "skipped").length;
  const failed = results.filter((result) => result.status === "failed").length;

  console.log(
    `Normalization complete. found=${files.length}, normalized=${normalized}, skipped=${skipped}, failed=${failed}`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
