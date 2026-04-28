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
const DEFAULT_FOLDERS = [
  process.env.MM_INBOX_FOLDER || path.join(INBOX_ROOT, "Maha Mantra"),
  process.env.BHJ_INBOX_FOLDER || path.join(INBOX_ROOT, "Bhajans"),
  process.env.HK_INBOX_FOLDER || path.join(INBOX_ROOT, "Hari Katha"),
];

const TARGET_EXTENSIONS = new Set([".qta", ".mov"]);
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const DELETE_ORIGINALS = args.includes("--delete-originals");
const OVERWRITE = args.includes("--overwrite");
const VERBOSE = args.includes("--verbose");
const folders = args
  .filter((arg) => !arg.startsWith("--"))
  .map((folder) => path.resolve(folder));

const scanFolders = folders.length > 0 ? folders : DEFAULT_FOLDERS;

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

function collectQuickTimeFiles(folder) {
  if (!fs.existsSync(folder)) {
    console.warn(`Skipping missing folder: ${folder}`);
    return [];
  }

  const entries = fs.readdirSync(folder, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(folder, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectQuickTimeFiles(fullPath));
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

function getOutputPath(inputPath) {
  return path.join(
    path.dirname(inputPath),
    `${path.basename(inputPath, path.extname(inputPath))}.m4a`,
  );
}

function transcodeFile(inputPath) {
  const outputPath = getOutputPath(inputPath);

  if (fs.existsSync(outputPath) && !OVERWRITE) {
    return { status: "skipped", inputPath, outputPath, reason: "output exists" };
  }

  const ffmpegArgs = [
    OVERWRITE ? "-y" : "-n",
    "-i",
    inputPath,
    "-vn",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    outputPath,
  ];

  if (DRY_RUN) {
    return { status: "dry-run", inputPath, outputPath };
  }

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

  return { status: "converted", inputPath, outputPath };
}

function main() {
  if (!DRY_RUN) {
    assertFfmpegAvailable();
  }

  const files = scanFolders.flatMap((folder) => {
    console.log(`Scanning: ${folder}`);
    return collectQuickTimeFiles(folder);
  });

  if (files.length === 0) {
    console.log("No .qta or .mov files found.");
    return;
  }

  const results = files.map(transcodeFile);

  for (const result of results) {
    const relativeInput = path.relative(process.cwd(), result.inputPath);
    const relativeOutput = path.relative(process.cwd(), result.outputPath);

    if (result.status === "converted") {
      const deleteNote = DELETE_ORIGINALS ? " and deleted original" : "";
      console.log(`Converted${deleteNote}: ${relativeInput} -> ${relativeOutput}`);
      continue;
    }

    if (result.status === "dry-run") {
      console.log(`[DRY_RUN] Would convert: ${relativeInput} -> ${relativeOutput}`);
      continue;
    }

    if (result.status === "skipped") {
      console.log(`Skipped: ${relativeInput} (${result.reason})`);
      continue;
    }

    console.error(`Failed: ${relativeInput} (${result.reason})`);
  }

  const converted = results.filter((result) => result.status === "converted").length;
  const skipped = results.filter((result) => result.status === "skipped").length;
  const failed = results.filter((result) => result.status === "failed").length;

  console.log(
    `Transcode complete. found=${files.length}, converted=${converted}, skipped=${skipped}, failed=${failed}`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
