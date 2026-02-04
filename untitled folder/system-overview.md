## Kirtan Oasis – System Overview

### Core Entities

- kirtans
- lead_singers
- audio_files (append-only, one current)
- tags

### Invariants

- One current audio per kirtan
- Audio URLs always from Supabase Storage
- Drive is source-only, never served

### Views

- playable_kirtans
- kirtan_tag_slugs

### Ingest Flow

Drive → Sheet (READY) → Apps Script → Storage → DB → View

### Frontend Contract

- Home API returns KirtanSummary
- Audio player consumes Supabase public URLs
