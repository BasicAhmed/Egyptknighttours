"use client";
// The windows the calendar opens: one day, "New", the event editor and the subscription link.
// On a phone each one is a full-screen sheet (see Modal).
import { useEffect, useRef, useState } from "react";
import Modal from "../Modal";
import CopyButton from "../CopyButton";
import { calendarSave, calendarDelete, calendarLinks, calendarFeedCreate, calendarFeedRevoke } from "@/app/admin/calendar-actions";
import { EVENT_TYPES, EVENT_TYPE_LABEL, canBeDone, eventsOn, isISO, longDay, type CalEvent, type EventType, type LinkKind } from "@/lib/calendar-core";
import { EventIcon } from "./skin";
import { EventRow, type Handlers } from "./views";

const Tile = ({ icon, title, sub, onClick, pick }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void; pick: string }) => (
  <button type="button" data-pick={pick} onClick={onClick} className="cal-tile"><span className="cal-tile-ico">{icon}</span><span className="min-w-0"><b>{title}</b><span>{sub}</span></span></button>
);
const OrderGlyph = <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="4" width="14" height="17" rx="2.5" /><path d="M9 4.5V3.6c0-.6.5-1.1 1.1-1.1h3.8c.6 0 1.1.5 1.1 1.1v.9M9 10h6M9 14h6M9 18h3.5" /></svg>;
const EventGlyph = <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5M12 12.5v5M9.5 15h5" /></svg>;

// ---------- "New": an order on that day, or an event ----------
export function AddSheet({ day, canOrder, onOrder, onEvent, onClose }: { day: string; canOrder: boolean; onOrder: (day: string) => void; onEvent: (day: string) => void; onClose: () => void }) {
  const [d, setD] = useState(day); const ok = isISO(d);
  return (
    <Modal onClose={onClose} title="New" subtitle={ok ? `On ${longDay(d)}` : "Choose a day"}>
      <label className="label" htmlFor="cal-add-day">Day</label>
      <input id="cal-add-day" type="date" className="input" value={d} onChange={(e) => setD(e.target.value)} />
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {canOrder && <Tile pick="order" icon={OrderGlyph} title="New order" sub="For a customer, with this date filled in" onClick={() => ok && onOrder(d)} />}
        <Tile pick="event" icon={EventGlyph} title="New event" sub="A meeting, reminder, task or closed day" onClick={() => ok && onEvent(d)} />
      </div>
      <p className="mt-4 text-[13px] text-ink/60">An order is created in the usual new-order window. Events are your team&apos;s own notes on the calendar: they change nothing about bookings.</p>
    </Modal>
  );
}

// ---------- one day: everything on it ----------
export function DaySheet({ day, today, events, closed, h, canOrder, onOrder, onEvent, onClose }: { day: string; today: string; events: CalEvent[]; closed: boolean; h: Handlers; canOrder: boolean; onOrder: (day: string) => void; onEvent: (day: string) => void; onClose: () => void }) {
  const list = eventsOn(events, day);
  return (
    <Modal onClose={onClose} title={longDay(day)} subtitle={`${day === today ? "Today. " : ""}${closed ? "Closed. " : ""}${list.length ? `${list.length} event${list.length === 1 ? "" : "s"}` : "Nothing planned"}`}>
      <div className="cal" data-day-sheet={day}>
        {list.length ? <ul className="cal-rows">{list.map((e) => <EventRow key={e.id} e={e} day={day} h={h} />)}</ul> : <div className="cal-empty"><b>Nothing on this day</b>Add an order or an event below.</div>}
        <div className="cal-sheet-foot">
          {canOrder && <button type="button" className="btn btn-outline flex-1" data-new="order" onClick={() => onOrder(day)}>New order</button>}
          <button type="button" className="btn btn-outline flex-1" data-new="event" onClick={() => onEvent(day)}>New event</button>
          <button type="button" className="btn btn-primary flex-1" onClick={() => h.goDay(day)}>Open day</button>
        </div>
      </div>
    </Modal>
  );
}

