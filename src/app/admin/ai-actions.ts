"use server";
import { getSession, PERMS } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { rateLimitPersistent } from "@/lib/rate-limit";
import { readAiConfig, LIMITS } from "@/lib/ai/rules";
import { AiError, aiConfigured } from "@/lib/ai/claude";
import { staffChat } from "@/lib/ai/staff";
import { confirmAction, cancelAction } from "@/lib/ai/staff-actions";

type Res = { ok: boolean; message?: string; conversationId?: string; reply?: string; actions?: { id: string; kind: string; summary: string; payload: Record<string, unknown>; status: string }[] };
async function who() { const u = await getSession(); return u && PERMS.bookings.includes(u.role) ? u : null; }

// The staff assistant. Off unless switched on in Settings → AI; 60 requests an hour per person; daily cap shared with the planner.
export async function aiStaffAsk(conversationId: string | null, message: string): Promise<Res> {
  const u = await who(); if (!u) return { ok: false, message: "Your role can't use the assistant." };
  const cfg = readAiConfig(await getSettings());
  if (!cfg.staff || !aiConfigured()) return { ok: false, message: "The assistant is switched off. An owner can switch it on in Settings → AI." };
  if (!(await rateLimitPersistent(`ai-staff:${u.uid}`, LIMITS.staffPerHour, 3600_000))) return { ok: false, message: "That's a lot of questions this hour. Please wait a few minutes." };
  try { return { ok: true, ...(await staffChat({ user: u, conversationId: conversationId ? String(conversationId).slice(0, 64) : null, message, cfg })) }; }
  catch (e) { if (!(e instanceof AiError)) console.error("ai staff", e); return { ok: false, message: e instanceof AiError ? e.message : "Something went wrong. Please try again." }; }
}
export async function aiConfirm(actionId: string): Promise<Res> { const u = await who(); if (!u) return { ok: false, message: "Not allowed." }; return confirmAction(u, actionId); }
export async function aiCancel(actionId: string): Promise<Res> { const u = await who(); if (!u) return { ok: false, message: "Not allowed." }; return cancelAction(u, actionId); }
