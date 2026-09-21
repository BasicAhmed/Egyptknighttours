# Moving Egypt Knight Tours from WordPress (cPanel) to the new platform

Goal: switch websites **without losing Google rankings, bookings or email**. Everything below is ordered so nothing goes live until it has been checked.

## What we saw on the current site (September 2026)
WordPress with a tour plugin, addresses like `/tours/<name>/`, `/tour-destination/<place>/`, `/tour-activities/cruises-sailing/`, `/custom-pacakage/` (sic), `/cars/...` and a French copy under `/fr/`. About 53 Egypt tours plus Morocco, Qatar and UAE categories.

## The tools built for this move
| Tool | Where | What it does |
|---|---|---|
| Tour import | Admin > Tours > Import CSV | Creates tours as **drafts** from a spreadsheet, copies photos from the old site, creates missing destinations |
| New destination | Admin > Destinations > + New destination | For Marsa Alam, Sharm El Sheikh, Siwa and others |
| Redirects | Admin > Settings > Redirects | Old address to new page (301). Paste hundreds at once. Includes a test box |
| Built-in rules | automatic | `/tour-destination/*`, `/tour-activities/*`, `/custom-pacakage`, `/cart`, `/fr/*` and more |
| Migration checker | `npm run check-migration -- --base https://new-site --file old-urls.txt` | Lists every old address that would 404 |

## Phase 0: protect what you have (before touching anything)
1. **Full backup of the old site:** in cPanel use Backup Wizard (home directory and databases) and download it. Also export WordPress content (Tools > Export).
2. **Do not cancel the cPanel hosting.** Keep it 60 days. It probably also holds your email, and it is your rollback.
3. **Search Console:** make sure `egyptknight.com` is verified as a **Domain property**. Export Performance > Pages for the last 16 months. These are your money pages.
4. **Collect every old address:** open `https://egyptknight.com/sitemap_index.xml` (or the sitemap your SEO plugin makes), plus the Search Console export. Put them in `old-urls.txt`, one per line.

## Phase 1: content (2 to 5 days)
1. **Tours.** Build a spreadsheet using the template (Admin > Tours > Import CSV > Download the template). Put the **old slug** in the `slug` column so tour addresses stay identical.
   Copy the old page's title and description text into `short_description` and `description`. Import in batches of up to 40.
   Start with the 15 tours that earn the most traffic and bookings, then the rest.
2. **Check every draft** (photo, price, itinerary, included, dates), then publish.
3. **Destinations:** create the ones the old site had (Marsa Alam, Sharm El Sheikh, Siwa, Dahab and so on) and upload a photo for each.
4. **Reviews:** paste your best Tripadvisor reviews into Settings > Reviews (copy them exactly). The Tripadvisor link is already set.
5. **Company details:** licence, address, bank details, guides (Settings), and real photos for the homepage and destinations.

## Phase 2: redirects (1 day)
1. Run the checker against the **staging address** of the new site (Vercel gives you a `.vercel.app` address before you switch the domain):
   `npm run check-migration -- --base https://your-project.vercel.app --file old-urls.txt`
2. For every `MISSING` line, decide the best new page and add it in Settings > Redirects (paste as `old-address new-address`).
   Send each old page to the **closest match**, not always to the homepage. Google treats irrelevant redirects like errors.
3. Run the checker again until nothing is `MISSING`. Review `GENERAL PAGE` lines: they are acceptable only for pages with no real equivalent.
4. **French pages (`/fr/`):** the new site is English only for now, so they redirect to the English page. If French brings you traffic, plan a French version before or soon after launch.
5. **Morocco, Qatar, UAE and car-rental pages:** either add them as destinations and tours, or redirect to `/tours`. Decide before launch.

## Phase 3: SEO parity check
- Top 20 pages: same or better title, description and main heading. Keep the important words from the old titles.
- Every tour has one photo at least, a price, and its itinerary (search engines reward complete pages).
- Run `npm run smoke` against the staging site. Run Google's Rich Results Test on a tour and the homepage.
- The new sitemap is `/sitemap.xml` and robots.txt is ready. Nothing else to configure.

## Phase 4: switching the domain (cPanel specifics)
Choose a quiet day. Expect **5 to 60 minutes** of mixed old and new site while DNS updates.
1. **48 hours before:** in cPanel Zone Editor (or wherever your DNS is managed) lower the TTL of the `@` and `www` records to 300 seconds.
2. In **Vercel**: Project > Settings > Domains > add `egyptknight.com` and `www.egyptknight.com`. Vercel shows the exact DNS values to use (normally an **A record** for `@` and a **CNAME** for `www`).
3. In the DNS zone change **only** the `@` (A) and `www` records to those values.
   **Do not change MX records, `mail.` records or the email-related TXT records.** That would break your email.
4. Wait for Vercel to show the domain as valid (the certificate is automatic). Open the site and run `npm run smoke` and the migration checker against `https://egyptknight.com`.
5. **Email sending from the new system** (Resend): add the DKIM records Resend gives you. If your domain already has an SPF record, **merge** Resend into it instead of adding a second one. The simplest safe option is to send from `bookings.egyptknight.com` (a subdomain).
6. **Rollback:** put the old A record back. That is why the old hosting stays alive.

## Phase 5: after launch
- **Day 0:** Search Console > Sitemaps > submit `https://egyptknight.com/sitemap.xml`. Use URL Inspection on the homepage and your top 5 tours and request indexing.
- **Days 1 to 14:** check Pages (indexing) and Crawl stats every day. Fix any 404 with a redirect.
- **Weeks 1 to 6:** rankings often move up and down while Google re-reads the site. Compare your top 20 pages weekly to the Search Console export from Phase 0. A few weeks of movement is normal. A page that vanishes usually means a missing redirect.
- **Week 4:** add new guides, real photos and reviews. This is where the new platform pulls ahead.
- **Day 60:** if everything is stable, cancel or downgrade the old hosting (keep email if it lives there).

## Things that do not move automatically
French version, Morocco/Qatar/UAE tours, car-rental listings, the shopping cart, the Trustindex review widget, WordPress forms and any blog posts. Decide for each: rebuild, redirect, or retire.

## Launch-day checklist
- [ ] Backups downloaded (files, database, WordPress export)
- [ ] Search Console Domain property verified, old pages exported
- [ ] Top tours imported, checked and published, with photos and prices
- [ ] Redirects added and the checker shows nothing `MISSING`
- [ ] Bank details, licence, reviews, guides, map location set
- [ ] TTL lowered 48 hours earlier
- [ ] DNS changed for `@` and `www` only; MX and mail records untouched
- [ ] `npm run smoke` passes on the live domain
- [ ] Test booking made end to end, and emails received
- [ ] Sitemap submitted; old hosting kept for 60 days
