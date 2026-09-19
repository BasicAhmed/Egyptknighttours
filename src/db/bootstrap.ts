import { client } from "./index";
import { MIGRATION, EXTRA } from "./migration-sql";
import { seedDatabase } from "./seed";

// Creates tables (first run only) and seeds demo content if the database is empty. Safe to call repeatedly.
let started: Promise<void> | null = null;
export function ensureDatabase() {
  started ??= run().catch((e) => { started = null; throw e; });
  return started;
}
async function run() {
  const t = await client.execute("select name from sqlite_master where type='table' and name='tours'");
  if (!t.rows.length) {
    for (const stmt of MIGRATION) {
      try { await client.execute(stmt); } catch (e) { if (!String(e).includes("already exists")) throw e; }
    }
    console.log("Database tables created");
  }
  for (const stmt of EXTRA) await client.execute(stmt);
  const n = await client.execute("select count(*) as n from tours");
  if (Number(n.rows[0].n) === 0) await seedDatabase();
}
