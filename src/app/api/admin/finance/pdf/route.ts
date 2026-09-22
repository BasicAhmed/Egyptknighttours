import { NextResponse } from "next/server";
import { getSession, PERMS } from "@/lib/auth";
import { monthlyFinance, type FinanceMonth } from "@/lib/finance";
import { getSettings, companyFrom } from "@/lib/settings";
import { renderFinanceReport } from "@/pdf/render";
import { pdfResponse } from "@/lib/pdf-response";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const u = await getSession();
  if (!u || !PERMS.finance.includes(u.role)) return new NextResponse("Not found", { status: 404 });
  const q = new URL(req.url).searchParams; const raw = q.get("m") ?? "";
  const parsed = /^(\d{4})-(\d{2})$/.exec(raw); const now = new Date();
  const m: FinanceMonth = parsed ? { year: Number(parsed[1]), month: Number(parsed[2]) } : { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  const [r, g] = await Promise.all([monthlyFinance(m), getSettings()]);
  const data = { ...r, currency: "USD", generatedAt: new Date().toISOString().slice(0, 10), company: companyFrom(g) };
  return pdfResponse(() => renderFinanceReport(data), `profit-${m.year}-${String(m.month).padStart(2, "0")}.pdf`, false);
}
