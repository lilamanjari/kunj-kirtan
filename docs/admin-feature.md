# Homepage features

Open `/admin/feature` from the **Feature** menu. The page shows the feature that is live now and any upcoming schedules. New features use published Occasion tags; unpublished tags remain visible in the chooser with an explanation.

Choosing an Occasion fills in its name and description. These can be edited without changing the tag itself. Dates use the browser's time zone and are saved as UTC instants. A new period starts at the current minute and ends one calendar month later (clamped to the last day for short months).

The server owns the supported `home_current_vrata` slot and a sort order of 100. The form does not expose either field. Overlapping active periods are rejected; edit or end the existing feature before replacing it. Ending a feature disables it while preserving its database row.

After saving, the browser requests homepage invalidation, then cache warming in a separate request. Warming consumes the full English and Russian homepage responses. If the refresh fails, the saved feature remains visible and the operator can retry the refresh without creating another feature.

`REVALIDATE_BASE_URL` (or `NEXT_PUBLIC_SITE_URL`) can point to the public deployment when the CMS is running elsewhere. If neither is set, refresh uses the canonical public site URL from the app's SEO configuration. The public homepage is revalidated using the server-only `REVALIDATE_SECRET`, then warmed. Cache refresh warms public URLs rather than the CMS request host, which may be a private bind address. These settings are read from the server environment; the browser cannot choose the refresh destination or read the secret.

The featured Occasion is evaluated independently of the 24-hour music data cache. Public homepages revalidate every 60 seconds, so scheduled transitions are picked up on subsequent requests without a manual cache refresh. Already-open public tabs need to reload to receive a new server render.

Tests cover current/scheduled/ended boundaries, local month defaults, invalid dates, unpublished tags, overlapping periods, local and remote refresh requests, successful save/refresh/warm order, recoverable cache errors, and calendar interaction. No live feature needs to be published to run them.
