import Link from "next/link";
import { requireStaff, PERMS } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { readAiConfig } from "@/lib/ai/rules";
import { aiConfigured } from "@/lib/ai/claude";
import AdminAssistant from "@/components/AdminAssistant";
export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const u = await requireStaff(); if (!PERMS.bookings.includes(u.role)) redirect("/admin?denied=1");
  const cfg = readAiConfig(await getSettings()); const ready = cfg.staff && aiConfigured();
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-[26px] font-extrabold sm:text-[32px]">Assistant</h1>
      <p className="text-sm text-ink/65">Ask about orders, find where customers drop off, draft emails or itineraries. Nothing is changed or sent until you press Confirm.</p>
      {ready ? <div className="mt-5"><AdminAssistant /></div>
        : <p className="mt-5 rounded-2xl bg-ink/[.04] p-5 text-sm">The assistant is switched off.{PERMS.settings.includes(u.role) ? <> Switch it on in <Link href="/admin/settings?tab=ai" className="font-semibold underline">Settings → AI assistant</Link>{aiConfigured() ? "." : " after setting ANTHROPIC_API_KEY in Vercel."}</> : " Ask an owner or manager to switch it on."}</p>}
    </div>
  );
}
