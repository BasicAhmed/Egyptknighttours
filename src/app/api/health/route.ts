import { NextResponse } from "next/server";
import { client } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";

export const dynamic = "force-dynamic";
// Safe diagnostics: reports whether settings exist (never their values) and whether the database answers.
export async function GET() {
  const url = (process.env.DATABASE_URL ?? "").trim();
  const out: Record<string, unknown> = {
    databaseUrlSet: !!url, databaseUrlScheme: url.split(":")[0] || null, databaseTokenSet: !!(process.env.DATABASE_AUTH_TOKEN ?? "").trim(),
    authSecretSet: (process.env.AUTH_SECRET ?? "").length >= 16, adminEmailSet: !!process.env.ADMIN_EMAIL, adminPasswordSet: !!process.env.ADMIN_PASSWORD,
  };
  try {
    await ensureDatabase();
    const t = await client.execute("select count(*) as n from tours");
    const u = await client.execute("select count(*) as n from users");
    out.dbOk = true; out.tours = Number(t.rows[0].n); out.adminUsers = Number(u.rows[0].n);
  } catch (e) {
    out.dbOk = false; out.error = String((e as Error)?.message ?? e).replace(/eyJ[\w.-]+/g, "[token]").slice(0, 300);
  }
  return NextResponse.json(out, { status: out.dbOk ? 200 : 500 });
}
