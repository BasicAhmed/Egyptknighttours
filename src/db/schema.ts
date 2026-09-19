import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
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
  createdAt: createdAt(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const addons = sqliteTable("addons", {
  id: id(), tourId: text("tour_id").notNull().references(() => tours.id, { onDelete: "cascade" }),
  name: text("name").notNull(), description: text("description").notNull().default(""),
  price: real("price").notNull(), unit: text("unit").notNull().default("PER_BOOKING"), // PER_BOOKING | PER_PERSON
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const coupons = sqliteTable("coupons", {
  id: id(), code: text("code").notNull().unique(), type: text("type").notNull(), // PERCENT | FIXED
  value: real("value").notNull(), minSubtotal: real("min_subtotal").notNull().default(0),
  tourId: text("tour_id"), expiresAt: integer("expires_at", { mode: "timestamp" }),
  maxUses: integer("max_uses"), usedCount: integer("used_count").notNull().default(0),
  firstBookingOnly: integer("first_booking_only", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const customers = sqliteTable("customers", {
  id: id(), email: text("email").notNull().unique(), name: text("name").notNull(),
  phone: text("phone"), whatsapp: text("whatsapp"), country: text("country"), createdAt: createdAt(),
});

export const bookings = sqliteTable("bookings", {
  id: id(), ref: text("ref").notNull().unique(),
  status: text("status").notNull().default("PENDING"), // PENDING CONFIRMED DEPOSIT_PAID PAID CANCELLED COMPLETED
  tourId: text("tour_id").notNull().references(() => tours.id),
  customerId: text("customer_id").notNull().references(() => customers.id),
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
  couponId: text("coupon_id").references(() => coupons.id), source: text("source"), createdAt: createdAt(),
});

export const bookingEvents = sqliteTable("booking_events", {
  id: id(), bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // CREATED STATUS_CONFIRMED STATUS_DEPOSIT_PAID STATUS_PAID STATUS_COMPLETED STATUS_CANCELLED
  note: text("note"), createdAt: createdAt(),
});

export const travelers = sqliteTable("travelers", {
  id: id(), bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(), type: text("type").notNull(), age: integer("age"),
});

export const payments = sqliteTable("payments", {
  id: id(), bookingId: text("booking_id").notNull().references(() => bookings.id),
  provider: text("provider").notNull().default("MANUAL"), // MANUAL until Stripe/Paymob keys exist
  kind: text("kind").notNull(), amount: real("amount").notNull(),
  status: text("status").notNull().default("PENDING"), providerRef: text("provider_ref"), createdAt: createdAt(),
});

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
});

export const leadEvents = sqliteTable("lead_events", {
  id: id(), leadId: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  type: text("type").notNull(), note: text("note"), createdAt: createdAt(),
});

export const followUps = sqliteTable("follow_ups", {
  id: id(), leadId: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  templateKey: text("template_key").notNull(), channel: text("channel").notNull().default("EMAIL"),
  dueAt: integer("due_at", { mode: "timestamp" }).notNull(), status: text("status").notNull().default("SCHEDULED"),
});

export const reviews = sqliteTable("reviews", {
  id: id(), tourId: text("tour_id").notNull().references(() => tours.id),
  authorName: text("author_name").notNull(), country: text("country"), rating: integer("rating").notNull(),
  title: text("title").notNull(), body: text("body").notNull(), tripDate: text("trip_date"),
  status: text("status").notNull().default("PENDING"), createdAt: createdAt(),
});

export const guides = sqliteTable("guides", {
  id: id(), slug: text("slug").notNull().unique(), title: text("title").notNull(), cluster: text("cluster").notNull(),
  summary: text("summary").notNull(), body: text("body").notNull(), destinationSlug: text("destination_slug"),
  seoTitle: text("seo_title").notNull(), seoDescription: text("seo_description").notNull(),
  status: text("status").notNull().default("DRAFT"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const analyticsEvents = sqliteTable("analytics_events", {
  id: id(), name: text("name").notNull(), sessionId: text("session_id"), path: text("path"),
  tourSlug: text("tour_slug"), props: text("props"), createdAt: createdAt(),
}, (t) => [index("analytics_name_idx").on(t.name, t.createdAt)]);

export const auditLogs = sqliteTable("audit_logs", {
  id: id(), userId: text("user_id").references(() => users.id), action: text("action").notNull(),
  entity: text("entity").notNull(), entityId: text("entity_id"), createdAt: createdAt(),
});

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
