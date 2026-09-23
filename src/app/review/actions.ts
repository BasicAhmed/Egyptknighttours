"use server";
import { revalidatePath } from "next/cache";
import { verifyReview } from "@/lib/booking-token";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { completeReview } from "@/lib/referrals";

// A public action — no staff login here, so the signed link itself is what proves this is the right customer.
export async function submitReview(ref: string, token: string, platforms: string[]) {
  if (!verifyReview(ref, token)) return { ok: false, message: "This link isn't valid." };
  const [b] = await db.select({ id: s.bookings.id, status: s.bookings.status }).from(s.bookings).where(eq(s.bookings.ref, ref));
  if (!b || b.status !== "COMPLETED") return { ok: false, message: "This link isn't valid." };
  const clean = platforms.filter((p) => ["google", "tripadvisor", "facebook", "instagram", "other"].includes(p)).slice(0, 10);
  if (!clean.length) return { ok: false, message: "Choose where you left a review first." };
  const coupon = await completeReview(b.id, clean);
  revalidatePath(`/review/${ref}`);
  return { ok: true, code: coupon?.code ?? null };
}
