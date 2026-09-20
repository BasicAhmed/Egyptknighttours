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
- The site is read-heavy and cached, and can serve large traffic on Vercel without changes.
- If orders grow into tens of thousands, keep the database and functions in the same region, and export old orders to archive.
- Uploaded website photos live in the database (resized to about 200 KB). For very large photo libraries, move them to object storage (Vercel Blob or S3).
- Add error monitoring (for example Sentry) and uptime monitoring on `/api/health` for early warnings.

## Quality gates
To turn on automatic checks, in GitHub create the file `.github/workflows/ci.yml` and paste in `docs/ci-workflow.yml` (GitHub blocks tokens from creating workflow files, so it has to be added through the website or a normal login).

Once enabled, every push runs type checking, tests, a dependency audit, a build and a crawl of key pages (`scripts/smoke.mjs`) in GitHub Actions.
