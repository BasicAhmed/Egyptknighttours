import { client } from "./index";
import { MIGRATION } from "./migration-sql";
import { seedDatabase } from "./seed";
import { seedItineraryTemplates } from "./seed-templates";
import { syncAdminFromEnv } from "./admin-sync";

// Creates any missing tables, then seeds demo content if the database is empty. Safe to call repeatedly and on old databases.
let started: Promise<void> | null = null;
export function ensureDatabase() {
  started ??= run().catch((e) => { started = null; throw e; });
  return started;
}
async function run() {
  const have = new Set((await client.execute("select name from sqlite_master where type='table'")).rows.map((r) => String(r.name)));
  for (const stmt of MIGRATION) {
    const m = /^CREATE TABLE IF NOT EXISTS [`"]?(\w+)[`"]?/i.exec(stmt);
    if (m && have.has(m[1])) continue;
    try { await client.execute(stmt); } catch (e) { if (!/already exists/i.test(String(e))) throw e; }
  }
  const n = await client.execute("select count(*) as n from tours");
  if (Number(n.rows[0].n) === 0) await seedDatabase();
  await seedItineraryTemplates();
  const a = await syncAdminFromEnv();
  if (a.status === "created" || a.status === "updated") console.log(`Admin account ${a.status} from ADMIN_EMAIL / ADMIN_PASSWORD`);
}
