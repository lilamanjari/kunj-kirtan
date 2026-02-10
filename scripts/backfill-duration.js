#!/usr/bin/env node
/*
  Backfill duration_seconds in Google Sheet using local audio files and ffprobe.

  Setup:
  - npm install googleapis
  - Put service account JSON on disk and share the Google Sheet with the
    service account email (from the JSON).

  Run:
  node scripts/backfill-duration.js
*/

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { google } = require('googleapis');

const CONFIG = {
  SHEET_ID: '1H5vY1IvVdNeDmT8DagD1GNT_8TFk2FZE1XXPlpJiqQ8',
  SHEET_NAME: 'Metadata',
  SERVICE_ACCOUNT_JSON: path.resolve(__dirname, '../secrets/sheets-service-account.json'),
  AUDIO_DIRS: [
    '/Users/lailafrotjold/Documents/Radhe Kunj Kirtan/Maha Mantra',
    '/Users/lailafrotjold/Documents/Radhe Kunj Kirtan/Bhajans'
  ],
  DRY_RUN: false
};

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function loadServiceAccount(filePath) {
  if (!fs.existsSync(filePath)) {
    die(`Service account JSON not found at ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function walkDir(dir, results) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((ent) => {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkDir(full, results);
      return;
    }
    if (ent.isFile() && ent.name.toLowerCase().endsWith('.m4a')) {
      results.push(full);
    }
  });
}

function buildFilenameMap(dirs) {
  const files = [];
  dirs.forEach((d) => {
    if (!fs.existsSync(d)) {
      console.warn(`Audio dir missing: ${d}`);
      return;
    }
    walkDir(d, files);
  });

  const map = new Map();
  const dupes = new Map();

  files.forEach((fullPath) => {
    const name = path.basename(fullPath);
    if (map.has(name)) {
      dupes.set(name, [map.get(name), fullPath]);
      return;
    }
    map.set(name, fullPath);
  });

  if (dupes.size > 0) {
    console.warn('Duplicate filenames found (will be skipped):');
    dupes.forEach((paths, name) => {
      console.warn(`  ${name}`);
      paths.forEach((p) => console.warn(`    - ${p}`));
    });
  }

  return { map, dupes };
}

function ffprobeDurationSeconds(filePath) {
  const args = [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath
  ];
  const res = spawnSync('ffprobe', args, { encoding: 'utf8' });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`ffprobe failed for ${filePath}: ${res.stderr || res.stdout}`);
  }
  const raw = (res.stdout || '').trim();
  const seconds = Number(raw);
  if (!Number.isFinite(seconds)) {
    throw new Error(`ffprobe returned non-number for ${filePath}: ${raw}`);
  }
  return Math.round(seconds);
}

async function main() {
  const svc = loadServiceAccount(CONFIG.SERVICE_ACCOUNT_JSON);

  const auth = new google.auth.JWT({
    email: svc.client_email,
    key: svc.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const { map: filenameMap, dupes } = buildFilenameMap(CONFIG.AUDIO_DIRS);

  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SHEET_ID,
    range: CONFIG.SHEET_NAME
  });

  const values = resp.data.values || [];
  if (values.length === 0) die('Sheet is empty');

  const headers = values[0];
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  const required = ['file_id', 'source_file', 'duration_seconds', 'status', 'last_updated'];
  required.forEach((h) => {
    if (col[h] === undefined) die(`Missing column in sheet: ${h}`);
  });

  const updates = [];
  let updatedCount = 0;
  let skippedCount = 0;
  let missingFileCount = 0;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowNum = i + 1; // 1-based in Sheets
    const sourceFile = row[col.source_file];
    const duration = row[col.duration_seconds];

    if (!sourceFile) {
      skippedCount++;
      continue;
    }

    if (duration !== undefined && duration !== null && String(duration).trim() !== '') {
      skippedCount++;
      continue;
    }

    if (dupes.has(sourceFile)) {
      console.warn(`Skipping duplicate filename in sheet row ${rowNum}: ${sourceFile}`);
      skippedCount++;
      continue;
    }

    const fullPath = filenameMap.get(sourceFile);
    if (!fullPath) {
      console.warn(`Missing local file for row ${rowNum}: ${sourceFile}`);
      missingFileCount++;
      continue;
    }

    try {
      const seconds = ffprobeDurationSeconds(fullPath);
      const durationColLetter = columnNumberToLetter(col.duration_seconds + 1);
      const statusColLetter = columnNumberToLetter(col.status + 1);
      const updatedColLetter = columnNumberToLetter(col.last_updated + 1);

      updates.push({
        range: `${CONFIG.SHEET_NAME}!${durationColLetter}${rowNum}`,
        values: [[seconds]]
      });
      updates.push({
        range: `${CONFIG.SHEET_NAME}!${statusColLetter}${rowNum}`,
        values: [['READY']]
      });
      updates.push({
        range: `${CONFIG.SHEET_NAME}!${updatedColLetter}${rowNum}`,
        values: [[new Date().toISOString()]]
      });
      updatedCount++;
    } catch (err) {
      console.warn(`Failed duration for row ${rowNum}: ${err.message}`);
    }
  }

  if (updates.length === 0) {
    console.log('No updates to apply.');
    console.log(`Skipped: ${skippedCount}, Missing local file: ${missingFileCount}`);
    return;
  }

  if (CONFIG.DRY_RUN) {
    console.log(`DRY RUN: would apply ${updates.length} cell updates.`);
    console.log(`Would update ${updatedCount} rows.`);
    return;
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: CONFIG.SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates
    }
  });

  console.log(`Updated ${updatedCount} rows.`);
  console.log(`Skipped: ${skippedCount}, Missing local file: ${missingFileCount}`);
}

function columnNumberToLetter(num) {
  let result = '';
  while (num > 0) {
    const mod = (num - 1) % 26;
    result = String.fromCharCode(65 + mod) + result;
    num = Math.floor((num - mod) / 26);
  }
  return result;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
