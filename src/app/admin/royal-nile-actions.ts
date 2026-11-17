"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { rnBook } from "@/lib/royal-nile";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

// Books The Royal Nile Residence for an Egypt Knight guest. The booking lives in the residence's own system;
// here we only send it and show the result.
export async function bookRoyalNile(fd: FormData) {
  const u = await requireStaff("corporate");
  const back = (msg: string, err = false) => redirect(`/admin/royal-nile?${err ? "e" : "n"}=${encodeURIComponent(msg)}`);
  const checkIn = str(fd, "checkIn", 10), checkOut = str(fd, "checkOut", 10);
  if (!ISO.test(checkIn) || !ISO.test(checkOut) || checkOut <= checkIn) return back("Choose a check-in date and a later check-out date.", true);
  const name = str(fd, "name", 80);
  if (name.length < 2) return back("Enter the guest's name.", true);
  const r = await rnBook({ checkIn, checkOut, guests: Number(fd.get("guests")) || 1, name, phone: str(fd, "phone", 30), email: str(fd, "email", 120), notes: str(fd, "notes", 1000), partnerRef: str(fd, "orderRef", 40), staffName: u.name || u.email });
  if (!r.ok) return back(r.error, true);
  try { await db.insert(s.auditLogs).values({ userId: u.uid, action: "CREATE", entity: "royal_nile_booking", entityId: r.data.ref }); } catch { /* the record is optional */ }
  revalidatePath("/admin/royal-nile");
  return back(`Booked at The Royal Nile Residence: ${r.data.ref} · ${r.data.nights} nights · $${r.data.totalUsd}.`);
}
