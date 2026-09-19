import { NextResponse } from "next/server";
import { quoteSchema } from "@/lib/validation";
import { buildQuote, BookingError } from "@/lib/booking";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit("quote:" + clientIp(req.headers), 120, 60_000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const parsed = quoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const { quote, couponMessage } = await buildQuote(parsed.data);
    return NextResponse.json({ quote, couponMessage });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
