import { z } from "zod";
export const TOUR_STATUS = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export const LEAD_STATUS = ["NEW","CONTACTED","QUALIFIED","QUOTE_SENT","FOLLOW_UP","BOOKED","TRAVELING","COMPLETED","REPEAT_CUSTOMER","LOST","ABANDONED"] as const;
export const BOOKING_STATUS = ["PENDING","CONFIRMED","DEPOSIT_PAID","PAID","CANCELLED","COMPLETED"] as const;
export const ROLES = ["SUPER_ADMIN","MANAGER","SALES","CONTENT_EDITOR","TOUR_OPERATOR"] as const;

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const quoteSchema = z.object({
  tourSlug: z.string().min(1).max(120),
  adults: z.number().int().min(1).max(30), children: z.number().int().min(0).max(20), infants: z.number().int().min(0).max(10),
  isPrivate: z.boolean(), addonIds: z.array(z.string()).max(20),
  couponCode: z.string().max(40).optional().nullable(),
  payMode: z.enum(["DEPOSIT","FULL","PAY_LATER"]),
});
export const bookingSchema = quoteSchema.extend({
  travelDate: dateStr,
  name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(200),
  whatsapp: z.string().trim().min(5).max(30), country: z.string().trim().max(80).optional(),
  hotel: z.string().trim().max(200).optional(), pickupLocation: z.string().trim().max(200).optional(),
  specialRequests: z.string().trim().max(1000).optional(), dietary: z.string().trim().max(300).optional(),
  accessibility: z.string().trim().max(300).optional(),
  travelerNames: z.array(z.string().trim().max(120)).max(60).optional(),
  consentMarketing: z.boolean().optional(), source: z.string().max(100).optional(),
});
export const leadSchema = z.object({
  name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30).optional(), whatsapp: z.string().trim().max(30).optional(),
  country: z.string().trim().max(80).optional(), travelDates: z.string().trim().max(100).optional(),
  travelers: z.number().int().min(1).max(60).optional(), interests: z.string().trim().max(300).optional(),
  budget: z.string().trim().max(60).optional(), message: z.string().trim().max(2000).optional(),
  kind: z.enum(["INQUIRY","TRIP_BUILDER","CONTACT","ABANDONED"]).default("INQUIRY"),
  source: z.string().max(100).optional(), toursViewed: z.string().max(500).optional(),
  consentMarketing: z.boolean().optional(),
  website: z.string().max(0).optional(), // honeypot
});
export const tourSchema = z.object({
  title: z.string().trim().min(3).max(160), slug: z.string().trim().regex(/^[a-z0-9-]+$/).min(3).max(120),
  shortDescription: z.string().trim().min(10).max(300), longDescription: z.string().trim().min(10).max(8000),
  destinationId: z.string().min(1), category: z.enum(["DAY","MULTI_DAY","NILE_CRUISE","TRANSFER"]),
  audience: z.enum(["ALL","FAMILY","COUPLE","FRIENDS"]),
  durationHours: z.coerce.number().int().min(1).max(500), durationDays: z.coerce.number().int().min(1).max(60),
  activityLevel: z.enum(["EASY","MODERATE","ACTIVE"]),
  pricingModel: z.enum(["PER_PERSON","PER_GROUP"]),
  price: z.coerce.number().min(0).max(100000), discountPrice: z.coerce.number().min(0).max(100000).optional().nullable(),
  childPercent: z.coerce.number().int().min(0).max(100), privateSurcharge: z.coerce.number().min(0).max(100000),
  maxTravelers: z.coerce.number().int().min(1).max(100),
  status: z.enum(TOUR_STATUS), seoTitle: z.string().trim().max(70), seoDescription: z.string().trim().max(170),
});
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(200) });
