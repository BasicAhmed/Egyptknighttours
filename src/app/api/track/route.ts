import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const EVENTS = ["view_tour","search_tours","filter_tours","start_booking","add_traveler","add_upsell","start_checkout","purchase","whatsapp_click","contact_form","custom_trip_start","custom_trip_complete","newsletter_signup","review_submit"] as const;
const schema = z.object({ name: z.enum(EVENTS), sessionId: z.string().max(60).optional(), path: z.string().max(300).optional(), tourSlug: z.string().max(120).optional(), props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional() });

export async function POST(req: Request) {
  if (!rateLimit("track:" + clientIp(req.headers), 300, 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false }, { status: 400 });
  await db.insert(s.analyticsEvents).values({ ...p.data, props: p.data.props ? JSON.stringify(p.data.props).slice(0, 1000) : null });
  return NextResponse.json({ ok: true });
}