// ---------- the event editor ----------
type Link = { kind: LinkKind; id: string; label: string };
const LINK_WORD: Record<LinkKind, string> = { order: "Order", customer: "Customer" };
const newKey = () => { try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`; } };
export function EventEditor({ event, day, staff, me, onClose, onSaved, onDeleted, onOpenLink }: {
  event: CalEvent | null; day: string; staff: { id: string; name: string }[]; me: string;
  onClose: () => void; onSaved: (e: CalEvent, created: boolean) => void; onDeleted: (id: string) => void; onOpenLink: (l: Link) => void;
}) {
  const id = event ? event.open.id : null; const locked = !!event && !event.canEdit;
  const [v, setV] = useState({ title: event?.title ?? "", type: (event?.sub as EventType) ?? "MEETING", startDate: event?.start ?? day, endDate: event && event.end !== event.start ? event.end : "", time: event?.time ?? "", notes: event?.notes ?? "", assigneeId: event?.assigneeId ?? "", done: !!event?.done });
  const [link, setLink] = useState<Link | null>(event?.link ?? null);
  const [q, setQ] = useState(""); const [hits, setHits] = useState<Link[] | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [sure, setSure] = useState(false);
  // One key per opened form: sending the same form twice (a double tap, a retry on a slow line) makes one event.
  const key = useRef(newKey()); const sending = useRef(false);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));
  useEffect(() => { const needle = q.trim(); if (needle.length < 2) { setHits(null); return; } let alive = true; const t = setTimeout(() => { calendarLinks(needle).then((r) => { if (alive) setHits(r); }).catch(() => { if (alive) setHits([]); }); }, 250); return () => { alive = false; clearTimeout(t); }; }, [q]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (sending.current || locked) return; setErr("");
    if (!v.title.trim()) { setErr("Give the event a title."); return; }
    if (v.endDate && v.endDate < v.startDate) { setErr("The end date is before the start date."); return; }
    sending.current = true; setBusy(true);
    try {
      const r = await calendarSave(id, { ...v, linkKind: link?.kind ?? "", linkId: link?.id ?? "", clientKey: key.current });
      if (r.ok) onSaved(r.event, !id); else setErr(r.message);
    } catch { setErr("Something went wrong. Please try again."); } finally { sending.current = false; setBusy(false); }
  }
  async function remove() { if (!id || sending.current) return; sending.current = true; setBusy(true); try { const r = await calendarDelete(id); if (r.ok) onDeleted(id); else setErr(r.message); } catch { setErr("Something went wrong. Please try again."); } finally { sending.current = false; setBusy(false); } }
  const holiday = v.type === "HOLIDAY";
  return (
    <Modal onClose={onClose} title={event ? (locked ? "Event" : "Edit event") : "New event"} subtitle={event?.by ? `Added by ${event.by}` : "Your team's own entry on the calendar"}>
      <form onSubmit={submit} noValidate className="cal-form" data-event-form={id ?? "new"}>
        <fieldset disabled={locked || busy} className="grid gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label" htmlFor="ce-title">Title</label><input id="ce-title" className="input" maxLength={120} required value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Team meeting, call the hotel, office closed" autoFocus={!event} /></div>
          <div className="sm:col-span-2"><span className="label" id="ce-type-l">Type</span>
            <div className="cal-types" role="radiogroup" aria-labelledby="ce-type-l">
              {EVENT_TYPES.map((t) => <button key={t} type="button" role="radio" aria-checked={v.type === t} data-type={t} className={`cal-type cal-ev ${v.type === t ? "on" : ""}`} data-kind="custom" data-sub={t} onClick={() => set("type", t)}><EventIcon e={{ kind: "custom", sub: t, mark: "" }} size={16} />{EVENT_TYPE_LABEL[t]}</button>)}
            </div>
            {holiday && <p className="mt-1.5 text-[13px] text-ink/60">The day is shown shaded as closed. It does not stop bookings or change any order.</p>}
          </div>
          <div><label className="label" htmlFor="ce-start">{v.endDate ? "From" : "Date"}</label><input id="ce-start" type="date" className="input" required value={v.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
          <div><label className="label" htmlFor="ce-end">Until (optional)</label><input id="ce-end" type="date" className="input" min={v.startDate || undefined} value={v.endDate} onChange={(e) => set("endDate", e.target.value)} /></div>
          {!holiday && <div><label className="label" htmlFor="ce-time">Time (empty = all day)</label><input id="ce-time" type="time" className="input" value={v.time} onChange={(e) => set("time", e.target.value)} /></div>}
          <div className={holiday ? "sm:col-span-2" : ""}><label className="label" htmlFor="ce-who">Assigned to</label><select id="ce-who" className="input" value={v.assigneeId} onChange={(e) => set("assigneeId", e.target.value)}><option value="">Nobody in particular</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}{s.id === me ? " (me)" : ""}</option>)}</select></div>
          <div className="sm:col-span-2"><span className="label" id="ce-link-l">Linked to (optional)</span>
            {link ? <div className="cal-link"><span className="min-w-0 flex-1 truncate"><b>{LINK_WORD[link.kind]}</b> {link.label}</span><button type="button" className="cal-link-btn" onClick={() => onOpenLink(link)}>Open</button>{!locked && <button type="button" className="cal-link-btn" aria-label={`Remove the link to ${link.label}`} onClick={() => setLink(null)}>Remove</button>}</div>
              : <><input aria-labelledby="ce-link-l" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search an order or a customer" autoComplete="off" />
                {hits && <ul className="cal-hits" aria-label="Matches">{hits.length ? hits.map((x) => <li key={x.kind + x.id}><button type="button" data-hit={x.kind} onClick={() => { setLink(x); setQ(""); setHits(null); }}><b>{LINK_WORD[x.kind]}</b> {x.label}</button></li>) : <li className="px-3 py-2.5 text-[13.5px] text-ink/60">Nothing matches.</li>}</ul>}</>}
          </div>
          <div className="sm:col-span-2"><label className="label" htmlFor="ce-notes">Notes</label><textarea id="ce-notes" className="input" rows={3} maxLength={1000} value={v.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          {canBeDone(v.type) && <label className="cal-check sm:col-span-2"><input type="checkbox" checked={v.done} onChange={(e) => set("done", e.target.checked)} /><span>Done</span></label>}
        </fieldset>
        {locked && <p className="mt-3 rounded-xl bg-ink/[.05] p-3 text-[13.5px]">Only {event?.by || "the person who added it"}, an owner or a manager can change this event.</p>}
        {err && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{err}</p>}
        <div className="cal-form-foot">
          {!locked && <button className="btn btn-primary flex-1" disabled={busy}>{busy ? "Saving…" : event ? "Save" : "Add event"}</button>}
          <button type="button" className="btn btn-outline" onClick={onClose}>{locked ? "Close" : "Cancel"}</button>
          {event && !locked && (sure ? <button type="button" className="btn cal-danger" disabled={busy} data-confirm-delete onClick={remove}>Yes, delete</button> : <button type="button" className="btn btn-outline cal-danger-text" onClick={() => setSure(true)}>Delete</button>)}
        </div>
      </form>
    </Modal>
  );
}

// ---------- the private subscription link ----------
export type FeedState = { active: boolean; createdAt: number | null; lastUsedAt: number | null };
const when = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
export function SubscribeSheet({ feed, canMoney, onClose }: { feed: FeedState; canMoney: boolean; onClose: () => void }) {
  const [st, setSt] = useState(feed); const [url, setUrl] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [sure, setSure] = useState(false);
  async function make() { setBusy(true); setErr(""); try { const r = await calendarFeedCreate(); if (r.ok) { setUrl(r.url); setSt({ active: true, createdAt: Date.now(), lastUsedAt: null }); setSure(false); } else setErr(r.message); } catch { setErr("Something went wrong. Please try again."); } finally { setBusy(false); } }
  async function off() { setBusy(true); setErr(""); try { await calendarFeedRevoke(); setUrl(""); setSt({ active: false, createdAt: null, lastUsedAt: null }); setSure(false); } catch { setErr("Something went wrong. Please try again."); } finally { setBusy(false); } }
  return (
    <Modal onClose={onClose} title="Subscribe in your own calendar" subtitle="Google, Apple or Outlook calendar on your phone or computer">
      <div className="cal-sub" data-feed={st.active ? "on" : "off"}>
        <p>A private link that shows this calendar in the calendar app you already use. It updates by itself (most apps check every few hours) and is read-only: changes are still made here.</p>
        <ul className="cal-sub-list"><li>It shows what <b>you</b> may see here{canMoney ? ", including when a payment is due" : ""}.</li><li>It never carries prices, amounts or passport details.</li><li>Anyone who has the link can read it. If it gets out, make a new one: the old one stops working at once.</li></ul>
        {url ? <div className="cal-sub-box" data-feed-url>
          <label className="label" htmlFor="cal-feed-url">Your link (shown only now, so copy it)</label>
          <input id="cal-feed-url" readOnly className="input font-mono !text-[12.5px]" value={url} onFocus={(e) => e.currentTarget.select()} />
          <div className="mt-2.5 flex flex-wrap gap-2"><CopyButton text={url} label="Copy link" className="btn btn-primary" /><a className="btn btn-outline" href={url.replace(/^https?:/, "webcal:")}>Open in my calendar app</a></div>
          <p className="mt-3 text-[13px] text-ink/60"><b>Google Calendar:</b> Other calendars, +, From URL, paste. <b>Apple:</b> Calendar, Add subscription calendar (or the button above). <b>Outlook:</b> Add calendar, Subscribe from web.</p>
        </div> : st.active ? <div className="cal-sub-box"><p><b>Your link is on.</b> Made on {when(st.createdAt)}{st.lastUsedAt ? `, last read by a calendar app on ${when(st.lastUsedAt)}` : ", not read by a calendar app yet"}.</p><p className="mt-1 text-[13px] text-ink/60">For your safety the link is only shown when it is made. Lost it? Make a new one.</p></div>
          : <div className="cal-sub-box"><p>You have no link yet.</p></div>}
        {err && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{err}</p>}
        <div className="cal-form-foot">
          {!st.active ? <button type="button" className="btn btn-primary flex-1" disabled={busy} data-feed-make onClick={make}>{busy ? "Making…" : "Create my link"}</button>
            : sure ? <><button type="button" className="btn btn-primary flex-1" disabled={busy} data-feed-new onClick={make}>Yes, replace it</button><button type="button" className="btn cal-danger" disabled={busy} data-feed-off onClick={off}>Switch it off</button><button type="button" className="btn btn-outline" onClick={() => setSure(false)}>Keep it</button></>
            : <><button type="button" className="btn btn-outline flex-1" disabled={busy} data-feed-change onClick={() => setSure(true)}>New link or switch off…</button><button type="button" className="btn btn-outline" onClick={onClose}>Done</button></>}
        </div>
        {sure && <p className="mt-2 text-[13px] text-ink/60">Replacing or switching off stops the current link everywhere it is used.</p>}
      </div>
    </Modal>
  );
}
