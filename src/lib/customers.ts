import { eq, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const digits = (v: string) => v.replace(/\D/g, "");
const norm = (col: typeof s.customers.whatsapp | typeof s.customers.phone) => sql`replace(replace(replace(replace(replace(coalesce(${col}, ''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', '')`;

// One rule for "is this the same customer?", used by staff-entered orders and website bookings alike:
// same email; or, when there's no email match, the same WhatsApp/phone number (digits only, so spacing and "+" don't matter).
// A number match is never merged into a record that already has a DIFFERENT email (two people sharing a number, e.g. an agent).
export async function findCustomer(tx: Tx | typeof db, email: string, phone: string) {
  if (email) { const [c] = await tx.select().from(s.customers).where(eq(s.customers.email, email)); if (c) return c; }
  const d = digits(phone); if (d.length < 5) return undefined;
  const [c] = await tx.select().from(s.customers).where(or(eq(norm(s.customers.whatsapp), d), eq(norm(s.customers.phone), d)));
  return c && (!email || !c.email) ? c : undefined;
}
