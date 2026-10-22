import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { rateLimitPersistent, clientIp } from "@/lib/rate-limit";
import { readAiConfig, LIMITS } from "@/lib/ai/rules";
import { AiError, aiConfigured } from "@/lib/ai/claude";
import { customerChat, ipHash } from "@/lib/ai/customer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });

// The customer AI trip planner. Off unless switched on in Settings → AI; limited per visitor per hour and per day.
export async function POST(req: Request) {
  const cfg = readAiConfig(await getSettings());
  if (!cfg.customer || !aiConfigured()) return json({ ok: false, error: "The trip planner isn't available right now. Message us on WhatsApp." }, 503);
  if (Number(req.headers.get("content-length") ?? 0) > 20_000) return json({ ok: false, error: "That message is too long." }, 413);
  const ip = ipHash(clientIp(req.headers));
  if (!(await rateLimitPersistent(`ai-chat-h:${ip}`, LIMITS.customerPerHour, 3600_000)) || !(await rateLimitPersistent(`ai-chat-d:${ip}`, LIMITS.customerPerDay, 86400_000)))
    return json({ ok: false, error: "You've sent a lot of messages. Please take a short break, or message us on WhatsApp." }, 429);
  const body = (await req.json().catch(() => ({}))) as { conversationId?: string; message?: string };
  try { return json({ ok: true, ...(await customerChat({ conversationId: body.conversationId ? String(body.conversationId).slice(0, 64) : null, message: body.message, ip: clientIp(req.headers), cfg })) }); }
  catch (e) { const err = e instanceof AiError ? e : new AiError("Something went wrong. Please try again."); if (!(e instanceof AiError)) console.error("ai chat", e); return json({ ok: false, error: err.message }, err.status); }
}
