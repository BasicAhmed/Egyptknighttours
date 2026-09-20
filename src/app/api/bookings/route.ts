import { NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validation";
import { createBooking, BookingError } from "@/lib/booking";
import { rateLimitPersistent, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!(await rateLimitPersistent("book:" + clientIp(req.headers), 12, 10 * 60_000))) return NextResponse.json({ error: "Too many attempts, try again shortly" }, { status: 429 });
  const parsed = bookingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check your details", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  try { return NextResponse.json(await createBooking(parsed.data)); }
  catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e); return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
