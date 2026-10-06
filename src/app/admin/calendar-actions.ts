"use server";
import { requireStaff } from "@/lib/auth";
import { linkOrigin } from "@/lib/origin";
import { rateLimitPersistent } from "@/lib/rate-limit";
import { viewerFor, saveEvent, moveEvent, setEventDone, deleteEvent, searchLinks, latestOrderOf, createFeed, revokeFeed, feedStatus, type SaveResult, type LinkHit } from "@/lib/calendar";

// What staff do on the calendar. Every action starts from the signed-in staff member.
// Orders are NOT changed from the calendar: their date has a price, a group and a customer email behind it, so it is
// changed in the order's own window.
const me = async () => viewerFor(await requireStaff());

export async function calendarSave(id: string | null, input: unknown): Promise<SaveResult> { try { return await saveEvent(await me(), id ? String(id).slice(0, 60) : null, input); } catch (e) { console.error("calendarSave", e instanceof Error ? e.message : e); return { ok: false, message: "The event could not be saved. Please try again." }; } }
export async function calendarMove(id: string, start: string): Promise<SaveResult> { return moveEvent(await me(), String(id).slice(0, 60), String(start)); }
export async function calendarDone(id: string, done: boolean): Promise<SaveResult> { return setEventDone(await me(), String(id).slice(0, 60), done === true); }
export async function calendarDelete(id: string): Promise<{ ok: boolean; message: string }> { return deleteEvent(await me(), String(id).slice(0, 60)); }
export async function calendarLinks(q: string): Promise<LinkHit[]> { return searchLinks(await me(), String(q ?? "")); }
export async function calendarCustomerOrder(customerId: string): Promise<string | null> { await me(); return latestOrderOf(String(customerId).slice(0, 60)); }

// The private subscription link. Making one answers with the link itself, once; it cannot be read again afterwards.
export async function calendarFeedCreate(): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const u = await requireStaff();
  if (!(await rateLimitPersistent(`calfeed-new:${u.uid}`, 10, 60 * 60_000))) return { ok: false, message: "Too many new links in a short time. Try again in an hour." };
  const token = await createFeed(u.uid);
  return { ok: true, url: `${await linkOrigin()}/api/calendar/${token}.ics` };
}
export async function calendarFeedRevoke(): Promise<{ ok: true }> { const u = await requireStaff(); await revokeFeed(u.uid); return { ok: true }; }
export async function calendarFeedStatus() { const u = await requireStaff(); return feedStatus(u.uid); }
