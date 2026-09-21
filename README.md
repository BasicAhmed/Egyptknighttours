# Egypt Knight Tours

Website, booking platform, CRM and staff operations system for **Egypt Knight Tours**.
**Designed, built and maintained by Nino Techy.**

## What it does
- **Public website:** homepage, tours, destinations, Egypt travel guides in topic clusters, keyword landing pages, reviews, video, map, legal pages.
- **Booking:** 4-step wizard with live pricing, 50% deposit, coupons, nationality, booking tracker for customers.
- **Staff panel (`/admin`):** orders, inquiries (CRM), tours, destinations, itineraries (import from PDF, publish as a tour), invoices and itinerary PDFs, travelers and encrypted passport uploads, tour guides, reviews, settings, system status, CSV exports.
- **SEO:** structured data, sitemap, canonical URLs, keyword-focused pages, fast loading, accessible design.

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind CSS · Drizzle ORM + libSQL (Turso) · `@react-pdf/renderer` · Resend (email) · deployed on Vercel.

## Quick start
```bash
cp .env.example .env      # then edit it
npm install
npm run dev               # http://localhost:3000
```
The database creates and updates itself on first request. Sample content is added to an empty database.

## Commands
| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm test` | Unit tests (pricing, encryption, guides, content links) |
| `npx tsc --noEmit` | Type check |
| `npm run build` / `npm start` | Production build and server |
| `npm run smoke` | Crawl a running site for SEO, security and branding problems |
| `npm run db:sql` | Regenerate the migration after changing `src/db/schema.ts` |

## Deploying (Vercel + Turso)
1. Create a Turso database near your Vercel region (`vercel.json` uses `dub1`, Dublin).
2. In Vercel, add the environment variables from `.env.example`.
3. Push to `main`. Vercel builds and deploys. The database updates itself.
4. Open `/admin`, then **Settings → System status** and clear the checklist.

## Environment variables
See `.env.example`. Required: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`. Recommended: `FILE_ENCRYPTION_KEY`, `CRON_SECRET`.

## Security
- Staff sessions are signed, HTTP-only cookies; passwords are bcrypt-hashed; login and lookups are rate limited across all servers.
- Passport scans and numbers are encrypted (AES-256-GCM) before storage; access is staff-only and logged.
- Strict security headers (CSP, HSTS, frame and MIME protections); admin and API routes are `noindex`.
- Dependencies are audited in CI on every change.

## Scalability
- Public pages are CDN-cacheable (2 minutes, refreshed in the background); personal pages and the admin are never cached.
- Database reads for the public site are cached and cleared instantly when staff edit content; images are cached for a year and served in responsive sizes.
- Database indexes on every frequently filtered column; a nightly job prunes old logs.
- Startup does one small read once the schema is current.
- Measured figures and limits are in `docs/05-operations.md`.

See `docs/` for the full operations guide. To enable the automatic checks (type check, tests, audit, build, smoke test on every push), add `docs/ci-workflow.yml` as `.github/workflows/ci.yml`.

---
Built by **Nino Techy**.
