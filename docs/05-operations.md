# Operations guide

Built and maintained by **Nino Techy**.

## Daily / weekly
- Check **Settings → System status**. Anything marked "Fix now" needs attention.
- Reply to new inquiries (Admin → Inquiries) and check orders that are awaiting payment.

## Monthly
- Download CSV backups (System status → Your data). Turso also keeps point-in-time backups.
- Read Vercel's deployment and function logs for errors.
- Run `npm audit` and update dependencies (CI blocks high-severity issues).
- Review Google Search Console for coverage errors and search queries.

## Backups and recovery
- **Database:** Turso automatic backups and point-in-time restore. Restore into a new database, then point `DATABASE_URL` at it.
- **Passport files** are inside the database and encrypted. Keep `FILE_ENCRYPTION_KEY` (or `AUTH_SECRET` if no dedicated key) safe. Without it, files cannot be read.
- **CSV exports** of orders, customers and inquiries never contain passport data.

## Secrets
Rotate `AUTH_SECRET` and the admin password if a staff member leaves. Changing `AUTH_SECRET` signs everyone out. It also changes the passport key unless `FILE_ENCRYPTION_KEY` is set, so set that first.

## Nightly maintenance
`/api/cron/maintenance` runs at 03:17 UTC (needs `CRON_SECRET`). It prunes rate-limit and old analytics rows, and, if enabled in Settings, deletes passport files and numbers a set number of days after each trip.

## Adding content
- **Tours:** Admin → Tours, or Itineraries → "Add as a tour on the website".
- **Photos:** upload from your phone or computer wherever you see "Upload photo". Destination photos: Tours → Destinations.
- **Guides:** written in `src/db/content-v3.ts` (simple markdown-style format). Add a new guide and a new content version.
- **Reviews:** Settings → Reviews.

## Scaling notes
**How traffic is handled.** Public pages (home, tours, destinations, guides, landing pages, legal pages) are sent with `Cache-Control: s-maxage=120, stale-while-revalidate=600`. Vercel's CDN keeps each finished page for 2 minutes and refreshes it in the background, so a traffic spike is served from the CDN, not by rendering the page again for every visitor. Private pages (booking tracker, booking flow, admin, API) are never cached.

**What we measured (September 2026, one CPU core, local).** Rendering a page on the server costs roughly 15 to 35 ms of CPU (home about 30 ms). That is the real limit when nothing is cached: 100 simultaneous visitors straight at one server gave about 30 pages per second and timeouts. Behind a cache that follows the same headers, the same test gave about 700 to 1,700 pages per second with no errors, and only 302 of 44,000 requests reached the server. These are simulation figures, not Vercel benchmarks. Re-test on the live site (for example with `npx autocannon`) before a big campaign.

**Freshness.** After you edit a tour, destination, review or setting, the change is visible to everyone within about 2 minutes (up to 12 in the worst case, while the CDN refreshes). Staff inside the admin always see live data.

**Ways to go further if needed**
- Shrink the homepage: it renders a lot of markup. Uploading real photos in place of illustrations helps.
- Keep the database and functions in the same region (`vercel.json` uses `dub1`).
- If orders grow into tens of thousands, export old orders to archive.
- Uploaded website photos live in the database (resized to about 200 KB). For a very large photo library, move them to object storage (Vercel Blob or S3).
- Add error monitoring (for example Sentry) and uptime monitoring on `/api/health`.

## Quality gates
To turn on automatic checks, in GitHub create the file `.github/workflows/ci.yml` and paste in `docs/ci-workflow.yml` (GitHub blocks tokens from creating workflow files, so it has to be added through the website or a normal login).

Once enabled, every push runs type checking, tests, a dependency audit, a build and a crawl of key pages (`scripts/smoke.mjs`) in GitHub Actions.
