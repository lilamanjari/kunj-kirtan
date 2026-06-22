# Commands

Run these from:

```bash
cd /Users/lailafrotjold/Documents/Kirtan\ Oasis/Kirtan\ Oasis\ Backend/kirtan-oasis
```

## App Commands

### `npm run dev`

Starts the Next.js dev server.

Example:

```bash
npm run dev
```

### `npm run build`

Builds the app for production.

Example:

```bash
npm run build
```

### `npm run start`

Starts the production server after a build.

Example:

```bash
npm run start
```

### `npm run lint`

Runs ESLint.

Example:

```bash
npm run lint
```

### `npm run test`

Runs the Vitest test suite.

Example:

```bash
npm run test
```

### `npm run test:watch`

Runs Vitest in watch mode.

Example:

```bash
npm run test:watch
```

## Processing Commands

### `npm run images:sync`

Backfills image derivatives for originals already stored in the R2 images bucket.

Parameters:

- `--prefix=<lead-singers|page-art>`: limit processing to one top-level folder
- `--bucket=<bucket-name>`: override the target bucket
- `--version=<n>`: derivative version suffix, default `1`
- `--overwrite`: replace existing derivatives
- `--dry-run`: show planned work without uploading or deleting
- `--limit=<n>`: process at most `n` originals
- `--delete-stale`: remove old derivative files for the same original/version family
- `--help`: show built-in usage

Examples:

```bash
npm run images:sync
npm run images:sync -- --prefix=lead-singers
npm run images:sync -- --prefix=page-art --limit=10 --dry-run
npm run images:sync -- --prefix=lead-singers --overwrite --delete-stale
```

Notes:

- Uses `node scripts/process-images.mjs sync`
- Requires ImageMagick (`magick`)
- Uses `.env.local` for R2 credentials

### `npm run images:upload`

Uploads local original images to the R2 images bucket and generates derivatives.

Parameters:

- One or more positional paths: `<file-or-dir> [more paths]`
- `--prefix=<lead-singers|page-art>`: required destination prefix
- `--bucket=<bucket-name>`: override the target bucket
- `--version=<n>`: derivative version suffix, default `1`
- `--overwrite`: replace existing originals and derivatives
- `--dry-run`: show planned work without uploading or deleting
- `--delete-stale`: remove old derivative files for the same original/version family
- `--help`: show built-in usage

Examples:

```bash
npm run images:upload -- ~/Desktop/Avadhuta-Maharaja.png --prefix=lead-singers
npm run images:upload -- ~/Desktop/page-art --prefix=page-art --overwrite
npm run images:upload -- ~/Desktop/page-art/summer-flyer.jpg --prefix=page-art --dry-run
```

Notes:

- Uses `node scripts/process-images.mjs upload ...`
- Requires ImageMagick (`magick`)
- Uses `.env.local` for R2 credentials

### `npm run scan-drive`

Scans local inbox folders, parses filenames, computes durations, and syncs rows into the Google Sheet metadata tab.

Parameters:

- `--dry-run`: show what would be written without updating the sheet
- `--verbose`: print folder counts, inserts, updates, skips, and per-column diffs
- `--find=<term>`: filter/highlight matching files in output; can be repeated

Examples:

```bash
npm run scan-drive
npm run scan-drive -- --dry-run
npm run scan-drive -- --verbose
npm run scan-drive -- --find=Avadhuta
npm run scan-drive -- --find=Avadhuta --find=2024 --verbose
```

Notes:

- Uses `node scripts/scan-drive-to-sheet.mjs`
- Requires `ffprobe` for duration detection
- Reads `.env.local`
- Defaults:
  - `SHEET_ID`
  - `SHEET_NAME` default `Metadata`
  - `SHEETS_SERVICE_ACCOUNT_FILE` default `secrets/sheets-service-account.json`
  - `KIRTAN_INBOX_ROOT`
  - `MM_INBOX_FOLDER`
  - `BHJ_INBOX_FOLDER`
  - `HK_INBOX_FOLDER`

### `npm run transcode-audio`

Recursively finds `.qta` and `.mov` files and converts them to `.m4a`.

Parameters:

- Optional positional folders: if omitted, scans the default inbox folders
- `--dry-run`: show planned conversions without running `ffmpeg`
- `--delete-originals`: remove the source file after a successful conversion
- `--overwrite`: overwrite existing `.m4a` outputs
- `--verbose`: print the underlying `ffmpeg` commands

Examples:

```bash
npm run transcode-audio
npm run transcode-audio -- --dry-run
npm run transcode-audio -- --overwrite --delete-originals
npm run transcode-audio -- "/Users/lailafrotjold/Documents/Radhe Kunj Kirtan/Inbox/Bhajans"
npm run transcode-audio -- "/Users/lailafrotjold/Documents/Radhe Kunj Kirtan/Inbox/Hari Katha" --verbose
```

Notes:

- Uses `node scripts/transcode-quicktime-audio.mjs`
- Requires `ffmpeg`
- Defaults to scanning:
  - `MM_INBOX_FOLDER`
  - `BHJ_INBOX_FOLDER`
  - `HK_INBOX_FOLDER`

### `npm run normalize-audio`

Normalizes audio from `Audioprocessing` folders and writes the finished files into the parent archive tree.

Behavior:

- Scans inside `Audioprocessing` subfolders
- Normalizes loudness with `ffmpeg` `loudnorm=I=-16:TP=-1.5:LRA=11`
- Converts `.mov`, `.qta`, `.mp4`, `.wav`, `.aif`, and `.aiff` to `.m4a`
- Keeps `.mp3` as `.mp3`
- Writes output outside the `Audioprocessing` folder

Parameters:

