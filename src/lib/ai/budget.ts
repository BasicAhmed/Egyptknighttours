// ---------- Daily spending cap ----------
// Before every call: is today's spend (all AI, Cairo day) under the cap in Settings → AI? After every call: add what it cost.
import { client } from "@/db";
import { businessDay } from "../corporate-constants";

export async function spentToday(): Promise<number> {
  const r = await client.execute({ sql: "select coalesce(sum(cost_usd), 0) as c from ai_usage where day = ?", args: [businessDay(new Date())] });
  return Number(r.rows[0]?.c ?? 0);
}
export async function underCap(capUsd: number) { return (await spentToday()) < capUsd; }
export async function recordUsage(scope: "CUSTOMER" | "STAFF", u: { input: number; output: number; cost: number }) {
  await client.execute({ sql: `insert into ai_usage (day, scope, requests, input_tokens, output_tokens, cost_usd) values (?, ?, 1, ?, ?, ?)
    on conflict(day, scope) do update set requests = requests + 1, input_tokens = input_tokens + excluded.input_tokens, output_tokens = output_tokens + excluded.output_tokens, cost_usd = cost_usd + excluded.cost_usd`,
    args: [businessDay(new Date()), scope, u.input, u.output, u.cost] });
}
// For Settings → AI: today, this month, by scope.
export async function usageSummary() {
  const today = businessDay(new Date()); const month = today.slice(0, 7);
  const r = await client.execute({ sql: "select scope, sum(requests) as n, sum(cost_usd) as c from ai_usage where day like ? group by scope", args: [month + "%"] });
  const t = await client.execute({ sql: "select coalesce(sum(cost_usd), 0) as c, coalesce(sum(requests), 0) as n from ai_usage where day = ?", args: [today] });
  return { today: { cost: Number(t.rows[0]?.c ?? 0), requests: Number(t.rows[0]?.n ?? 0) }, month: Object.fromEntries(r.rows.map((x) => [String(x.scope), { requests: Number(x.n), cost: Number(x.c) }])) as Record<string, { requests: number; cost: number }> };
}
