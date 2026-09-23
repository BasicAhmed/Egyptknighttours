import { desc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { r2 } from "./pricing";

export type ReferralOverview = {
  reviewsCompleted: number; reviewsPending: number; codesGenerated: number;
  referredBookings: number; discountsGiven: number; rewardsPaid: number; returningReferrers: number;
  reviews: { ref: string; customer: string; tour: string; status: string; platforms: string[]; code: string | null; completedAt: string | null }[];
  codes: { id: string; code: string; owner: string; uses: number; revenue: number; rewardsPaid: number; active: boolean }[];
};

export async function referralOverview(): Promise<ReferralOverview> {
  const reviewRows = await db.select({ rp: s.postTripReviews, ref: s.bookings.ref, tour: s.tours.title, titleOverride: s.bookings.titleOverride, guestName: s.bookings.guestName, customer: s.customers.name, code: s.coupons.code })
    .from(s.postTripReviews).innerJoin(s.bookings, eq(s.postTripReviews.bookingId, s.bookings.id)).innerJoin(s.customers, eq(s.postTripReviews.customerId, s.customers.id)).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id))
    .leftJoin(s.coupons, eq(s.postTripReviews.couponId, s.coupons.id))
    .orderBy(desc(s.postTripReviews.createdAt)).limit(200);

  const codeRows = await db.select({ coupon: s.coupons, owner: s.customers.name }).from(s.coupons).innerJoin(s.customers, eq(s.coupons.ownerCustomerId, s.customers.id)).where(eq(s.coupons.kind, "REFERRAL")).orderBy(desc(s.coupons.id));

  const codes = await Promise.all(codeRows.map(async (row) => {
    const used = await db.select({ total: s.bookings.total }).from(s.bookings).where(eq(s.bookings.couponId, row.coupon.id));
    const revenue = r2(used.reduce((a, b) => a + b.total, 0));
    return { id: row.coupon.id, code: row.coupon.code, owner: row.owner, uses: used.length, revenue, rewardsPaid: 0, active: row.coupon.active };
  }));

  // Rewards paid per code: sum customer_rewards by the code owner (every reward row for that customer that references a booking is from this loop's referral activity).
  const rewardByOwner = new Map<string, number>();
  const rewardRows = await db.select({ customerId: s.customerRewards.customerId, amount: s.customerRewards.amount }).from(s.customerRewards);
  for (const r of rewardRows) rewardByOwner.set(r.customerId, r2((rewardByOwner.get(r.customerId) ?? 0) + r.amount));
  for (let i = 0; i < codes.length; i++) codes[i].rewardsPaid = rewardByOwner.get(codeRows[i].coupon.ownerCustomerId!) ?? 0;

  const [{ discountSum }] = await db.select({ discountSum: sql<number>`coalesce(sum(${s.bookings.discount}), 0)` }).from(s.bookings).innerJoin(s.coupons, eq(s.bookings.couponId, s.coupons.id)).where(eq(s.coupons.kind, "REFERRAL"));
  const rewardsPaid = r2(rewardRows.reduce((a, r) => a + r.amount, 0));
  const referredBookings = codes.reduce((a, c) => a + c.uses, 0);

  // A referrer counts as "returning" once they themselves have more than one booking (their own repeat business alongside referring friends).
  let returningReferrers = 0;
  for (const row of codeRows) {
    if (!row.coupon.ownerCustomerId) continue;
    const own = await db.select({ id: s.bookings.id }).from(s.bookings).where(eq(s.bookings.customerId, row.coupon.ownerCustomerId));
    if (own.length > 1) returningReferrers++;
  }

  return {
    reviewsCompleted: reviewRows.filter((r) => r.rp.status === "COMPLETED").length,
    reviewsPending: reviewRows.filter((r) => r.rp.status === "PENDING").length,
    codesGenerated: codeRows.length, referredBookings, discountsGiven: r2(discountSum), rewardsPaid, returningReferrers,
    reviews: reviewRows.map((r) => ({ ref: r.ref, customer: r.guestName || r.customer, tour: r.titleOverride || r.tour, status: r.rp.status, platforms: JSON.parse(r.rp.platforms || "[]"), code: r.code, completedAt: r.rp.completedAt ? r.rp.completedAt.toISOString().slice(0, 10) : null })),
    codes: codes.map((c) => ({ ...c })),
  };
}
