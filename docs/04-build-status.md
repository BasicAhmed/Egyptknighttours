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
- Not yet: automatic emails (needs Resend), online card payment (needs Stripe/Paymob), Arabic PDFs (fonts are Latin only).

## Staff panel (rebuilt for speed and simplicity)
- One **Orders** workspace: filter tabs (To do, Awaiting payment, Confirmed, Completed, All, Cancelled), search, and a single "next step" button per order. Tapping an order opens a modal with contact buttons, payment, invoice, itinerary and notes.
- **+ New order** for customers who book by WhatsApp or phone, including custom experiences.
- Sections: Orders, Inquiries (modal), Tours, Itineraries, Reports, Settings (tabs). Sidebar on desktop, bottom tabs on phones.
- Speed: the server region is set next to the database (`vercel.json`, Dublin), pages run their queries in parallel, and the order modal loads in one round trip and opens instantly from a cache.

## Import itineraries from PDF
- `/admin/itineraries` has **Import from PDF**: select one or many text PDFs (up to 4 MB each). Each becomes an editable itinerary or template with the title, intro, days, timeline items, included/excluded lists, price and payment terms, plus a fresh headline and hook for every day.
- It is rule-based (looks for lines like "Day 1: Cairo", "The price includes"). Layouts that differ a lot may need review in the editor. Scanned PDFs (images only) aren't supported.

## Documents: invoices, itineraries, PDFs (built and tested in a browser)
- Branded PDFs (same fonts, colours and logo as the site) generated on the server. Invoice: "almost confirmed" hero, total due and deadline, clickable pay button, price breakdown, How to Pay, terms, cancellation. Itinerary: cover, overview, one magazine page per day, included/excluded, closing call to action.
- Bank details and payment methods are edited in `/admin/settings` and stored in the database only. New PDFs use the latest details; old PDFs keep the details they were issued with.
- Booking page (`/admin/bookings/[id]`): Documents section with preview, download, email, resend, WhatsApp link, mark as sent, history; record partial or full payments (status moves to Partially paid, then Paid / confirmed); invoice generation moves the booking to "Invoiced, awaiting payment" unless another status is chosen.
- Itinerary builder (`/admin/itineraries`): days and timeline blocks, reorder, duplicate, headlines and hooks, templates (two seeded), save as template, attach to a booking.
- Customers see documents you marked or emailed as sent on their booking tracker, via signed links.
- Email sending needs `RESEND_API_KEY` and `EMAIL_FROM`. Without them nothing is sent and the admin says so.

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
