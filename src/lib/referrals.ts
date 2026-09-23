import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getSettings } from "./settings";
import { r2 } from "./pricing";
import { parseJson } from "./format";

export type ReferralSettings = { enabled: boolean; friendDiscountType: "PERCENT" | "FIXED"; friendDiscountValue: number; rewardType: "PERCENT" | "FIXED"; rewardValue: number };
export async function referralSettings(): Promise<ReferralSettings> {
  const g = await getSettings();
  return {
    enabled: g["referral.enabled"] !== "false",
    friendDiscountType: g["referral.friendDiscountType"] === "FIXED" ? "FIXED" : "PERCENT", friendDiscountValue: Number(g["referral.friendDiscountValue"]) || 0,
    rewardType: g["referral.rewardType"] === "FIXED" ? "FIXED" : "PERCENT", rewardValue: Number(g["referral.rewardValue"]) || 0,
  };
}

// A short, easy-to-say code from the customer's first name plus a few random characters, e.g. "LAYLA294".
function makeCode(name: string): string {
  const base = (name.trim().split(/\s+/)[0] || "FRIEND").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8) || "FRIEND";
  const tail = randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
  return `${base}${tail}`;
}

// Every customer gets at most one active referral code, created the first time they complete a post-trip review. Reused after that.
export async function ensureReferralCode(customerId: string): Promise<typeof s.coupons.$inferSelect> {
  const [existing] = await db.select().from(s.coupons).where(and(eq(s.coupons.ownerCustomerId, customerId), eq(s.coupons.kind, "REFERRAL")));
  if (existing) return existing;
  const [cust] = await db.select({ name: s.customers.name }).from(s.customers).where(eq(s.customers.id, customerId));
  const st = await referralSettings();
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeCode(cust?.name ?? "FRIEND") + (attempt > 0 ? String(attempt) : "");
    try {
      const [row] = await db.insert(s.coupons).values({ code, type: st.friendDiscountType, value: st.friendDiscountValue, firstBookingOnly: true, active: true, kind: "REFERRAL", ownerCustomerId: customerId }).returning();
      return row;
    } catch { /* code collision, try again with a fresh random tail */ }
  }
  throw new Error("Could not generate a unique referral code");
}

// Marks a customer's post-trip review as done and unlocks (or returns) their referral code.
export async function completeReview(bookingId: string, platforms: string[]) {
  const [r] = await db.select().from(s.postTripReviews).where(eq(s.postTripReviews.bookingId, bookingId));
  if (!r) return null;
  const coupon = await ensureReferralCode(r.customerId);
  await db.update(s.postTripReviews).set({ status: "COMPLETED", platforms: JSON.stringify(platforms.slice(0, 10)), couponId: coupon.id, completedAt: new Date() }).where(eq(s.postTripReviews.id, r.id));
  return coupon;
}

// Credits the referral reward once — called right after a booking's first payment. Safe to call on every payment; it only ever pays out once per booking.
export async function creditReferralRewardIfDue(bookingId: string) {
  const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, bookingId));
  if (!b || !b.couponId) return;
  const [coupon] = await db.select().from(s.coupons).where(eq(s.coupons.id, b.couponId));
  if (!coupon || coupon.kind !== "REFERRAL" || !coupon.ownerCustomerId) return;
  const [already] = await db.select({ id: s.customerRewards.id }).from(s.customerRewards).where(eq(s.customerRewards.bookingId, bookingId));
  if (already) return;
  const st = await referralSettings();
  const amount = r2(st.rewardType === "PERCENT" ? b.total * (st.rewardValue / 100) : st.rewardValue);
  if (amount <= 0) return;
  await db.insert(s.customerRewards).values({ customerId: coupon.ownerCustomerId, amount, bookingId, note: `Referral reward: ${coupon.code} used on booking ${b.ref}` });
}

export async function rewardBalance(customerId: string): Promise<number> {
  const rows = await db.select({ amount: s.customerRewards.amount }).from(s.customerRewards).where(eq(s.customerRewards.customerId, customerId));
  return r2(rows.reduce((a, r) => a + r.amount, 0));
}

export function parsePlatforms(v: string): string[] { return parseJson<string[]>(v, []); }
