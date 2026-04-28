#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const SHEET_ID =
  process.env.SHEET_ID || "1H5vY1IvVdNeDmT8DagD1GNT_8TFk2FZE1XXPlpJiqQ8";
const SHEET_NAME = process.env.SHEET_NAME || "Metadata";
const SERVICE_ACCOUNT_FILE =
  process.env.SHEETS_SERVICE_ACCOUNT_FILE ||
  path.join(__dirname, "..", "secrets", "sheets-service-account.json");

const INBOX_ROOT =
  process.env.KIRTAN_INBOX_ROOT ||
  "/Users/lailafrotjold/Documents/Radhe Kunj Kirtan/Inbox";
const MM_INBOX_FOLDER =
  process.env.MM_INBOX_FOLDER || path.join(INBOX_ROOT, "Maha Mantra");
const BHJ_INBOX_FOLDER =
  process.env.BHJ_INBOX_FOLDER || path.join(INBOX_ROOT, "Bhajans");
const HK_INBOX_FOLDER =
  process.env.HK_INBOX_FOLDER || path.join(INBOX_ROOT, "Hari Katha");

const DRY_RUN =
  process.env.DRY_RUN === "true" || process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");
const FIND_TERMS = process.argv
  .filter((arg) => arg.startsWith("--find="))
  .map((arg) => arg.slice("--find=".length).trim())
  .filter(Boolean);

const AUDIO_EXTENSIONS = new Set(["m4a", "mp3", "wav"]);
const FILL_IF_EMPTY_COLUMNS = new Set(["title", "singer", "date"]);

function logStep(message) {
  if (VERBOSE) {
    console.log(message);
  }
}

function toSheetString(value) {
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
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

function isAudioFile(name) {
  const ext = String(name || "")
    .split(".")
    .pop()
    ?.toLowerCase();
  return Boolean(ext && AUDIO_EXTENSIONS.has(ext));
}

function isDateToken(token) {
  return (
    /^\d{2}-\d{2}-\d{4}(?:_\d{4})?$/.test(token) ||
    /^\d{2}-\d{4}$/.test(token) ||
    /^\d{4}$/.test(token)
  );
}

function extractTag(token) {
  if (!token) return {};
  if (token.startsWith("RG-")) return { raga: token.slice(3) };
  if (token.startsWith("OC-")) return { occasion: token.slice(3) };
  if (token.startsWith("P-")) return { person: token.slice(2) };
  if (token.startsWith("IN-")) return { instrument: token.slice(3) };
  if (token.startsWith("FL-")) return { flag: token.slice(3) };
  return {};
}

function parseFilename(name, fileId, parentFolderName) {
  const base = name ? name.replace(/\.[^.]+$/, "") : "";
  const parts = base ? base.split("__") : [];
  const parentName = String(parentFolderName || "").toLowerCase();
  const parentIndicatesMM = parentName.includes("maha mantra");
  const parentIndicatesHK = parentName.includes("hari katha");
  const filenameIndicatesMM = parts.includes("MM");
  const isMM = parentIndicatesMM || filenameIndicatesMM;
  const tokens = isMM ? parts.filter((part) => part !== "MM") : [...parts];

  const record = {
    file_id: fileId,
    type: "",
    title: "",
    singer: "",
    raga: "",
    occasions: [],
    person: [],
    instrument: [],
    flag: [],
    date: "",
    source_file: name,
    status: "NEW",
    last_updated: "",
    sanga: "",
    duration_seconds: "",
    sequence_num: "",
  };

  if (isMM) {
    record.type = "MM";
    if (tokens.length > 0) {
      record.singer = tokens.shift() || "";
    }
  } else if (parentIndicatesHK) {
    record.type = "HK";
    if (tokens.length > 0) {
      record.title = tokens.shift() || "";
    }
    if (tokens.length > 0) {
      record.singer = tokens.shift() || "";
    }
  } else {
    record.type = "BHJ";
    if (tokens.length > 0) {
      record.title = tokens.shift() || "";
    }
    if (tokens.length > 0) {
      record.singer = tokens.shift() || "";
    }
  }

  if (tokens.length > 0 && isDateToken(tokens.at(-1))) {
    record.date = tokens.pop() || "";
  }

  for (const token of tokens) {
    const parsed = extractTag(token);
    if (parsed.raga) record.raga = parsed.raga;
    if (parsed.occasion) record.occasions.push(parsed.occasion);
    if (parsed.person) record.person.push(parsed.person);
    if (parsed.instrument) record.instrument.push(parsed.instrument);
    if (parsed.flag) record.flag.push(parsed.flag);
  }

  return record;
}

function buildRowMap(headers, parsed) {
  return Object.fromEntries(
    headers.map((header) => [header, toSheetString(parsed[header] ?? "")]),
  );
}

function applyParsedToExistingRow(headers, row, parsed) {
  const next = [...row];
  const rowMap = buildRowMap(headers, parsed);

  for (let i = 0; i < headers.length; i += 1) {
    const header = headers[i];
    const parsedValue = rowMap[header] ?? "";

    if (header === "type" || header === "source_file") {
      next[i] = parsedValue;
      continue;
    }

    if (header === "file_id") {
      const current = String(next[i] ?? "").trim();
      if (!current && parsedValue) {
        next[i] = parsedValue;
      }
      continue;
    }

    if (header === "duration_seconds") {
      const current = String(next[i] ?? "").trim();
      if (!current && parsedValue) {
        next[i] = parsedValue;
      }
      continue;
    }

    if (FILL_IF_EMPTY_COLUMNS.has(header)) {
      const current = String(next[i] ?? "").trim();
      if (!current && parsedValue) {
        next[i] = parsedValue;
      }
    }
  }

  return next;
}

function rowsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (String(a[i] ?? "") !== String(b[i] ?? "")) {
      return false;
    }
  }
  return true;
}

