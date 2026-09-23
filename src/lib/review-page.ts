import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { verifyReview } from "./booking-token";
import { getSettings, companyFrom } from "./settings";
import { referralSettings, rewardBalance, parsePlatforms } from "./referrals";

export type ReviewLink = { key: string; label: string; url: string };
export type ReviewPageData = {
  ref: string; firstName: string; tourTitle: string;
  company: ReturnType<typeof companyFrom>; links: ReviewLink[];
  status: "PENDING" | "COMPLETED"; platforms: string[];
  friendDiscount: string; code: string | null; rewardSummary: string; balance: number; referralCount: number;
};
export type ReviewResult = { state: "invalid" } | { state: "not_completed" } | { state: "ok"; data: ReviewPageData };

export async function loadReviewPage(ref: string, token?: string | null): Promise<ReviewResult> {
  if (!verifyReview(ref, token)) return { state: "invalid" };
  const [row] = await db.select({ b: s.bookings, c: s.customers, t: s.tours }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).where(eq(s.bookings.ref, ref));
  if (!row) return { state: "invalid" };
  if (row.b.status !== "COMPLETED") return { state: "not_completed" };
  const [g, rpRows, st] = await Promise.all([getSettings(), db.select().from(s.postTripReviews).where(eq(s.postTripReviews.bookingId, row.b.id)), referralSettings()]);
  const rp = rpRows[0];
  const company = companyFrom(g);
  const links: ReviewLink[] = [];
  if (g["site.tripadvisorUrl"]) links.push({ key: "tripadvisor", label: "Tripadvisor", url: g["site.tripadvisorUrl"] });
  if (g["company.googleReviewUrl"]) links.push({ key: "google", label: "Google", url: g["company.googleReviewUrl"] });
  if (g["site.facebook"]) links.push({ key: "facebook", label: "Facebook", url: g["site.facebook"] });
  if (g["site.instagram"]) links.push({ key: "instagram", label: "Instagram", url: g["site.instagram"] });

  const rewardSummary = st.rewardType === "PERCENT" ? `${st.rewardValue}% of their booking` : `$${st.rewardValue}`;
  let code: string | null = null; let referralCount = 0; let balance = 0;
  if (rp?.couponId) {
    const [coupon] = await db.select().from(s.coupons).where(eq(s.coupons.id, rp.couponId));
    if (coupon) {
      code = coupon.code;
      const usedRows = await db.select({ id: s.bookings.id }).from(s.bookings).where(eq(s.bookings.couponId, coupon.id));
      referralCount = usedRows.length;
    }
    balance = await rewardBalance(row.c.id);
  }
  const money = (n: number) => `$${n % 1 ? n.toFixed(2) : n}`;
  return { state: "ok", data: {
    ref: row.b.ref, firstName: row.c.name.split(" ")[0], tourTitle: row.b.titleOverride || row.t.title, company, links,
    status: rp?.status === "COMPLETED" ? "COMPLETED" : "PENDING", platforms: rp ? parsePlatforms(rp.platforms) : [],
    friendDiscount: st.friendDiscountType === "PERCENT" ? `${st.friendDiscountValue}% off their first booking` : `${money(st.friendDiscountValue)} off their first booking`,
    code, rewardSummary, balance, referralCount,
  } };
}
