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

## Ease of use and accessibility (audited with axe: 0 violations on 42 customer and admin screens, desktop and phone)
- **Customer:** floating WhatsApp help button (hidden where a page has its own booking bar), skip link and a clear keyboard focus ring on every page, booking steps announced to screen readers.
- **Admin:** windows trap keyboard focus and give it back when closed; order tabs keep what you typed and warn before closing with unsaved changes; live "waiting" counts on the menu (new orders, new inquiries); orders and inquiries refresh by themselves every 45 seconds when idle (never while typing or with a window open); copy buttons for the booking ID and customer link; skip link; readable credit on phones; fixed heading order and two unlabeled settings fields.

## Pricing and finance (owner/manager only)
- **Cost-based tour pricing** (Tours, edit a tour): a toggle between a manual price and Cost + profit %. In the second mode, staff enter the cost of running the trip and a profit percentage; the price shown to customers is always calculated on the server (cost × (1 + margin/100)), never trusted from the browser, and shown live as a preview while typing. Content editors and sales staff still see and use the plain price field, and can never see, edit, or accidentally blank out the cost or margin — the server strips those fields from their saves.
- **Custom, one-off itineraries** (Orders > + New order): the same Manual / Cost + profit % choice is available when staff create a custom order for a specific customer that never becomes a public tour. Available to anyone who can create orders (Super Admin, Manager, Sales, Tour operator), since this is a private quoting tool for that one booking, not a change to a published price.
- **Cost snapshot per booking**: each booking stores the tour's cost at the moment it was booked, so editing a tour's cost or margin later never changes the profit already recorded for past bookings.
- **Finance page** (`/admin/finance`, Super Admin/Manager only): a month picker, revenue/cost/profit/margin for the month on a cash basis (a payment counts in the month it was recorded as paid; each payment carries its proportional share of that booking's cost), a per-tour breakdown, and a flag for bookings with no cost recorded. A matching branded PDF can be downloaded for any month.

## Cost + profit % pricing on the itinerary itself
Every itinerary (not just tours or custom orders) can carry its own cost and profit margin, since the same trip can genuinely cost differently for different guests. In the editor's "Closing page" section, a Price settings panel lets staff enter the true cost and a margin; the price shown to the guest is calculated on the server, the same tamper-proof way as tours and custom orders. Saving it:
- writes the calculated price into the itinerary PDF's price line automatically ("$520 for this trip"),
- and, when the itinerary is linked to a customer's order, updates that order's total and cost snapshot to match, so the invoice and the Finance page stay in sync.
Leaving both fields blank keeps the old free-text price line, unchanged.

## Fixed: track links always said "That link isn't valid"
Found the real cause: the tracking page requires a signed token in the link (?t=...) to open a booking directly — without one, it always shows "That link isn't valid," by design, so a stolen link alone can't be used to look up a booking. Three places were building track links without that token at all, so they were broken 100% of the time: the "Customer view" button, the "Copy customer link" button, and the welcome message's tracking link. The customer's own confirmation email was already correct and unaffected.

Fixed all three, and made "Customer view" reuse the same already-correct signed link instead of building its own. Verified for real: created a booking, pulled the link from all three places, confirmed each one now includes the token, and actually opened one — the real booking loads correctly instead of the error page.

## Fixed: links could still show a .vercel.app address instead of egyptknight.com
Found the real cause: every link the site generates (tracker links, invoices, the welcome message, guide sheets) was built to match whatever address the request came in on — deliberately, so things worked correctly during the period before egyptknight.com was live and only the Vercel address existed. That rule explicitly still trusted any *.vercel.app address, on purpose, for that transition period.

Now that egyptknight.com is confirmed live, that's the wrong behavior: if the admin is ever opened through an old Vercel URL (an old bookmark, a Vercel dashboard preview link), every link generated in that session would still carry the Vercel address into a customer's email or WhatsApp message.

Fixed at the source, in the one function every link in the whole site goes through: it now only ever uses egyptknight.com (or localhost, for local testing) — a Vercel address is no longer treated as trustworthy, exactly like a forged address would be. Checked the rest of the project too — the sitemap, robots.txt, and page metadata were already correctly wired to the real domain; this was the one place that wasn't.

Verified for real: sent a request with a spoofed egyptknighttours-abc123.vercel.app address, both creating a booking and opening it in admin, and confirmed the generated links used the real domain, not the Vercel one, either way.

## Welcome message action on the order window
A new "Welcome" section on every order (next to WhatsApp/Call/Email) — Copy or send a ready-made WhatsApp welcome message, prefilled and personal:
- Greets the lead traveler by first name, signed with your name from Settings → Company info → Signature name (e.g. "I'm Nada from Egypt Knight Tours").
- Lists the booking: lead traveler, traveler count, booking ref, tour name.
- A link to track the booking and find documents.
- Up to 2 relevant travel guides for that tour's destination, and up to 2 other tours in the same destination as a soft upsell — both pulled live from real published content, not hardcoded.
- Closes by asking for arrival details, same as the original.

Tested against a real booking on a real tour (Giza Pyramids): correctly recommended the actual "Egypt Pyramids Guide" and the actual "Grand Egyptian Museum and Pyramids" tour, both live links. Tested a custom/one-off booking too, to confirm it still works when there's no exact destination match. Both the Copy and Send-via-WhatsApp buttons checked and confirmed to carry the identical message.

## Bug fix: non-USD payments were counted at face value in Finance and Reports
A real, serious bug: a 30,000 EGP payment was being added into Finance and Reports as if it were $30,000 — no currency conversion happened anywhere. Verified the exact scenario end to end before fixing: a 30,000 EGP corporate request showed as $30,000 revenue.

Fixed at the root: every dollar figure in Finance and Reports is now converted to USD, using exchange rates you can see and edit in Settings → Company info → Exchange rates (seeded with today's approximate rates for EUR, GBP, EGP, AED, SAR). Confirmed against real data: that same 30,000 EGP payment now correctly shows as $582 (30,000 × today's ~0.0194 EGP rate), a $500 USD booking stays exactly $500 as it should, and the two combine correctly to $1,082 — checked on both Finance and Reports, and on both bookings and corporate requests.

One honest limitation: this uses today's rate for every past payment, not the rate on the day each one was actually received. Rates move day to day, so older converted figures will drift slightly as the rate changes — good enough for a clear overall picture, but worth knowing if you're reconciling to the cent.

## Corporate requests: custom service names, two pricing models
Two changes to how corporate request services and pricing work:

**Custom services**: the service type field is now a single combobox — pick one of the usual options (Transfer, Tour guide, etc.) or just type your own directly, no need to select "Other" first. Tested with a genuinely custom name ("Camel ride at sunset") end to end.

**Two pricing models, chosen per request**: alongside the original "price each service" flow, a request can now use "fixed percentage on the total" instead — enter each service's cost only, and one service-fee percentage sets the price automatically. Confirmed with real numbers: two services costing $100 and $50 (total $150), a 20% service fee, correctly worked out to $180 total and $30 profit. The invoice reflects this too: in percentage mode it lists what's included without a price per line, then shows Subtotal → Service (X%) → Total — confirmed in the actual downloaded PDF: "Subtotal $150 · Service (20%) $30 · Total $180" — with cost and profit correctly never appearing on the client-facing document either way.

## Admin notification system, properly integrated and properly logged
Reused the existing email infrastructure rather than building a second one: every notification now flows through one function that sends the email AND logs the attempt (success or failure, with the real error message) to a new table, visible on System status under "Recent notifications." Confirmed the failure path works for real, not just in theory — with a deliberately invalid email key, a notification genuinely failed and the exact provider error ("Email provider returned 403") showed up correctly logged and visible on screen.

Four new triggers, each tested against real data:
- **New order created directly in the admin** (not just the public website) now also alerts staff — previously silent.
- **A booking or corporate request reaching fully paid** — confirmed a partial payment does NOT trigger it, and the payment that completes it does, exactly once.
- **A booking or corporate request being cancelled** — the email explicitly flags it if money was already paid, since that's a possible refund to sort out. Confirmed a repeat cancel doesn't re-fire the notification.
- The existing post-trip review invite email also now goes through the same logger, instead of being invisible if it failed.

On the brief's other two asks — "refund" and "new customer registration" — neither is a real concept in this system today (there's no refund tracking, and customers aren't separate accounts), so nothing was invented for them. Cancellation-with-prior-payment is the closest honest equivalent already built.

A full line-by-line audit of every feature wasn't realistic in one pass, so this focused on the one concrete, well-defined ask (notifications) plus a few high-value spot checks rather than a superficial pass over everything. One genuine check worth recording: verified empirically, not just in the schema, that deleting a corporate request correctly removes its services and payments together — no orphaned rows left behind.

## Corporate requests: payments, finance, contact actions, search
Four additions to the Corporate Requests flow:
- **Finance integration**: corporate revenue, cost and profit now flow into the main Finance KPIs (combined with bookings) and into their own "Corporate requests" breakdown table — on the Finance page and in the downloadable PDF report. Verified end to end: a real $150 request with $100 cost showed up correctly as $150/$100/$50 in both places.
- **Payment recording**: each request now has its own Payment section - record an amount, see paid vs. balance, a running history, "Paid in full" once settled - exactly mirroring how customer orders already work. Cost stays hidden from non-finance roles; the price/paid/balance figures stay visible, since anyone handling the request needs to see them.
- **Contact actions**: WhatsApp, Call and Email now appear on each request, targeting the requesting company's own contact details.
- **Search and filter**: the request list is now a live-filtering view (search by company/ref/customer, filter by status) matching the Orders list.

Found and fixed a real bug before any of this could even build: the new search/filter component is client-side, but it imported from the same file as the server-only database code, which would have broken the production build entirely. Fixed by splitting the plain labels (usable by both client and server code) into their own file, separate from the database functions - and confirmed with a full `npm run build`, not just the faster type-check, since that's what actually caught it.

## Fixed: mobile bottom nav was crushed and overlapping
With 9 sections now (Orders through Settings), the phone bottom nav was cramming all 9 into equal-width columns, so labels like "Itineraries" and "Reports" visually overlapped. Fixed with a "More" pattern: the phone nav now shows the 4 most-used sections (Orders, Inquiries, Tours, Itineraries) plus a More button; tapping it opens a small grid with the rest (Reports, Finance, Referrals, Corporate, Staff, Settings), dismissible by tapping an item, tapping the backdrop, or navigating. More lights up gold whenever the current page is one of the items behind it. Adapts automatically to how many sections a role can actually see, so it won't need revisiting the next time a section is added.

## Corporate / other-company requests — a separate request type
A new, entirely separate flow at Admin > Corporate, for services arranged for other companies and travel agencies rather than direct customers. Its own two database tables, never touching bookings, so the existing Order flow works exactly as it did before (verified with a real public booking end to end).

Each request holds the requesting company's details, the end customer if known, and multiple services (Transfer, Entrance tickets, Permits, Felucca, Motor/boat, Tour guide, Hotel, Nile cruise, Airport services, Transportation, Other) — each with its own date, location, supplier, cost and selling price. Cost and profit are hidden from non-finance roles, the same as Tours and Orders. Totals (cost, price charged, profit) are calculated automatically across all services on the request, and a branded, professional invoice can be generated and downloaded directly from the request — itemized by service, with the total, never showing cost or profit.

Two real bugs found and fixed while testing against the spec's own example data:
- The request list showed "0 services · $0" for every request, even ones with real money on them. The cause: a correlated subquery compared each request's id against the wrong table's id column (both tables have one named "id"), so it silently matched nothing. Fixed by qualifying the table name explicitly.
- Removing a service silently did nothing. The cause: the delete button's form was nested inside the edit form, which is invalid HTML — browsers drop the inner form, so the button was submitting the outer (edit) form instead. Fixed by moving it out as a sibling.

## Booking sources: Website, WhatsApp, Email, Phone, Viator
Every booking now has a real Source. Real online bookings are always tagged Website automatically. "+ New order" now asks how the booking came in (WhatsApp, Email, Phone, or Viator) — shown as a small badge on every order in the Orders list, with a filter to show just one source, and shown clearly in the order's own Trip details.

Viator has its own workflow, since the guest already paid through Viator:
- Picking Viator in New Order replaces the usual "price it later" flow with one field: the total the guest paid. That order is created already marked Paid, with a payment record noting it was settled through Viator.
- The Payment tab shows a clear note instead of the usual deposit-tracking form: paid in full through Viator, use Notes for anything extra to collect.
- Linking an itinerary to a Viator order no longer requires entering a cost and margin, and never overwrites its already-correct total, even if staff fill those fields in anyway.
- A newly created Viator order (already priced) opens straight to itself instead of being sent to the "now price it" itinerary picker, which only unpriced orders (every other channel) still go to.

Automatic Viator import (pulling bookings in from Viator's own systems) needs Viator Supplier/Partner API credentials, which the business has to obtain directly from Viator — that part is not yet connected.

## Modern SaaS design refresh, across the whole admin
Redesigned at the shared design-system level, so it cascades through every page automatically rather than touching each one by hand:
- **Cards** now have soft depth (subtle shadow instead of a flat border only), buttons have a tactile press effect and shadow, inputs have a smoother focus transition.
- **Sidebar navigation**: the active item is now a soft gold-tinted background with a left accent bar, instead of a solid filled pill — a calmer, more "SaaS dashboard" feel that still uses the brand's gold.
- **New shared primitives** (`.stat-card`, `.stat-value`, `.table-modern`) for KPI numbers and data tables, applied to Finance and Referrals: bigger, bolder numbers; sticky table headers; row hover; consistent spacing — used consistently instead of each page inventing its own version.
- Found and fixed two real bugs along the way: a `bg-cream` class used in the itinerary editor's hotel box referenced a color that was never actually defined (silently rendered no background at all) — now uses the real sand-100 tone; and two of the new stat/table styles were built with text too light to pass contrast, caught by the same accessibility scan and fixed at the shared source.

Re-ran the full accessibility scan across every single admin page, every settings tab, every order-window tab, and every itinerary-editor tab, on both desktop and phone — 0 violations. No mobile overflow anywhere, all 47 automated tests still pass, and the phone-keyboard test is still 11/11.

## Order window: the top button row, organized
Was seven same-weight buttons wrapping across up to four rows before you even reached the tabs. Now three clear tiers: WhatsApp, Call and Email stay full-sized (the actions used most); Customer view and the two copy-link buttons are smaller and lighter, since they're reference actions, not the main task; and once a trip is Completed, Copy review link and Send review link sit together in a small labelled green "Review" group, set apart since it's a distinct step. Confirmed the review group is correctly absent on every order that isn't Completed yet, and every button still works exactly as before.

## Full admin QA sweep
A systematic pass over every admin page, every settings tab, and every tab inside the order window and itinerary editor: 0 accessibility violations, 0 broken pages, 0 mobile layout overflow. Found and fixed two genuine bugs along the way — the Reviews settings field and every "one per line" wording field (payment terms, documents list) had no real label, just text sitting next to the box. Also added a Referral program check to System status, the one recently-added feature it hadn't caught up to yet.

Re-ran the full critical path with everything recently built layered together — new order, price it via an itinerary, pay it, mark it Completed, generate the review link, submit the review, get a referral code — end to end with no regressions and the correct guest name at every step.

## Fixed: booking with the same email but a different name
A real bug, not just confusing behavior: booking again with an email already on file silently renamed the shared customer record, so every past order, invoice, email, itinerary and the guide sheet for that email then showed the newest name — even on trips booked long before. Two people can genuinely share a household email; one person can also spell their name differently between bookings. Fixed by giving every booking its own name, set once at booking time and never changed by a later one. The shared customer record (used to link repeat bookings and referral rewards) keeps its original name and is no longer touched by a booking's name at all. Verified end to end: booked twice on the same email with two different names, and confirmed the Orders list, each order's own window, and the actual invoice PDF each showed the right name for that specific booking.

## Multiple staff alert emails
New booking and new inquiry alerts can now go to more than one inbox. Settings > Company info has a new "Staff alert emails" field — comma-separated, optional, falls back to the single Email field if left blank. The customer-facing address (mailto links, invoices, legal pages) is untouched; this only affects who gets notified internally.

## Staff accounts (owner-only)
Admin > Staff lets an owner (Super Admin) create, edit and remove staff logins, with a role for each (Owner, Manager, Sales, Content editor, Tour operator) - this was previously only possible by setting the single ADMIN_EMAIL/ADMIN_PASSWORD environment variable. Two accounts can share the same password; each is still a separate login with its own email and role. Guards in place: you can't remove or demote your own account, and the last remaining owner account can't be demoted or removed either, so the team can never lock themselves out.

## Live site check, after the domain went live
Tested the real production site at egyptknight.com: homepage, tours list, a tour page with real photo and pricing, a destination page, FAQ, privacy policy and contact all load correctly, www redirects to the apex in one hop, and private pages (/track, /admin/login) are correctly kept out of automated/search access by robots.txt.

Found and fixed one real bug: the footer on every page, and the Contact page, showed a hardcoded "Address, licence and registration details: to be added by Egypt Knight" line — it was never actually wired to Settings, even though the homepage's own contact section already correctly showed the real address. Both now pull the real address, phone and licence number from Settings > Company info, live, with no delay after saving.

## One itinerary per order, until the trip is Completed
An order can have only one itinerary linked to it while the trip is still upcoming. The "New itinerary" picker greys out any order that already has one, saying why; a direct attempt is also rejected on the server, the same message either way. Once the order's status is Completed, that restriction lifts — a second itinerary can be attached (for example, a proposal for their next trip), through either the picker or the "Attach to a booking" panel.

## Whole-system audit
A systematic pass over the whole platform for inconsistencies, not just the newest feature:
- **Fixed:** an unpriced order (before an itinerary sets its price) showed "$0 of $0" on the Orders list, which read as broken. It now shows "Not priced yet" with a **Price it** button that goes straight to the itinerary picker with that order pre-selected — instead of the old "Create invoice" button, which made no sense for a $0 order.
- **Fixed:** Settings had two tabs that could be confused — "Reviews" (Tripadvisor testimonials on the homepage) and "Referrals & reviews" (the post-trip program). The second is renamed "Referral program".
- **Added:** referral codes can now be deactivated (and reactivated) from Admin > Referrals — closing the gap where an abused code had no way to be turned off. A deactivated code is rejected at checkout immediately.
- **Verified, no bug found:** a referral code cannot be used by its own owner (it only works for a customer with no prior bookings, and the owner always has one — their own completed trip); cancelling doesn't retroactively touch money already paid or credited; discounted totals flow correctly into both the Finance and Referrals reports; custom "+ New order" bookings display their own custom title correctly everywhere in the reporting, not the generic placeholder tour name.
- **Known, accepted limitation:** an order can have more than one itinerary linked to it (this predates the pricing work); if two are both priced, whichever is saved last sets the order's total. In practice staff work from one itinerary per order, but this is worth knowing.

## Referral message fixes
The "Share on WhatsApp" message on the unlocked-code panel was missing everything after the discount line — no brand name, no link. It now always names Egypt Knight Tours and links to the tours page, e.g. "I just had an amazing trip with Egypt Knight Tours! Use my referral code AMIRA2D2F for 10% off their first booking. Browse their tours and book yours: https://egyptknight.com/tours". Also fixed: the button was pre-addressed to the business's own WhatsApp number instead of letting the customer pick who to send it to; a fixed-amount discount or reward showed no currency symbol ("20 off" instead of "$20 off"); the earned-reward amount was calculated but never actually shown to the customer. The word "code" on the customer-facing page now reads "referral code" throughout. The staff "Send review link" WhatsApp message now also names the business instead of saying "us".

## Sending the review link without email set up
Once a trip is marked Completed, its order window shows "Copy review link" and "Send review link" (opens WhatsApp with the message and link ready) — so the review page can be tested, or genuinely used, before email is connected. The invite email still sends automatically once RESEND_API_KEY and EMAIL_FROM are set; these buttons work either way, as a manual alternative or backup.

## Post-trip reviews and a referral program
Marking a booking Completed automatically emails the customer a private link to a review page. They pick where they left a review (Google, Tripadvisor, Facebook, Instagram — only the ones you have a link for in Settings), confirm, and get a personal discount code to share, with a one-tap WhatsApp share and copy button.

That code is a normal coupon under the hood, so it works everywhere coupon codes already do. When a friend books with it and their payment comes in, the original customer is automatically credited a reward — safe against being paid twice on the same booking. Both the friend's discount and the reward are percentages or fixed amounts, set in Settings > Referrals & reviews, along with the program's on/off switch and the Google review link.

Admin > Referrals (Super Admin/Manager only) shows reviews completed vs waiting, codes generated, bookings and revenue per code, discounts given, rewards paid out, and returning referrers.

## Prices are per person, and the itinerary editor is now tabs, not one long scroll
Cost and margin (tours, itineraries) are always per person. When an itinerary is linked to an order, the price per person is multiplied automatically by that order's travelers (adults + children, infants free) to get the total — add or remove a traveler on the order and the price follows, nothing to recalculate by hand. The itinerary PDF's price line states both, e.g. "$90 per person — $360 total for 4 travelers".

The itinerary editor is now four tabs — Content, Days, Price, Booking & sharing — instead of one long page. Price settings has its own tab, entirely separate from the trip content. Every section within a tab is its own collapsible panel, so nothing forces a long scroll to find one field.

## One rule for pricing: cost + profit margin, everywhere, no manual price
Redesigned so price always comes from a cost and a profit margin, never typed in directly, and lives in exactly one place per situation:
- **Tours** (the public catalog price, before any customer exists): cost + profit % is now the only way to price a tour. Content editors can see the current price but cannot set or change it — only Super Admin/Manager can, and a brand-new tour a content editor creates is forced to stay a Draft, at $0, until a manager prices it.
- **"+ New order"**: no longer asks for any price at all — no manual total, no cost + margin, no deposit %. It only captures the customer and trip, then goes straight to the itinerary picker with that order pre-selected, because that is the next and only place to price it.
- **The itinerary**: the single source of guest-specific pricing. Cost + profit % is required the moment an itinerary is linked to a real order — saving is blocked with a clear message until both are filled in. There is no manual price line anywhere anymore.
- **Editing an order's details** no longer includes a total field either — only an itinerary's cost + margin can change what an order is worth.
- **Every order now shows its own cost, profit and margin** directly in the Payment tab (Super Admin/Manager only), instead of that being invisible outside the monthly Finance report.
- **An itinerary can only ever become a website tour if it was started that way.** Each itinerary now remembers why it was created (for a customer, for the website, or a quick PDF); the "publish as a tour" option only appears for ones made with "For the website (a tour)", so a customer's private itinerary can never accidentally go public.

## Safety check before repricing a sensitive order
Saving cost + profit % on an itinerary that is linked to an order which is cancelled, already marked completed, or already has a payment recorded now asks "are you sure?" first, naming the reason and the new total, instead of silently overwriting it. Confirming applies the change and leaves a note in that order's activity timeline recording the old total, the new total, who changed it and when. Declining leaves the order exactly as it was. An order with no payments and a normal status still saves instantly, with no prompt.

## Itinerary creation, redesigned for clarity
Itineraries > + New itinerary opens one picker page with four clear, self-contained cards instead of a single buried form:
- **For a customer**: pick one of your orders; name, dates and traveler count are filled in automatically.
- **For the website (a tour)**: build the plan, then a highlighted panel below lets you publish it as a tour.
- **Create a template**: name required up front, since that is how you will find it again; can start from another template.
- **Generate a quick PDF**: a one-off, not linked to anything.
Each one can start blank or from an existing template. After creating, the editor shows a one-line "Next step" tip matching what was chosen, so nobody has to guess what to do after clicking Create. Importing from an existing PDF is still available, tucked under "Or import from a PDF you already have" on the list page.

## Migration tools (moving from another website)
- **Redirects** (Settings > Redirects): old address to new page, paste many at once, test box, built-in rules for WordPress tour-site addresses. Old addresses that match no page now flow through a catch-all that applies them; otherwise a normal 404.
- **Tour import** (Tours > Import CSV): creates draft tours from a spreadsheet, copies photos from a named https website (private networks blocked), creates missing destinations. **+ New destination** in Destinations.
- **`npm run check-migration`** lists every old address that would 404 on the new site. Plan: `docs/06-migration-from-wordpress.md`.

## Website content and SEO
- Photos are uploaded from a phone or computer (no links): tours, destinations, itinerary cover/day/activity photos and the homepage photo. Stored in the database, resized, served from `/api/media/[id]` with year-long caching and responsive sizes.
- **Destinations** admin: change each destination photo and text. Tours without a photo use their destination's photo.
- **Itinerary → tour**: "Add this itinerary as a tour on the website" creates or updates a bookable tour from an itinerary.
- Booking now requires a nationality (dropdown), saved on the customer and the lead traveler and shown in the admin.
- SEO: keyword-focused titles and descriptions, 7 landing pages under `/egypt-tours/…`, 9 travel guides, rewritten destination pages with FAQ and destination schema, homepage schema (agency, website search, FAQ), keyword footer and sitemap entries. Filtered tour URLs are noindex.
- Homepage video section (YouTube, starts at 0:14; link and start time editable in Settings → Website).

## Travel guides and topic clusters
- 20 guides in 3 clusters, each with one complete "pillar" guide: **Plan your trip** (Egypt Travel Guide 2026), **Where to go** (Best Places to Visit in Egypt) and **Itineraries** (7 Days in Egypt). Every guide links to its pillar, to related guides, to destination pages and to tour landing pages.
- Articles have a contents list, key takeaways box, tables, FAQ (with FAQ schema) and Article schema. Written in a simple format in `src/db/content-v3.ts`; tests check every internal link.
- The cost guide's prices are estimates: review them before relying on them.

## Travelers, passports and operations (order modal)
- **Travelers tab:** one card per person (adult, child, infant) with name, age (required for children), date of birth, nationality, passport number and expiry, notes, and passport/visa upload from a local file (JPG, PNG, WebP or PDF, up to 4 MB). Warns when a passport expires within 6 months of the trip.
- **Files are encrypted** (AES-256-GCM) before storage in the database, downloadable only by logged-in staff, and every view, upload and delete is written to the audit log. Set `FILE_ENCRYPTION_KEY` in Vercel for a dedicated key; otherwise it derives from `AUTH_SECRET` (changing that would make existing files unreadable). Delete files after the trip.
- **Operations tab:** assigned tour guide (managed in Settings → Tour guides), preferred language (warns if the guide doesn't list it), driver, vehicle, arrival and departure flights, pickup time, hotel, room type, occasion, visa status, emergency contact, dietary and accessibility needs, plus a WhatsApp button that sends the tour details to the guide.
- The Overview tab shows what is still to collect; the orders list shows guide and passport progress.

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