function diffRow(headers, before, after) {
  const changed = [];
  for (let i = 0; i < headers.length; i += 1) {
    const prev = String(before[i] ?? "");
    const next = String(after[i] ?? "");
    if (prev !== next) {
      changed.push({
        column: headers[i],
        before: prev,
        after: next,
      });
    }
  }
  return changed;
}

function buildNewRow(headers, parsed) {
  const rowMap = buildRowMap(headers, parsed);
  const now = new Date().toISOString();
  return headers.map((header) => {
    if (header === "status") return "NEW";
    if (header === "last_updated") return now;
    return rowMap[header] ?? "";
  });
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

function buildLocalFileId(type, filename) {
  return `local:${String(type).toLowerCase()}/${filename}`;
}

function matchKeyFor(type, filename) {
  return `${type}::${filename}`;
}

function canFallbackMatchBySourceFile(parsed) {
  return Boolean(String(parsed.date ?? "").trim());
}

function getDurationSeconds(filePath) {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error(
      `ffprobe failed for ${filePath}: ${result.stderr || result.stdout || "unknown error"}`,
    );
  }

  const seconds = Number.parseFloat(String(result.stdout || "").trim());
  return Number.isFinite(seconds) ? Math.round(seconds) : "";
}

function listAudioFiles(folderPath) {
  if (!fs.existsSync(folderPath)) return [];
  return fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isAudioFile(entry.name))
    .map((entry) => entry.name);
}

function scanLocalFolder(folderPath, folderName, type) {
  logStep(`Scanning folder: ${folderName}`);
  const files = listAudioFiles(folderPath);
  const scanned = [];

  for (const name of files) {
    if (
      FIND_TERMS.length > 0 &&
      FIND_TERMS.some((term) => name.toLowerCase().includes(term.toLowerCase()))
    ) {
      console.log(
        `[FIND] folder="${folderName}" name="${name}" path="${path.join(folderPath, name)}"`,
      );
    }

    const localFileId = buildLocalFileId(type, name);
    const parsed = parseFilename(name, localFileId, folderName);
    const duration = getDurationSeconds(path.join(folderPath, name));
    parsed.duration_seconds = duration === "" ? "" : String(duration);
    scanned.push(parsed);
  }

  return { files, scanned };
}

