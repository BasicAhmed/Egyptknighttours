import { createHash } from "node:crypto";
import { client } from "./index";
import { MIGRATION } from "./migration-sql";
import { seedDatabase } from "./seed";
import { seedItineraryTemplates } from "./seed-templates";
import { syncAdminFromEnv } from "./admin-sync";
import { applyContentV2 } from "./content-v2";
import { applyContentV3, CONTENT_VERSION } from "./content-v3";

// Columns added after the first release: add them to existing databases once.
const COLUMNS = [
  { table: "bookings", name: "title_override", ddl: "text" }, { table: "bookings", name: "preferred_language", ddl: "text" }, { table: "bookings", name: "guide_id", ddl: "text" },
  { table: "bookings", name: "driver", ddl: "text" }, { table: "bookings", name: "vehicle", ddl: "text" }, { table: "bookings", name: "flight_arrival", ddl: "text" },
  { table: "bookings", name: "flight_departure", ddl: "text" }, { table: "bookings", name: "room_type", ddl: "text" }, { table: "bookings", name: "pickup_time", ddl: "text" },
  { table: "bookings", name: "occasion", ddl: "text" }, { table: "bookings", name: "emergency_contact", ddl: "text" }, { table: "bookings", name: "visa_status", ddl: "text" }, { table: "bookings", name: "guide_notes", ddl: "text" }, { table: "bookings", name: "cost_total", ddl: "real" },
  { table: "tours", name: "price_mode", ddl: "text NOT NULL DEFAULT 'MANUAL'" }, { table: "tours", name: "cost_price", ddl: "real" }, { table: "tours", name: "margin_percent", ddl: "real" },
  { table: "itineraries", name: "cost_price", ddl: "real" }, { table: "itineraries", name: "margin_percent", ddl: "real" }, { table: "itineraries", name: "intent", ddl: "text NOT NULL DEFAULT 'pdf'" },
  { table: "destinations", name: "image_url", ddl: "text" }, { table: "itineraries", name: "tour_id", ddl: "text" }, { table: "customers", name: "nationality", ddl: "text" },
  { table: "guides", name: "faqs", ddl: "text NOT NULL DEFAULT '[]'" }, { table: "guides", name: "related", ddl: "text NOT NULL DEFAULT ''" }, { table: "guides", name: "is_pillar", ddl: "integer NOT NULL DEFAULT 0" }, { table: "guides", name: "keywords", ddl: "text NOT NULL DEFAULT ''" },
  { table: "travelers", name: "nationality", ddl: "text" }, { table: "travelers", name: "dob", ddl: "text" }, { table: "travelers", name: "passport_number", ddl: "text" },
  { table: "travelers", name: "passport_expiry", ddl: "text" }, { table: "travelers", name: "notes", ddl: "text" },
];
// Changes whenever the schema or content version changes. When it matches what is stored, a start does two tiny reads and nothing else.
export const BOOT_STATE = createHash("sha256").update(JSON.stringify([MIGRATION, COLUMNS])).digest("hex").slice(0, 12) + `:c${CONTENT_VERSION}`;

let started: Promise<void> | null = null;
export function ensureDatabase() {
  started ??= run().catch((e) => { started = null; throw e; });
  return started;
}
async function readState() {
  try {
    const r = await client.execute("select key, value from settings where key in ('boot.state','admin.envhash')");
    return Object.fromEntries(r.rows.map((x) => [String(x.key), String(x.value)])) as Record<string, string | undefined>;
  } catch { return {} as Record<string, string | undefined>; } // settings table doesn't exist yet: first run
}
async function migrate() {
  const have = new Set((await client.execute("select name from sqlite_master where type in ('table','index')")).rows.map((r) => String(r.name)));
  for (const stmt of MIGRATION) {
    const m = /^CREATE (?:UNIQUE )?(?:TABLE|INDEX) IF NOT EXISTS [`"]?(\w+)[`"]?/i.exec(stmt);
    if (m && have.has(m[1])) continue;
    try { await client.execute(stmt); } catch (e) { if (!/already exists/i.test(String(e))) throw e; }
  }
  for (const c of COLUMNS) {
    const cols = (await client.execute(`pragma table_info(${c.table})`)).rows.map((r) => String(r.name));
    if (!cols.includes(c.name)) { try { await client.execute(`ALTER TABLE ${c.table} ADD COLUMN ${c.name} ${c.ddl}`); } catch (e) { if (!/duplicate column/i.test(String(e))) throw e; } }
  }
  const n = await client.execute("select count(*) as n from tours");
  if (Number(n.rows[0].n) === 0) await seedDatabase();
  await seedItineraryTemplates(); await applyContentV2(); await applyContentV3();
  await client.execute({ sql: "insert into settings(key,value) values('boot.state',?) on conflict(key) do update set value=excluded.value", args: [BOOT_STATE] });
}
async function run() {
  const st = await readState();
  if (st["boot.state"] !== BOOT_STATE) await migrate();
  const a = await syncAdminFromEnv(st["admin.envhash"]);
  if (a.status === "created" || a.status === "updated") console.log(`Admin account ${a.status} from ADMIN_EMAIL / ADMIN_PASSWORD`);
}
