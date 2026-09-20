import { client } from "./index";
import { MIGRATION } from "./migration-sql";
import { seedDatabase } from "./seed";
import { seedItineraryTemplates } from "./seed-templates";
import { syncAdminFromEnv } from "./admin-sync";
import { applyContentV2 } from "./content-v2";

// Creates any missing tables, then seeds demo content if the database is empty. Safe to call repeatedly and on old databases.
const COLUMNS = [
  { table: "bookings", name: "title_override", ddl: "text" }, { table: "bookings", name: "preferred_language", ddl: "text" }, { table: "bookings", name: "guide_id", ddl: "text" },
  { table: "bookings", name: "driver", ddl: "text" }, { table: "bookings", name: "vehicle", ddl: "text" }, { table: "bookings", name: "flight_arrival", ddl: "text" },
  { table: "bookings", name: "flight_departure", ddl: "text" }, { table: "bookings", name: "room_type", ddl: "text" }, { table: "bookings", name: "pickup_time", ddl: "text" },
  { table: "bookings", name: "occasion", ddl: "text" }, { table: "bookings", name: "emergency_contact", ddl: "text" }, { table: "bookings", name: "visa_status", ddl: "text" },
  { table: "destinations", name: "image_url", ddl: "text" }, { table: "itineraries", name: "tour_id", ddl: "text" }, { table: "customers", name: "nationality", ddl: "text" },
  { table: "travelers", name: "nationality", ddl: "text" }, { table: "travelers", name: "dob", ddl: "text" }, { table: "travelers", name: "passport_number", ddl: "text" },
  { table: "travelers", name: "passport_expiry", ddl: "text" }, { table: "travelers", name: "notes", ddl: "text" },
];
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
  // Columns added after the first release: add them to existing databases once.
  for (const c of COLUMNS) {
    const cols = (await client.execute(`pragma table_info(${c.table})`)).rows.map((r) => String(r.name));
    if (!cols.includes(c.name)) { try { await client.execute(`ALTER TABLE ${c.table} ADD COLUMN ${c.name} ${c.ddl}`); } catch (e) { if (!/duplicate column/i.test(String(e))) throw e; } }
  }
  const n = await client.execute("select count(*) as n from tours");
  if (Number(n.rows[0].n) === 0) await seedDatabase();
  await seedItineraryTemplates();
  await applyContentV2();
  const a = await syncAdminFromEnv();
  if (a.status === "created" || a.status === "updated") console.log(`Admin account ${a.status} from ADMIN_EMAIL / ADMIN_PASSWORD`);
}
