import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { clientIp } from "@/lib/rate-limit";
import { readAiConfig } from "@/lib/ai/rules";
import { AiError } from "@/lib/ai/claude";
import { startSubmit, confirmSubmit } from "@/lib/ai/submit";

export const dynamic = "force-dynamic";
const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });

// "Send to our team": step=start emails a code; step=confirm checks it and creates the order for staff to price.
export async function POST(req: Request) {
  if (!readAiConfig(await getSettings()).customer) return json({ ok: false, error: "The trip planner isn't available right now." }, 503);
  if (Number(req.headers.get("content-length") ?? 0) > 5_000) return json({ ok: false, error: "Too much data." }, 413);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>; const ip = clientIp(req.headers);
  try { return json({ ok: true, ...(body.step === "confirm" ? await confirmSubmit(body, ip) : await startSubmit(body, ip)) }); }
  catch (e) { const err = e instanceof AiError ? e : new AiError("Something went wrong. Please try again."); if (!(e instanceof AiError)) console.error("ai submit", e); return json({ ok: false, error: err.message }, err.status); }
}
