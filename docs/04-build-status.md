# Build status

All demo tours, prices, destination text and guides in the seed are **placeholders**. Replace them in `/admin` before launch.

## Built and tested
- Pricing engine (11 unit tests): per-person / per-group, child %, infants free, private upgrade, add-ons, percent/fixed coupons with minimums, deposit/full/pay-later.
- Booking API: server recalculates price, validates dates, capacity, coupon rules (expiry, max uses, first-booking-only), pay-later window.
- Lead API: honeypot, rate limit, consent-aware follow-up schedule.
- Admin login, dashboard, tour create (verified end to end: appears on site, listing and sitemap), leads and bookings pages.

## Booking wizard and tracking (built and tested in a browser)
- `/book/[slug]`: 4-step checkout (trip and calendar, extras and coupon, details and pickup, review and payment choice) with sticky order summary and a mobile action bar.
- Booking IDs look like `EK-XXXXXX`. The thank-you page (`/booking/confirmation/EK-…`) and tracker (`/track`) open by signed link, or by ID + email lookup (rate limited).
- Tracker shows a status timeline driven by admin status changes, payment progress, and an "Add to calendar" (.ics) download.
- Checkout details entered but not finished create one CRM "abandoned" lead (no automated messages); it turns into the booked lead if they finish.
- Not yet: confirmation emails (needs Resend), online card payment (needs Stripe/Paymob).

## Needs external services (not connected yet)
| Feature | Needs |
|---|---|
| Card payments and deposits | Stripe or Paymob keys. Payments are stored as `MANUAL` / `PENDING` and staff send a link. |
| Emails and follow-up sending | Resend key and verified domain. `follow_ups` rows are scheduled but nothing sends yet. |
| WhatsApp automation | Meta WhatsApp Cloud API. Click-to-chat with context already works. |
| Images | Cloud storage (Cloudinary/S3). Cards use gradient placeholders. |
| Traffic and SEO performance | Google Analytics and Search Console. |
| Real reviews | None shown until real customers submit. Submission and moderation UI is next. |

## Not built yet (next)
1. Review submission and moderation, customer account portal.
2. Destination/guide/blog/coupon/upsell admin editors (data model exists).
3. Follow-up sender (Vercel Cron + Resend templates), abandoned-booking capture at checkout.
4. Arabic locale routing, budget calculator, Nile cruise and transfers landing pages.
5. Browser end-to-end tests and a Lighthouse pass.
6. Real company details in footer and schema (licence number, address, phone).

## Known limits
- Availability is date-only (no per-date capacity yet).
- Rate limiting is in-memory (single instance); move to Redis for multi-instance deploys.
- The `@` import alias needed an explicit webpack alias in `next.config.mjs` in this environment.
