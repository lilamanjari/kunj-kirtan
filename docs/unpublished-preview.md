# Unpublished kirtan previews

Set `UNPUBLISHED_PREVIEW_SECRET` in the server environment to enable preview mode. Use a long random value and open the home page with `#unpublished-preview` at the end of the URL to show the passphrase field. The server exchanges it for a signed, HTTP-only, same-site cookie that lasts 30 days. After unlocking, the rail is available on the home page without the fragment. Use **Lock previews** to clear that browser's access; changing the environment secret invalidates existing cookies.

The home rail reads unpublished kirtans through `/api/preview/unpublished`. That route uses the server-side Supabase service role, requires the preview cookie, and sends `private, no-store` responses. Public kirtan views already filter to `published = true`, so unpublished recordings remain out of the public home data, browsing endpoints, search and feeds. Their audio URLs remain directly accessible, as intended.

Favorites, queue entries, listening history and last-playback state are saved in the user's browser by the existing client storage. Private preview entries are hidden from those client experiences while preview mode is locked. The current app has a playback queue but no named playlists; the preview rail supports the queue and favorites.
