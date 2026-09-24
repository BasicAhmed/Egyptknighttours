import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "egk_session";
const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET must be set (16+ chars)");
  return new TextEncoder().encode(s);
};
export type Session = { uid: string; email: string; name: string; role: string };

export async function createSession(s: Session) {
  const token = await new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export async function destroySession() { (await cookies()).delete(COOKIE); }
export async function getSession(): Promise<Session | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  try { const { payload } = await jwtVerify(t, secret()); return payload as unknown as Session; } catch { return null; }
}
// Resource → roles allowed to write. Everyone signed in can read the dashboard shell.
export const PERMS: Record<string, string[]> = {
  tours: ["SUPER_ADMIN", "MANAGER", "CONTENT_EDITOR"],
  leads: ["SUPER_ADMIN", "MANAGER", "SALES"],
  bookings: ["SUPER_ADMIN", "MANAGER", "SALES", "TOUR_OPERATOR"],
  coupons: ["SUPER_ADMIN", "MANAGER"],
  reviews: ["SUPER_ADMIN", "MANAGER", "CONTENT_EDITOR"],
  settings: ["SUPER_ADMIN", "MANAGER"],
  documents: ["SUPER_ADMIN", "MANAGER", "SALES"],
  itineraries: ["SUPER_ADMIN", "MANAGER", "SALES", "CONTENT_EDITOR"],
  finance: ["SUPER_ADMIN", "MANAGER"], // cost prices, profit margins and the monthly profit report are owner/manager only
  referrals: ["SUPER_ADMIN", "MANAGER"], // discount codes, rewards paid out and the referral dashboard are owner/manager only
  staff: ["SUPER_ADMIN"], // creating accounts and setting roles is owner-only
  corporate: ["SUPER_ADMIN", "MANAGER", "SALES", "TOUR_OPERATOR"], // corporate/other-company requests — same people who handle bookings
};
export async function requireStaff(resource?: string): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  if (resource && !PERMS[resource]?.includes(s.role)) redirect("/admin?denied=1");
  return s;
}
