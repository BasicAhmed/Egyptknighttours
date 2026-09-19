import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/validation";
import { db, schema as s } from "@/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const DAY = 86400000;
export async function POST(req: Request) {
  if (!rateLimit("lead:" + clientIp(req.headers), 8, 10 * 60_000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const parsed = leadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check your details" }, { status: 400 });
  const { website: _hp, ...d } = parsed.data; void _hp;
  const [lead] = await db.insert(s.leads).values({ ...d, email: d.email.toLowerCase(), nextFollowUpAt: new Date(Date.now() + DAY) }).returning();
  await db.insert(s.leadEvents).values({ leadId: lead.id, type: d.kind, note: d.message ?? d.interests ?? null });
  // Day 0 is a direct reply to their request. The longer nurture cadence only runs with marketing consent.
  const cadence = d.consentMarketing
    ? ([["day0", 0], ["day1", 1], ["day3", 3], ["day5", 5]] as const)
    : ([["day0", 0], ["day5", 5]] as const);
  await db.insert(s.followUps).values(cadence.map(([templateKey, days]) => ({ leadId: lead.id, templateKey, dueAt: new Date(Date.now() + days * DAY) })));
  return NextResponse.json({ ok: true });
}