- Optional positional folders: if omitted, scans the default `Audioprocessing` folders
- `--dry-run`: show planned work without writing files
- `--overwrite`: overwrite existing outputs
- `--delete-originals`: remove the source file after a successful normalization
- `--verbose`: print the underlying `ffmpeg` commands

Examples:

```bash
npm run normalize-audio
npm run normalize-audio -- --dry-run
npm run normalize-audio -- --overwrite --delete-originals
npm run normalize-audio -- "/Users/lailafrotjold/Documents/Radhe Kunj Kirtan/Inbox/Bhajans/Audioprocessing"
npm run normalize-audio -- "/Users/lailafrotjold/Documents/Radhe Kunj Kirtan/Inbox/Maha Mantra/Audioprocessing" --verbose
```

Notes:

- Uses `node scripts/normalize-inbox-audio.mjs`
- Requires `ffmpeg`
- Defaults to scanning:
  - `MM_INBOX_FOLDER/Audioprocessing`
  - `BHJ_INBOX_FOLDER/Audioprocessing`
  - `HK_INBOX_FOLDER/Audioprocessing`

### `npm run ingest`

Reads rows from the metadata sheet and processes rows with status `NEW` or `UPDATE`.

Behavior:

- Looks up or creates lead singers, sangas, and tags in Supabase
- Uploads audio to R2
- Inserts or updates kirtan records
- Updates related audio and title records
- Moves ingested files from inbox folders into archive folders
- Triggers revalidation and cache warming when configured

Parameters:

- `--dry-run`: show intended uploads, DB writes, and file moves without executing them
- `--verbose`: print step-by-step progress

Examples:

```bash
npm run ingest
npm run ingest -- --dry-run
npm run ingest -- --verbose
npm run ingest -- --dry-run --verbose
```

Notes:

- Uses `node scripts/ingest-kirtans.mjs`
- Reads `.env.local`
- Requires:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_API_KEY`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- Common env defaults and paths:
  - `R2_BUCKET` default `kirtans`
  - `MEDIA_BASE_URL` default `https://media.kunjkirtan.com`
  - `REVALIDATE_BASE_URL`
  - `REVALIDATE_SECRET`
  - `SHEET_ID`
  - `SHEET_NAME` default `Metadata`
  - `SHEETS_SERVICE_ACCOUNT_FILE` default `secrets/sheets-service-account.json`
  - `MM_FOLDER`
  - `BHJ_FOLDER`
  - `HK_FOLDER`
  - `KIRTAN_INBOX_ROOT`
  - `MM_INBOX_FOLDER`
  - `BHJ_INBOX_FOLDER`
  - `HK_INBOX_FOLDER`

## Revalidation

### Revalidate caches

Sends a revalidation request to the app's revalidation endpoint.

Command:

```bash
curl -X POST -H "x-revalidate-secret: <secret>" "https://www.kunjkirtan.com/api/revalidate/<cacheTag>"
```

Example:

```bash
curl -X POST -H "x-revalidate-secret: $REVALIDATE_SECRET" "https://www.kunjkirtan.com/api/revalidate/home"
```

Parameters:

- `<secret>`: your revalidation secret
- `<cacheTag>`: either a grouped endpoint target or a direct cache tag

Supported endpoint targets:

- `home`
- `rare-gems`
- `explore`
- `all`

Direct cache tag targets:

- `home`
- `rare-gems`
- `explore-bhajans`
- `explore-maha-mantras`
- `explore-leads`
- `explore-leads-slugs`
- `explore-occasions`
- `explore-occasion-slugs`

Examples:

```bash
curl -X POST -H "x-revalidate-secret: $REVALIDATE_SECRET" "https://www.kunjkirtan.com/api/revalidate/home"
curl -X POST -H "x-revalidate-secret: $REVALIDATE_SECRET" "https://www.kunjkirtan.com/api/revalidate/rare-gems"
curl -X POST -H "x-revalidate-secret: $REVALIDATE_SECRET" "https://www.kunjkirtan.com/api/revalidate/explore"
curl -X POST -H "x-revalidate-secret: $REVALIDATE_SECRET" "https://www.kunjkirtan.com/api/revalidate/all"
curl -X POST -H "x-revalidate-secret: $REVALIDATE_SECRET" "https://www.kunjkirtan.com/api/revalidate/explore-leads-slugs"
curl -X POST -H "x-revalidate-secret: $REVALIDATE_SECRET" "https://www.kunjkirtan.com/api/revalidate/explore-bhajans"
```

Known cache tags used internally:

- `home`
- `rare-gems`
- `explore-bhajans`
- `explore-maha-mantras`
- `explore-leads`
- `explore-leads-slugs`
- `explore-occasions`
- `explore-occasion-slugs`

Target-to-tag mapping:

- `home` revalidates tag `home`
- `rare-gems` revalidates tag `rare-gems`
- `explore` revalidates tags `explore-bhajans`, `explore-maha-mantras`, `explore-leads`, `explore-leads-slugs`, `explore-occasions`, and `explore-occasion-slugs`
- `all` revalidates everything above

Relevant paths also revalidated by the endpoint:

- `home`: `/` and `/api/home`
- `explore`: `/explore/bhajans`, `/api/explore/bhajans`, `/explore/maha-mantras`, `/api/explore/maha-mantras`, `/explore/leads`, `/api/explore/leads`, `/explore/occasions`, `/api/explore/occasions`

Notes:

- Group targets like `explore` revalidate multiple tags and related paths.
- Direct tag targets revalidate only that single tag.

## Tip

When passing flags through `npm run`, use `--` before script arguments:

```bash
npm run normalize-audio -- --dry-run
npm run images:upload -- ~/Desktop/file.png --prefix=lead-singers
```
