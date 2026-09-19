# Egypt Knight Tours

Booking platform, CRM and SEO publication for Egypt Knight Tours.
TRAFFIC → TRUST → ENGAGEMENT → LEAD → BOOKING → UPSELL → GREAT EXPERIENCE → REVIEW → REPEAT.

## Run it
```bash
npm install
cp .env.example .env        # set AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, WhatsApp number
npm run db:setup            # creates the SQLite DB and seeds demo content + admin user
npm run dev                 # http://localhost:3000   admin: /admin/login
npm test                    # pricing engine tests
```
Production: set `DATABASE_URL` (Turso `libsql://…`) and `DATABASE_AUTH_TOKEN`, a strong `AUTH_SECRET`, and deploy on Vercel.

## What works today
- Public site: home, tours with real filters and sorting, tour detail (itinerary, inclusions, FAQ, related tours, sticky mobile CTA), destinations, travel guide, trip builder, contact, FAQ.
- Booking: date, adults/children/infants, private/shared, add-ons, coupon, deposit/full/pay-later, live server-side price quote, booking saved with customer, travelers, payment record and a CRM lead.
- CRM: leads from trip builder, contact form and bookings; statuses, notes, next follow-up, WhatsApp link, follow-up schedule created (consent-aware).
- Admin (role-based, audit-logged): dashboard (revenue, bookings, leads, conversion, AOV, top tours/destinations, sources, upcoming trips, first-party funnel), tours CRUD, bookings status, leads pipeline.
- SEO: metadata, canonical URLs, sitemap.xml, robots.txt, JSON-LD (TravelAgency, TouristTrip, FAQPage, Article, BreadcrumbList; AggregateRating only from approved real reviews).
- Security: Zod validation server-side, bcrypt, signed httpOnly session cookie, rate limits, honeypot, server-enforced permissions.

## Needs external accounts (not faked)
See `docs/04-build-status.md`.

## Docs
`docs/01-research.md` · `docs/02-architecture.md` · `docs/03-design-system.md` · `docs/04-build-status.md`
