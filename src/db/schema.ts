import { sqliteTable, text, integer, real, index, blob } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`);
// Statuses are plain text validated with Zod at the edges (see src/lib/validation.ts).

export const users = sqliteTable("users", {
  id: id(), email: text("email").notNull().unique(), name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("SALES"), // SUPER_ADMIN MANAGER SALES CONTENT_EDITOR TOUR_OPERATOR
  createdAt: createdAt(),
});

export const destinations = sqliteTable("destinations", {
  imageUrl: text("image_url"),
  id: id(), slug: text("slug").notNull().unique(), name: text("name").notNull(), tagline: text("tagline").notNull(),
  overview: text("overview").notNull(), bestTime: text("best_time").notNull(), howToGet: text("how_to_get").notNull(),
  whereToStay: text("where_to_stay").notNull(), tips: text("tips").notNull(), recommendedDays: text("recommended_days").notNull(),
  seoTitle: text("seo_title").notNull(), seoDescription: text("seo_description").notNull(),
});

export const tours = sqliteTable("tours", {
  id: id(), slug: text("slug").notNull().unique(), title: text("title").notNull(),
  shortDescription: text("short_description").notNull(), longDescription: text("long_description").notNull(),
  destinationId: text("destination_id").notNull().references(() => destinations.id),
  category: text("category").notNull(), // DAY MULTI_DAY NILE_CRUISE TRANSFER
  audience: text("audience").notNull().default("ALL"), // ALL FAMILY COUPLE FRIENDS
  durationHours: integer("duration_hours").notNull().default(8), durationDays: integer("duration_days").notNull().default(1),
  activityLevel: text("activity_level").notNull().default("EASY"),
  pricingModel: text("pricing_model").notNull().default("PER_PERSON"), // PER_PERSON | PER_GROUP
  price: real("price").notNull(), discountPrice: real("discount_price"),
  childPercent: integer("child_percent").notNull().default(50),
  privateSurcharge: real("private_surcharge").notNull().default(0),
  isPrivateAvailable: integer("is_private_available", { mode: "boolean" }).notNull().default(true),
  isGroupAvailable: integer("is_group_available", { mode: "boolean" }).notNull().default(true),
  maxTravelers: integer("max_travelers").notNull().default(12),
  highlights: text("highlights").notNull().default("[]"), itinerary: text("itinerary").notNull().default("[]"),
  included: text("included").notNull().default("[]"), excluded: text("excluded").notNull().default("[]"),
  pickupInfo: text("pickup_info").notNull().default(""), meetingPoint: text("meeting_point").notNull().default(""),
  whatToBring: text("what_to_bring").notNull().default(""), cancellationPolicy: text("cancellation_policy").notNull().default(""),
  faqs: text("faqs").notNull().default("[]"), imageUrl: text("image_url"),
  seoTitle: text("seo_title").notNull().default(""), seoDescription: text("seo_description").notNull().default(""),
  status: text("status").notNull().default("DRAFT"), // DRAFT PUBLISHED ARCHIVED
  popularity: integer("popularity").notNull().default(0),
  // Cost-based pricing (owner/manager only). priceMode MARGIN means `price` above is calculated as costPrice * (1 + marginPercent/100) and kept in sync on every save.
  priceMode: text("price_mode").notNull().default("MANUAL"), // MANUAL | MARGIN
  costPrice: real("cost_price"), marginPercent: real("margin_percent"),
  createdAt: createdAt(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (t) => [index("tours_status_idx").on(t.status), index("tours_destination_idx").on(t.destinationId)]);

export const addons = sqliteTable("addons", {
  id: id(), tourId: text("tour_id").notNull().references(() => tours.id, { onDelete: "cascade" }),
  name: text("name").notNull(), description: text("description").notNull().default(""),
  price: real("price").notNull(), unit: text("unit").notNull().default("PER_BOOKING"), // PER_BOOKING | PER_PERSON
  active: integer("active", { mode: "boolean" }).notNull().default(true),
}, (t) => [index("addons_tour_idx").on(t.tourId)]);

export const coupons = sqliteTable("coupons", {
  id: id(), code: text("code").notNull().unique(), type: text("type").notNull(), // PERCENT | FIXED
  value: real("value").notNull(), minSubtotal: real("min_subtotal").notNull().default(0),
  tourId: text("tour_id"), expiresAt: integer("expires_at", { mode: "timestamp" }),
  maxUses: integer("max_uses"), usedCount: integer("used_count").notNull().default(0),
  firstBookingOnly: integer("first_booking_only", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  // A referral code is a coupon a customer owns and shares. kind separates it from a normal staff-made promo code.
  kind: text("kind").notNull().default("STANDARD"), // STANDARD | REFERRAL
  ownerCustomerId: text("owner_customer_id").references(() => customers.id),
});

export const customers = sqliteTable("customers", {
  id: id(), email: text("email").notNull().unique(), name: text("name").notNull(),
  phone: text("phone"), whatsapp: text("whatsapp"), country: text("country"), nationality: text("nationality"), createdAt: createdAt(),
});

export const bookings = sqliteTable("bookings", {
  id: id(), ref: text("ref").notNull().unique(),
  status: text("status").notNull().default("PENDING"), // PENDING CONFIRMED DEPOSIT_PAID PAID CANCELLED COMPLETED
  tourId: text("tour_id").notNull().references(() => tours.id),
  customerId: text("customer_id").notNull().references(() => customers.id),
  // The name given for this specific booking. Two bookings can share the same email but be for different people (or the same
  // person spelled differently) — this is what every order, invoice, email and document for THIS booking shows; the shared
  // customer record is only used to link repeat bookings together, and never overwritten.
  guestName: text("guest_name"),
  travelDate: text("travel_date").notNull(), // YYYY-MM-DD
  adults: integer("adults").notNull(), children: integer("children").notNull().default(0), infants: integer("infants").notNull().default(0),
  isPrivate: integer("is_private", { mode: "boolean" }).notNull().default(false),
  hotel: text("hotel"), pickupLocation: text("pickup_location"), specialRequests: text("special_requests"),
  dietary: text("dietary"), accessibility: text("accessibility"),
  addonsJson: text("addons_json").notNull().default("[]"),
  subtotal: real("subtotal").notNull(), discount: real("discount").notNull().default(0),
  total: real("total").notNull(), deposit: real("deposit").notNull().default(0),
  payMode: text("pay_mode").notNull().default("DEPOSIT"), // DEPOSIT | FULL | PAY_LATER
  currency: text("currency").notNull().default("USD"),
  couponId: text("coupon_id").references(() => coupons.id),
  // Which channel this booking came through: WEBSITE (set automatically), or WHATSAPP | EMAIL | PHONE | VIATOR (staff picks one when creating a manual order).
  source: text("source"),
  titleOverride: text("title_override"), // custom experiences created by staff (e.g. a specific cruise)
  preferredLanguage: text("preferred_language"), guideId: text("guide_id"), driver: text("driver"), vehicle: text("vehicle"),
  flightArrival: text("flight_arrival"), flightDeparture: text("flight_departure"), roomType: text("room_type"), pickupTime: text("pickup_time"),
  occasion: text("occasion"), emergencyContact: text("emergency_contact"), visaStatus: text("visa_status"), guideNotes: text("guide_notes"),
  // Snapshot of the tour's cost for this booking's people count, taken at booking time so later cost changes never rewrite past profit. Null when the tour had no cost set, or for a manually-priced custom order.
  costTotal: real("cost_total"),
  createdAt: createdAt(),
}, (t) => [index("bookings_customer_idx").on(t.customerId), index("bookings_tour_idx").on(t.tourId), index("bookings_status_idx").on(t.status), index("bookings_travel_idx").on(t.travelDate), index("bookings_created_idx").on(t.createdAt)]);

export const bookingEvents = sqliteTable("booking_events", {
  id: id(), bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // CREATED STATUS_CONFIRMED STATUS_DEPOSIT_PAID STATUS_PAID STATUS_COMPLETED STATUS_CANCELLED
  note: text("note"), createdAt: createdAt(),
}, (t) => [index("booking_events_booking_idx").on(t.bookingId)]);

export const settings = sqliteTable("settings", { key: text("key").primaryKey(), value: text("value").notNull().default("") });

// Where customers send money. Bank details live here (editable in admin), never in code or templates.
export const paymentMethods = sqliteTable("payment_methods", {
  id: id(), kind: text("kind").notNull().default("BANK"), // BANK LINK WISE CARD OTHER
  label: text("label").notNull(), currency: text("currency").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true), sortOrder: integer("sort_order").notNull().default(0),
  bankName: text("bank_name").notNull().default(""), accountName: text("account_name").notNull().default(""), accountNumber: text("account_number").notNull().default(""),
  iban: text("iban").notNull().default(""), swift: text("swift").notNull().default(""), branch: text("branch").notNull().default(""), bankAddress: text("bank_address").notNull().default(""),
  instructions: text("instructions").notNull().default(""), paymentUrl: text("payment_url").notNull().default(""), createdAt: createdAt(),
});

// An itinerary is one JSON document (days and blocks). Templates are itineraries with is_template = true.
export const itineraries = sqliteTable("itineraries", {
  id: id(), name: text("name").notNull(), description: text("description").notNull().default(""),
  isTemplate: integer("is_template", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("DRAFT"), // DRAFT READY SENT
  bookingId: text("booking_id").references(() => bookings.id), sourceTemplateId: text("source_template_id"), tourId: text("tour_id"),
  content: text("content").notNull(), createdById: text("created_by_id").references(() => users.id),
  // What this specific trip costs and the profit margin on it. Every itinerary can have its own, since the same tour can cost differently for different guests.
  costPrice: real("cost_price"), marginPercent: real("margin_percent"),
  // Only meaningful when there is no bookingId: an itinerary linked to a real order always prices in that order's own
  // currency instead. Lets a template, quick PDF, or website-tour itinerary be priced in something other than USD.
  currency: text("currency"),
  // What this itinerary was made for. Only a "tour" one can ever be published as a website tour — this is what makes that an explicit choice, not an accident.
  intent: text("intent").notNull().default("pdf"), // customer | tour | pdf
  createdAt: createdAt(), updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (t) => [index("itineraries_template_idx").on(t.isTemplate), index("itineraries_booking_idx").on(t.bookingId)]);

// Every generated PDF is stored as a snapshot so history stays exact even when prices or bank details change later.
export const documents = sqliteTable("documents", {
  id: id(), kind: text("kind").notNull(), // INVOICE | ITINERARY
  number: text("number").notNull(), version: integer("version").notNull().default(1),
  bookingId: text("booking_id").references(() => bookings.id), itineraryId: text("itinerary_id").references(() => itineraries.id),
  status: text("status").notNull().default("GENERATED"), // GENERATED SENT
  currency: text("currency").notNull().default("USD"), amount: real("amount"),
  data: text("data").notNull(), createdById: text("created_by_id").references(() => users.id), createdAt: createdAt(),
  sentAt: integer("sent_at", { mode: "timestamp" }), sentTo: text("sent_to"), sentVia: text("sent_via"),
}, (t) => [index("documents_booking_idx").on(t.bookingId), index("documents_itinerary_idx").on(t.itineraryId)]);
export const documentEvents = sqliteTable("document_events", {
  id: id(), documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // CREATED EMAILED EMAIL_FAILED MARKED_SENT
  note: text("note"), userId: text("user_id"), createdAt: createdAt(),
}, (t) => [index("document_events_doc_idx").on(t.documentId)]);

// Real customer reviews shown on the homepage (for example copied from Tripadvisor). Managed in Settings, never generated.
export const testimonials = sqliteTable("testimonials", {
  id: id(), name: text("name").notNull(), country: text("country").notNull().default(""), rating: integer("rating").notNull().default(5),
  title: text("title").notNull().default(""), body: text("body").notNull(), source: text("source").notNull().default("Tripadvisor"),
  url: text("url").notNull().default(""), reviewDate: text("review_date").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true), sortOrder: integer("sort_order").notNull().default(0), createdAt: createdAt(),
}, (t) => [index("testimonials_active_idx").on(t.active, t.sortOrder)]);

// Website photos uploaded by staff (tours, destinations, itineraries, homepage). Public, served from /api/media/[id] with long caching.
export const media = sqliteTable("media", {
  id: id(), filename: text("filename").notNull(), mime: text("mime").notNull(), size: integer("size").notNull(),
  width: integer("width"), height: integer("height"), data: blob("data", { mode: "buffer" }).notNull(), uploadedById: text("uploaded_by_id"), createdAt: createdAt(),
}, (t) => [index("media_created_idx").on(t.createdAt)]);

export const travelers = sqliteTable("travelers", {
  id: id(), bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(), type: text("type").notNull(), age: integer("age"),
  nationality: text("nationality"), dob: text("dob"), passportNumber: text("passport_number"), // stored encrypted (see lib/crypto)
  passportExpiry: text("passport_expiry"), notes: text("notes"),
}, (t) => [index("travelers_booking_idx").on(t.bookingId)]);

// Passport and visa scans. The bytes are encrypted before they are stored and only staff can download them.
export const travelerFiles = sqliteTable("traveler_files", {
  id: id(), travelerId: text("traveler_id").notNull().references(() => travelers.id, { onDelete: "cascade" }),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("PASSPORT"), // PASSPORT VISA OTHER
  filename: text("filename").notNull(), mime: text("mime").notNull(), size: integer("size").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(), uploadedById: text("uploaded_by_id"), createdAt: createdAt(),
}, (t) => [index("traveler_files_booking_idx").on(t.bookingId), index("traveler_files_traveler_idx").on(t.travelerId)]);

// Tour guides staff can assign to an order.
export const tourGuides = sqliteTable("tour_guides", {
  id: id(), name: text("name").notNull(), phone: text("phone").notNull().default(""), languages: text("languages").notNull().default(""),
  notes: text("notes").notNull().default(""), active: integer("active", { mode: "boolean" }).notNull().default(true), createdAt: createdAt(),
});


export const payments = sqliteTable("payments", {
  id: id(), bookingId: text("booking_id").notNull().references(() => bookings.id),
  provider: text("provider").notNull().default("MANUAL"), // MANUAL until Stripe/Paymob keys exist
  kind: text("kind").notNull(), amount: real("amount").notNull(),
  status: text("status").notNull().default("PENDING"), providerRef: text("provider_ref"), createdAt: createdAt(),
}, (t) => [index("payments_booking_idx").on(t.bookingId)]);

export const leads = sqliteTable("leads", {
  id: id(), name: text("name").notNull(), email: text("email").notNull(),
  phone: text("phone"), whatsapp: text("whatsapp"), country: text("country"),
  travelDates: text("travel_dates"), travelers: integer("travelers"), interests: text("interests"),
  budget: text("budget"), message: text("message"),
  kind: text("kind").notNull().default("INQUIRY"), // INQUIRY TRIP_BUILDER CONTACT ABANDONED
  source: text("source"),
  status: text("status").notNull().default("NEW"),
  toursViewed: text("tours_viewed"), notes: text("notes"),
  consentMarketing: integer("consent_marketing", { mode: "boolean" }).notNull().default(false),
  assignedToId: text("assigned_to_id").references(() => users.id),
  customerId: text("customer_id").references(() => customers.id),
  lastContactAt: integer("last_contact_at", { mode: "timestamp" }),
  nextFollowUpAt: integer("next_follow_up_at", { mode: "timestamp" }),
  createdAt: createdAt(),
}, (t) => [index("leads_status_idx").on(t.status), index("leads_created_idx").on(t.createdAt), index("leads_email_idx").on(t.email)]);

export const leadEvents = sqliteTable("lead_events", {
  id: id(), leadId: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  type: text("type").notNull(), note: text("note"), createdAt: createdAt(),
}, (t) => [index("lead_events_lead_idx").on(t.leadId)]);

export const followUps = sqliteTable("follow_ups", {
  id: id(), leadId: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  templateKey: text("template_key").notNull(), channel: text("channel").notNull().default("EMAIL"),
  dueAt: integer("due_at", { mode: "timestamp" }).notNull(), status: text("status").notNull().default("SCHEDULED"),
}, (t) => [index("follow_ups_lead_idx").on(t.leadId), index("follow_ups_due_idx").on(t.status, t.dueAt)]);

export const reviews = sqliteTable("reviews", {
  id: id(), tourId: text("tour_id").notNull().references(() => tours.id),
  authorName: text("author_name").notNull(), country: text("country"), rating: integer("rating").notNull(),
  title: text("title").notNull(), body: text("body").notNull(), tripDate: text("trip_date"),
  status: text("status").notNull().default("PENDING"), createdAt: createdAt(),
}, (t) => [index("reviews_tour_idx").on(t.tourId, t.status)]);

export const guides = sqliteTable("guides", {
  id: id(), slug: text("slug").notNull().unique(), title: text("title").notNull(), cluster: text("cluster").notNull(),
  summary: text("summary").notNull(), body: text("body").notNull(), destinationSlug: text("destination_slug"),
  seoTitle: text("seo_title").notNull(), seoDescription: text("seo_description").notNull(),
  status: text("status").notNull().default("DRAFT"),
  faqs: text("faqs").notNull().default("[]"), related: text("related").notNull().default(""), isPillar: integer("is_pillar", { mode: "boolean" }).notNull().default(false), keywords: text("keywords").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (t) => [index("guides_status_idx").on(t.status, t.cluster)]);

export const analyticsEvents = sqliteTable("analytics_events", {
  id: id(), name: text("name").notNull(), sessionId: text("session_id"), path: text("path"),
  tourSlug: text("tour_slug"), props: text("props"), createdAt: createdAt(),
}, (t) => [index("analytics_name_idx").on(t.name, t.createdAt)]);

// The reward ledger for the referral program: one row per credit (a friend's successful first booking) or manual adjustment.
export const customerRewards = sqliteTable("customer_rewards", {
  id: id(), customerId: text("customer_id").notNull().references(() => customers.id),
  amount: real("amount").notNull(), // positive = credit to the customer's balance
  bookingId: text("booking_id").references(() => bookings.id), // the referred booking that earned this, if any
  note: text("note").notNull().default(""), createdAt: createdAt(),
}, (t) => [index("customer_rewards_customer_idx").on(t.customerId)]);

// One row per completed trip: tracks the post-trip review invite and, once they confirm, the referral code it unlocked.
export const postTripReviews = sqliteTable("post_trip_reviews", {
  id: id(), bookingId: text("booking_id").notNull().unique().references(() => bookings.id), customerId: text("customer_id").notNull().references(() => customers.id),
  status: text("status").notNull().default("PENDING"), // PENDING | COMPLETED
  platforms: text("platforms").notNull().default("[]"), // which review sites they said they used, e.g. ["google","tripadvisor"]
  couponId: text("coupon_id").references(() => coupons.id), completedAt: integer("completed_at", { mode: "timestamp" }), createdAt: createdAt(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: id(), userId: text("user_id").references(() => users.id), action: text("action").notNull(),
  entity: text("entity").notNull(), entityId: text("entity_id"), createdAt: createdAt(),
}, (t) => [index("audit_created_idx").on(t.createdAt)]);

export const toursRelations = relations(tours, ({ one, many }) => ({
  destination: one(destinations, { fields: [tours.destinationId], references: [destinations.id] }),
  addons: many(addons), reviews: many(reviews),
}));
export const destinationsRelations = relations(destinations, ({ many }) => ({ tours: many(tours) }));
export const addonsRelations = relations(addons, ({ one }) => ({ tour: one(tours, { fields: [addons.tourId], references: [tours.id] }) }));
export const reviewsRelations = relations(reviews, ({ one }) => ({ tour: one(tours, { fields: [reviews.tourId], references: [tours.id] }) }));
export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  tour: one(tours, { fields: [bookings.tourId], references: [tours.id] }),
  customer: one(customers, { fields: [bookings.customerId], references: [customers.id] }),
  travelers: many(travelers), payments: many(payments),
}));
export const travelersRelations = relations(travelers, ({ one }) => ({ booking: one(bookings, { fields: [travelers.bookingId], references: [bookings.id] }) }));
export const paymentsRelations = relations(payments, ({ one }) => ({ booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }) }));
export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignedTo: one(users, { fields: [leads.assignedToId], references: [users.id] }),
  events: many(leadEvents), followUps: many(followUps),
}));
export const leadEventsRelations = relations(leadEvents, ({ one }) => ({ lead: one(leads, { fields: [leadEvents.leadId], references: [leads.id] }) }));
export const followUpsRelations = relations(followUps, ({ one }) => ({ lead: one(leads, { fields: [followUps.leadId], references: [leads.id] }) }));

// Persistent request counters for rate limiting (works across serverless instances).
export const rateLimits = sqliteTable("rate_limits", { key: text("key").primaryKey(), count: integer("count").notNull().default(0), windowStart: integer("window_start").notNull() });

// Old website addresses (for example from a WordPress site) that permanently redirect to the right new page.
export const redirects = sqliteTable("redirects", {
  id: id(), fromPath: text("from_path").notNull().unique(), toPath: text("to_path").notNull(), status: integer("status").notNull().default(301),
  note: text("note").notNull().default(""), createdAt: createdAt(),
});

// ---------- Corporate / other-company requests ----------
// A separate request type, entirely apart from the direct customer Order flow: another company (a travel agency, a
// corporate partner) asks us to arrange one or more services for their own client. Never touches the bookings table.
export const corporateRequests = sqliteTable("corporate_requests", {
  id: id(), ref: text("ref").notNull().unique(),
  companyName: text("company_name").notNull(), companyContact: text("company_contact").notNull().default(""), companyEmail: text("company_email").notNull().default(""), companyPhone: text("company_phone").notNull().default(""),
  customerName: text("customer_name").notNull().default(""), customerContact: text("customer_contact").notNull().default(""), customerCount: integer("customer_count"),
  serviceDate: text("service_date"), location: text("location").notNull().default(""),
  notes: text("notes").notNull().default(""), requirements: text("requirements").notNull().default(""),
  status: text("status").notNull().default("NEW"), // NEW CONFIRMED IN_PROGRESS COMPLETED CANCELLED
  currency: text("currency").notNull().default("USD"),
  // How the selling price is worked out: ITEMIZED (each service has its own price, summed — the original model) or
  // PERCENTAGE (each service just has a cost; one service-fee percentage is applied to the total cost to get the price).
  pricingMode: text("pricing_mode").notNull().default("ITEMIZED"), servicePercent: real("service_percent"),
  createdById: text("created_by_id").references(() => users.id), createdAt: createdAt(),
}, (t) => [index("corporate_requests_status_idx").on(t.status)]);

export const corporateServices = sqliteTable("corporate_services", {
  id: id(), requestId: text("request_id").notNull().references(() => corporateRequests.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // TRANSFER ENTRANCE_TICKETS PERMITS FELUCCA MOTOR_BOAT TOUR_GUIDE HOTEL NILE_CRUISE AIRPORT_SERVICES TRANSPORTATION OTHER
  label: text("label").notNull().default(""), // a short description, especially useful when type is OTHER
  date: text("date"), time: text("time"), location: text("location").notNull().default(""), people: integer("people"),
  supplier: text("supplier").notNull().default(""), cost: real("cost").notNull().default(0), price: real("price").notNull().default(0),
  status: text("status").notNull().default("PENDING"), // PENDING CONFIRMED DONE CANCELLED
  notes: text("notes").notNull().default(""), createdAt: createdAt(),
}, (t) => [index("corporate_services_request_idx").on(t.requestId)]);

// One row per payment received against a corporate request — mirrors the bookings payments table, kept separate on purpose.
export const corporatePayments = sqliteTable("corporate_payments", {
  id: id(), requestId: text("request_id").notNull().references(() => corporateRequests.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(), method: text("method").notNull().default("MANUAL"),
  status: text("status").notNull().default("PAID"), note: text("note").notNull().default(""), createdAt: createdAt(),
}, (t) => [index("corporate_payments_request_idx").on(t.requestId)]);

// Every notification email attempt — success or failure — so the team can actually verify one went out, not just hope it did.
export const notificationLog = sqliteTable("notification_log", {
  id: id(), type: text("type").notNull(), // NEW_BOOKING NEW_LEAD PAYMENT_COMPLETE ORDER_CANCELLED CORPORATE_PAYMENT_COMPLETE CORPORATE_CANCELLED
  recipient: text("recipient").notNull(), subject: text("subject").notNull().default(""),
  bookingId: text("booking_id"), corporateRequestId: text("corporate_request_id"),
  success: integer("success", { mode: "boolean" }).notNull(), error: text("error"), createdAt: createdAt(),
}, (t) => [index("notification_log_created_idx").on(t.createdAt)]);
