# Phases 2, 3 – Architecture

## Stack (and why)
- **Next.js (App Router) + TypeScript**: server rendering and static generation for SEO, fast Core Web Vitals.
- **Tailwind CSS**: design tokens from the logo (see design system).
- **PostgreSQL + Prisma**: relational bookings, CRM and content. Hosted on Neon or Supabase.
- **Auth.js (credentials + optional Google)** with role-based permissions; argon2 password hashing.
- **Zod** validation on every server action and API route; rate limiting via Upstash Redis.
- **Payments:** Stripe (deposit or full) behind a `PaymentProvider` interface, so Paymob / Fawry can be added. *Needs Stripe keys.*
- **Email:** Resend + React Email templates. *Needs API key and domain.*
- **WhatsApp:** click-to-chat with generated context now; WhatsApp Cloud API later. *Needs Meta business setup.*
- **Media:** Cloudinary or S3 + `next/image` (AVIF/WebP).
- **Analytics:** first-party `AnalyticsEvent` table plus GA4 / Plausible behind consent.
- **Hosting:** Vercel. Cron via Vercel Cron for the follow-up scheduler.
- **i18n:** `next-intl` with `/[locale]/` routing from day one; English shipped, Arabic ready. Translatable content stored in `*Translation` tables.

## Sitemap
```
/                                  Home
/tours                             All tours (filters, pagination, canonical rules)
/tours/[slug]                      Tour detail
/tours/day-tours | multi-day | private | family | honeymoon | group
/destinations                      Index
/destinations/[slug]               Cairo, Giza, Luxor, Aswan, Alexandria, Hurghada, Sharm El Sheikh, Dahab, Siwa
/destinations/[slug]/[tours-type]  e.g. cairo/private-tours (only when 3+ real tours exist)
/nile-cruises   /airport-transfers
/egypt-travel-guide                Pillar
/egypt-travel-guide/[slug]         Visa, weather, money, safety, SIM, itineraries (3/5/7/10/14 days)...
/blog  /blog/[slug]
/plan-my-trip                      Trip builder
/tools/egypt-trip-budget-calculator
/book/[tourSlug]  /checkout  /booking/confirmation/[ref]
/reviews  /about  /contact  /faq
/account  (trips, invoices, itinerary, pickup info, messages, documents, review)
/admin/*  (noindex)
/sitemap.xml  /robots.txt
```

## Customer journey and funnel
Discover → Inspire → Research → Compare → Ask → Book → Prepare → Travel → Support → Review → Return.

| Stage | Surface | Capture / next step |
|---|---|---|
| Discover | Google (guides, destination, tours) | Internal links to tours |
| Inspire | Guide, blog, destination | Itinerary lead magnet |
| Compare | Tour list + filters | Save / WhatsApp |
| Ask | WhatsApp contextual link, enquiry form | Lead created in CRM |
| Book | Booking flow, deposit | Booking + payment |
| Upsell | Add-ons in flow + post-booking | Transfers, photographer, dinner, cruise |
| Prepare | Emails, account | Itinerary, pickup info |
| Review | Post-trip email | Real review with photo |
| Return | Segmented emails | Repeat booking |

**Ethical revenue levers:** deposits, add-ons with clear prices, private upgrade, related tours, multi-day cross-sell, coupons, repeat-customer offer. No fake urgency.

## Database (Prisma, summary)
User(role) · StaffProfile · Customer · Lead(status, source, assignedTo, nextFollowUpAt, budget, interests) · LeadEvent · Message
Tour(status, pricingModel, seo) · TourTranslation · TourCategory · Destination · DestinationTranslation · TourDestination
TourAvailability(date, capacity, priceOverride) · TourOption · Upsell · CrossSell · Faq
Booking(ref, status, totals, currency, couponId, source) · BookingItem · Traveler(type adult/child/infant) · Payment(provider, status, type deposit/balance) · Refund
Review(status moderation, photos) · Coupon(type, value, limits, dates, tourIds, firstBookingOnly, usedCount) · CouponRedemption
FollowUp(type, channel, dueAt, status, templateKey) · EmailTemplate
BlogPost · Guide(cluster, pillarId) · Media · SeoMetadata · Navigation · HomepageSection
AnalyticsEvent(name, sessionId, userId?, tourId?, props JSON) · AbandonedCart · AuditLog

Key relations: Lead→Customer (converted) → Booking → BookingItem → Tour; Booking→Traveler; Booking→Payment; Tour↔Destination; Guide→Tour (recommended); FollowUp→Lead/Booking.

## Admin and roles
Roles: SUPER_ADMIN, MANAGER, SALES, CONTENT_EDITOR, TOUR_OPERATOR. Permission map per resource (read/write/publish/delete); every mutation writes an AuditLog row.
Modules: Dashboard (revenue, bookings, leads, conversion, AOV, top tours/destinations, sources, abandoned, today's pickups, follow-ups due) · Tours CRUD · Destinations · Guides/Blog · Bookings · Leads/CRM (pipeline: NEW → CONTACTED → QUALIFIED → QUOTE SENT → FOLLOW-UP → BOOKED → TRAVELING → COMPLETED → REPEAT CUSTOMER, plus LOST and ABANDONED) · Customers · Reviews moderation · Coupons · Upsells · Homepage/Navigation · Staff.

## Follow-up automation
Day 0 confirmation + WhatsApp link; Day 1 itinerary and relevant tours; Day 3 FAQ answers; Day 5 personal task for sales; pre-trip preparation; during-trip support message; post-trip review request; later seasonal ideas. Sent only with consent, with unsubscribe, and stops when the lead books or replies.

## SEO architecture
- Clean URLs, canonical tags, XML sitemap (split by type), robots.txt, breadcrumbs, `hreflang` ready.
- Schema: Organization, TravelAgency/LocalBusiness, TouristTrip/Product for tours, FAQPage, Article, BreadcrumbList. Review/AggregateRating only from real approved reviews.
- Topic clusters: Egypt Travel Guide pillar → Visa, Currency, Safety, Transport, Weather, Itineraries; Cairo hub → Pyramids, Giza, Saqqara, Islamic Cairo, Coptic Cairo, Khan el-Khalili, food, hotels, itinerary. Every guide links to relevant tours; every tour links back to its destination and guides.
- Programmatic pages ("Egypt tours from [country]") only with unique data (flights, visa rules, currency, seasonal tips) and a minimum-content gate; otherwise `noindex`.
- Filtered tour URLs: canonical to `/tours`, curated combinations get their own indexable pages.

## Build plan
1. Scaffold Next.js, Tailwind tokens, Prisma schema, seed data (clearly marked demo tours).
2. Public site: home, tours list with real filters, tour detail, destinations, guides.
3. Booking: live price calculator, travelers, add-ons, coupons, deposit, confirmation. Payments use a mock provider until Stripe keys exist.
4. Admin + CRM with auth and roles.
5. SEO infrastructure and schema.
6. Analytics events and abandoned-booking recovery.
7. Tests (unit for pricing, e2e for booking and admin) and a launch checklist.

## Risks and decisions
- **Content honesty:** seed tours and prices are placeholders. Egypt Knight must supply real tours, prices, licence details and contact info.
- **Payments in Egypt:** Stripe availability for an Egypt-registered company may need a foreign entity; Paymob is the local fallback.
- **Scope:** this is large; build ships in vertical slices so each phase is usable.
- **Email/WhatsApp compliance:** consent capture and unsubscribe are mandatory.