async function main() {
  const sheets = await getSheetsClient();
  const sheetResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
  });

  const values = sheetResponse.data.values ?? [];
  if (values.length === 0) {
    throw new Error(`Sheet ${SHEET_NAME} is empty.`);
  }

  const headers = values[0];
  const rows = values
    .slice(1)
    .map((row) => headers.map((_, index) => row[index] ?? ""));
  const fileIdIndex = new Map();
  const sourceFileIndex = new Map();
  const col = Object.fromEntries(
    headers.map((header, index) => [header, index]),
  );

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const fileId = String(row[col.file_id] ?? "").trim();
    const type = String(row[col.type] ?? "").trim();
    const sourceFile = String(row[col.source_file] ?? "").trim();
    if (fileId) {
      fileIdIndex.set(fileId, i);
    }
    if (type && sourceFile) {
      sourceFileIndex.set(matchKeyFor(type, sourceFile), i);
    }
  }

  const folders = [
    { path: HK_INBOX_FOLDER, name: "Hari Katha", type: "HK" },
    { path: BHJ_INBOX_FOLDER, name: "Bhajans", type: "BHJ" },
    { path: MM_INBOX_FOLDER, name: "Maha Mantra", type: "MM" },
  ];

  const folderCounts = new Map();
  const scannedByKey = new Map();

  for (const folder of folders) {
    const { files, scanned } = scanLocalFolder(
      folder.path,
      folder.name,
      folder.type,
    );
    folderCounts.set(folder.name, files.length);
    for (const parsed of scanned) {
      scannedByKey.set(matchKeyFor(parsed.type, parsed.source_file), parsed);
    }
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const insertedFiles = [];
  const updatedFiles = [];
  const skippedFiles = [];

  for (const parsed of scannedByKey.values()) {
    let existingIndex = fileIdIndex.get(parsed.file_id);
    if (existingIndex === undefined && canFallbackMatchBySourceFile(parsed)) {
      existingIndex = sourceFileIndex.get(
        matchKeyFor(parsed.type, parsed.source_file),
      );
    }

    if (
      FIND_TERMS.length > 0 &&
      FIND_TERMS.some((term) =>
        String(parsed.source_file || "")
          .toLowerCase()
          .includes(term.toLowerCase()),
      )
    ) {
      if (existingIndex !== undefined) {
        console.log(
          `[MATCH] UPDATE row=${existingIndex + 2} file="${parsed.source_file}" id=${parsed.file_id} type=${parsed.type}`,
        );
      } else {
        console.log(
          `[MATCH] INSERT file="${parsed.source_file}" id=${parsed.file_id} type=${parsed.type}`,
        );
      }
    }

    if (existingIndex !== undefined) {
      const nextRow = applyParsedToExistingRow(
        headers,
        rows[existingIndex],
        parsed,
      );
      if (rowsEqual(rows[existingIndex], nextRow)) {
        skipped += 1;
        skippedFiles.push({
          file_id: parsed.file_id,
          source_file: parsed.source_file,
          type: parsed.type,
        });
      } else {
        const changes = diffRow(headers, rows[existingIndex], nextRow);
        updated += 1;
        updatedFiles.push({
          file_id: parsed.file_id,
          source_file: parsed.source_file,
          type: parsed.type,
          changes,
        });
        rows[existingIndex] = nextRow;
      }
      continue;
    }

    rows.push(buildNewRow(headers, parsed));
    const newIndex = rows.length - 1;
    fileIdIndex.set(parsed.file_id, newIndex);
    sourceFileIndex.set(matchKeyFor(parsed.type, parsed.source_file), newIndex);
    inserted += 1;
    insertedFiles.push({
      file_id: parsed.file_id,
      source_file: parsed.source_file,
      type: parsed.type,
    });
  }

  const output = [headers, ...rows];
  const endCell = `${columnToA1(headers.length - 1)}${output.length}`;

  if (DRY_RUN) {
    console.log(
      `[DRY_RUN] Would write ${output.length - 1} rows to ${SHEET_NAME}!A1:${endCell}`,
    );
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1:${endCell}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: output },
    });
  }

  if (VERBOSE) {
    console.log("Folder audio counts:");
    for (const [folderName, count] of folderCounts.entries()) {
      console.log(`  ${folderName}: ${count}`);
    }
    console.log("Inserted files:");
    for (const file of insertedFiles) {
      console.log(`  [${file.type}] ${file.source_file} (${file.file_id})`);
    }
    console.log("Updated files:");
    for (const file of updatedFiles) {
      console.log(`  [${file.type}] ${file.source_file} (${file.file_id})`);
      for (const change of file.changes) {
        console.log(
          `    - ${change.column}: "${change.before}" -> "${change.after}"`,
        );
      }
    }
    console.log("Skipped files:");
    for (const file of skippedFiles) {
      console.log(`  [${file.type}] ${file.source_file} (${file.file_id})`);
    }
  }

  console.log(
    `Scan complete. folders=${folders.length}, files=${scannedByKey.size}, inserted=${inserted}, updated=${updated}, skipped=${skipped}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
