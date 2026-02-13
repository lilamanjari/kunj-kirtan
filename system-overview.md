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

### v1 Status (February 11, 2026)

- Explore pages: Maha Mantras, Bhajans, Lead Singers, Occasions
- Duration support in UI and API responses
- Infinite scroll on Maha Mantras with server-side filters
- Autocomplete for lead singer search
- Audio player bar with progress + active item states

Known gaps:
- Occasions query is multi-step (no view yet)
- Test runner defaults to watch mode (use run mode for CI)
