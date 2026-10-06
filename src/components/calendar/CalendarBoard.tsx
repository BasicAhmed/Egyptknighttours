"use client";
// The Calendar page of the staff panel: orders on their real dates, corporate requests, payment deadlines and the team's
// own events, in a month, a week, a day or an agenda.
// What is on which day is decided on the server (src/lib/calendar.ts) and by the shared rules in src/lib/calendar-core.ts;
// this file is the page around it: the bar on top, the filters, and which window a tap opens.
// An order opens in the SAME order window as on the Orders list, and is changed there: nothing here moves an order's date.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../Modal";
import OrderModal from "../OrderModal";
import { NewOrder } from "../OrdersBoard";
import { rowFromOrder } from "../order-ui";
import type { Order, OrderRow } from "@/lib/orders";
import { calendarCustomerOrder, calendarDone, calendarMove } from "@/app/admin/calendar-actions";
import { KINDS, KIND_LABEL, MONTHS, NO_FILTERS, STAGES, STAGE_LABEL, VIEWS, activeFilters, addDays, diffDays, monthGrid, monthName, shortDay, viewTitle, weekDays, type CalEvent, type Filters, type Kind, type StageKey, type View } from "@/lib/calendar-core";
import { useCalendar, type Chunk } from "./state";
import { Agenda, DayView, MiniMonth, MonthGrid, WeekView, type Handlers } from "./views";
import { AddSheet, DaySheet, EventEditor, SubscribeSheet, type FeedState } from "./sheets";
import { CalIcon, KIND_ICON, STAGE_LEGEND } from "./skin";

export type CalendarProps = {
  initial: Chunk[]; view: View | null; date: string | null; filters: Filters; serverToday: string; phoneGuess: boolean;
  me: { uid: string; name: string }; can: { orders: boolean; finance: boolean; partner: boolean; deadlines: boolean };
  guides: { id: string; name: string }[]; staff: { id: string; name: string }[]; tours: { id: string; title: string }[]; feed: FeedState;
};
const VIEW_LABEL: Record<View, string> = { month: "Month", week: "Week", day: "Day", agenda: "Agenda" };
type Sheet = { t: "day"; day: string } | { t: "add"; day: string } | { t: "event"; event: CalEvent | null; day: string } | { t: "order"; day: string } | { t: "feed" } | null;

// The order window is the one the Orders list opens. It draws from the order's list row, so the order is read first.
function OrderWindow({ id, canFinance, onClose, onChanged }: { id: string; canFinance: boolean; onClose: () => void; onChanged: () => void }) {
  const [row, setRow] = useState<OrderRow | null>(null); const [gone, setGone] = useState(false);
  useEffect(() => { let alive = true; fetch(`/api/admin/orders/${id}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("load")))).then((o: Order) => { if (alive) setRow(rowFromOrder(o)); }).catch(() => { if (alive) setGone(true); }); return () => { alive = false; }; }, [id]);
  if (gone) return <Modal onClose={onClose} title="Order"><p className="text-sm">This order could not be opened. It may have been deleted.</p></Modal>;
  if (!row) return <div className="cal-wait" role="status">Opening the order…</div>;
  return <OrderModal key={id} row={row} onClose={onClose} onChanged={(o) => { setRow(rowFromOrder(o)); onChanged(); }} canFinance={canFinance} />;
}

export default function CalendarBoard(p: CalendarProps) {
  const router = useRouter();
  const cal = useCalendar({ initial: p.initial, view: p.view, date: p.date, filters: p.filters, serverToday: p.serverToday, phoneGuess: p.phoneGuess });
  const { wide, today, view, date, filters, events, counts, closed } = cal;
  const [sheet, setSheet] = useState<Sheet>(null);
  const [order, setOrder] = useState<{ id: string; back: string | null } | null>(null); // back: the day sheet to return to
  const [showFilters, setShowFilters] = useState(false); const [jump, setJump] = useState(false); const [strip, setStrip] = useState(false);
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4500); return () => clearTimeout(t); }, [toast]);
  // Several things can report a change in the same moment (the order window does when it opens): one reload for all of them.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reloadSoon = useCallback(() => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { void cal.reload(); }, 350); }, [cal]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // ----- what a tap does -----
  const openOrder = useCallback((id: string) => { setOrder({ id, back: sheet?.t === "day" ? sheet.day : null }); setSheet(null); }, [sheet]);
  const h: Handlers = useMemo(() => ({
    open: (e) => {
      if (e.open.type === "custom") setSheet({ t: "event", event: e, day: e.start });
      else if (e.open.type === "order") openOrder(e.open.id);
      else router.push(`/admin/corporate/${e.open.id}`);
    },
    openDay: (d) => { cal.setDate(d, false); setSheet({ t: "day", day: d }); },
    goDay: (d) => { setSheet(null); cal.go("day", d); },
    add: (d) => setSheet({ t: "add", day: d }),
    toggleDone: (e) => {
      const done = !e.done; cal.patch((list) => list.map((x) => (x.id === e.id ? { ...x, done } : x)));
      calendarDone(e.open.id, done).then((r) => { if (!r.ok) { setToast({ t: r.message, ok: false }); void cal.reload(); } }).catch(() => { setToast({ t: "That could not be saved. Please try again.", ok: false }); void cal.reload(); });
    },
    move: wide ? (e, start) => {
      const by = diffDays(e.start, start); cal.patch((list) => list.map((x) => (x.id === e.id ? { ...x, start, end: addDays(x.end, by) } : x)));
      calendarMove(e.open.id, start).then((r) => { setToast(r.ok ? { t: `"${e.title}" moved to ${shortDay(start)}.`, ok: true } : { t: r.message, ok: false }); void cal.reload(); }).catch(() => { setToast({ t: "The event could not be moved. Please try again.", ok: false }); void cal.reload(); });
    } : undefined,
  }), [cal, wide, router, openOrder]);
  const openLink = (l: { kind: string; id: string }) => {
    if (l.kind === "order") openOrder(l.id);
    else void calendarCustomerOrder(l.id).then((id) => (id ? openOrder(id) : setToast({ t: "This customer has no orders to open.", ok: false })));
  };

  // ----- how many lanes of bars a month row has room for -----
  const weeks = useMemo(() => monthGrid(date).length, [date]); const [lanes, setLanes] = useState(4);
  useEffect(() => { const fit = () => setLanes(Math.max(3, Math.min(6, Math.floor(((window.innerHeight - 250) / weeks - 31) / 23)))); fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit); }, [weeks]);

  // The agenda opens at the chosen day (today, the first time), not at the 1st of the month.
  const scrolled = useRef("");
  const toDay = useCallback((d: string, smooth = false) => { const all = [...document.querySelectorAll<HTMLElement>("[data-agenda-day]")]; const el = all.find((x) => x.dataset.agendaDay! >= d) ?? all[all.length - 1]; el?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "instant" }); }, []);
  useEffect(() => { const k = `${view}|${cal.month}`; if (view !== "agenda" || cal.loading || scrolled.current === k) return; scrolled.current = k; if (date.slice(8) === "01") return; toDay(date);
    // The list can still change height for a moment after it is drawn (the font arriving, the screen size being read): keep
    // the chosen day in place until it settles, and let go the moment the person scrolls themselves.
    const list = document.querySelector(".cal-agenda"); if (!list || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => toDay(date)); ro.observe(list);
    const stop = () => { ro.disconnect(); window.clearTimeout(t); for (const ev of ["wheel", "touchstart", "keydown", "mousedown"]) window.removeEventListener(ev, stop); };
    const t = window.setTimeout(stop, 2000); for (const ev of ["wheel", "touchstart", "keydown", "mousedown"]) window.addEventListener(ev, stop, { passive: true });
    void document.fonts?.ready.then(() => { if (scrolled.current === k) requestAnimationFrame(() => { if (list.isConnected && t) toDay(date); }); });
    return stop; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [view, cal.month, cal.loading]);
  const pick = (d: string) => { cal.setDate(d, false); if (view === "agenda" || (view === "week" && !wide)) setTimeout(() => toDay(d, true), 30); };

  const set = (f: Partial<Filters>) => cal.setFilters({ ...filters, ...f });
  const toggleKind = (k: Kind) => set({ kinds: filters.kinds.includes(k) ? filters.kinds.filter((x) => x !== k) : [...filters.kinds, k] });
  const kinds = KINDS.filter((k) => (k !== "partner" || p.can.partner) && (k !== "deadline" || p.can.deadlines));
  const narrowed = activeFilters(filters) + (filters.q.trim() ? 1 : 0);
  const title = viewTitle(view, date);
  const agendaDays = useMemo(() => { const out: string[] = []; for (let d = cal.range.from; d <= cal.range.to; d = addDays(d, 1)) out.push(d); return out; }, [cal.range]);
  const emptyNote = <><b>{narrowed ? "Nothing matches these filters" : `Nothing planned in ${view === "week" ? "this week" : monthName(date)}`}</b>{narrowed ? "Clear the filters to see everything." : "Orders appear here on their travel dates. Add an event with New."}</>;
  const mini = (oneWeek: boolean, numbers = false) => <MiniMonth date={date} today={today} counts={counts} closed={closed} onPick={numbers || view === "day" ? (d) => cal.setDate(d, false) : pick} oneWeek={oneWeek} numbers={numbers} onKey={cal.onKey} />;
  const search = (cls: string) => <div className={`cal-search ${cls}`}><CalIcon name="search" /><input aria-label="Search the calendar" value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search customer or booking ID" className="input" /></div>;
  const sub = cal.loading ? "Loading…" : `${events.length} ${events.length === 1 ? "item" : "items"} ${view === "day" ? "on this day" : view === "week" ? "this week" : `in ${monthName(date)}`}${narrowed ? ", filtered" : ""}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><h1 className="font-display text-[26px] font-extrabold leading-tight sm:text-[32px]">Calendar</h1><p className="text-sm text-ink/60" data-count>{sub}</p></div>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="btn btn-outline !px-3 sm:!px-4" data-subscribe aria-label="Subscribe in my calendar app" title="Subscribe in my calendar app" onClick={() => setSheet({ t: "feed" })}><CalIcon name="calendar" /><span className="hidden sm:inline">Subscribe</span></button>
          <button type="button" className="btn btn-primary" data-new onClick={() => setSheet({ t: "add", day: date })}><span aria-hidden="true" className="-ml-0.5 text-lg leading-none">+</span>New</button>
        </div>
      </div>

      <div className="cal-tools">
        <div className="cal-nav">
          <button type="button" className="cal-icon-btn" aria-label={`Previous ${view === "agenda" ? "month" : view}`} data-nav="prev" onClick={cal.prev}><CalIcon name="left" /></button>
          <div className="relative min-w-0 flex-1 lg:flex-none">
            <button type="button" className="cal-title" aria-haspopup="dialog" aria-expanded={jump} data-title onClick={() => setJump((v) => !v)}><span aria-live="polite">{title}</span><CalIcon name="down" size={16} /></button>
            {jump && <Jump date={date} today={today} onPick={(d) => { cal.setDate(d); setJump(false); }} onClose={() => setJump(false)} />}
          </div>
          <button type="button" className="cal-icon-btn" aria-label={`Next ${view === "agenda" ? "month" : view}`} data-nav="next" onClick={cal.next}><CalIcon name="right" /></button>
          <button type="button" className="btn btn-outline" data-nav="today" onClick={cal.toToday} aria-label={`Today, ${shortDay(today)}`}>Today</button>
        </div>
        <div className="cal-right">
          {search("hidden lg:block")}
          <div className="seg" role="tablist" aria-label="Calendar view">{(wide ? VIEWS : (["agenda", "month", "week", "day"] as View[])).map((v) => <button key={v} type="button" role="tab" aria-selected={view === v} data-view={v} onClick={() => cal.setView(v)}>{VIEW_LABEL[v]}</button>)}</div>
          <button type="button" className="btn btn-outline shrink-0 !px-3.5" aria-expanded={showFilters || narrowed > 0} aria-controls="cal-filters" data-filter-toggle onClick={() => setShowFilters((v) => !v)}><CalIcon name="filter" />Filter{narrowed > 0 ? <span className="rounded-full bg-ink px-1.5 text-[11px] font-bold leading-[18px] text-white">{narrowed}<span className="sr-only"> on</span></span> : null}</button>
        </div>
      </div>
      {(showFilters || narrowed > 0) && <div id="cal-filters" className="cal-filters">
        {search("basis-full lg:hidden")}
        <div className="cal-kinds" role="group" aria-label="Show">
          {kinds.map((k) => { const on = !filters.kinds.length || filters.kinds.includes(k); return <button key={k} type="button" aria-pressed={filters.kinds.includes(k)} data-kind-filter={k} className={`cal-kind cal-ev ${on ? "" : "off"}`} data-kind={k} onClick={() => toggleKind(k)} title={filters.kinds.includes(k) ? `Showing ${KIND_LABEL[k].toLowerCase()}. Tap to stop narrowing to them.` : `Show only ${KIND_LABEL[k].toLowerCase()}`}><CalIcon name={KIND_ICON[k]} size={15} />{KIND_LABEL[k]}<span className="n">{cal.kindCounts[k] ?? 0}</span></button>; })}
        </div>
        <select aria-label="Order status" className="input" value={filters.stage} onChange={(e) => set({ stage: e.target.value as StageKey | "" })}><option value="">Any status</option>{STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select>
        {p.guides.length > 0 && <select aria-label="Guide" className="input" value={filters.guide} onChange={(e) => set({ guide: e.target.value })}><option value="">Any guide</option>{p.guides.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>}
        <select aria-label="Assigned to" className="input" value={filters.assignee} onChange={(e) => set({ assignee: e.target.value })}><option value="">Any assignee</option>{p.staff.map((s) => <option key={s.id} value={s.id}>{s.id === p.me.uid ? "Me" : s.name}</option>)}</select>
        <label className="cal-check"><input type="checkbox" checked={filters.cancelled} data-filter="cancelled" onChange={(e) => set({ cancelled: e.target.checked })} /><span>Show cancelled</span></label>
        {narrowed > 0 && <button type="button" className="min-h-[44px] px-2 text-sm font-semibold underline underline-offset-4" data-filter="clear" onClick={() => cal.setFilters({ ...NO_FILTERS })}>Clear filters</button>}
      </div>}

      <div className={`cal mt-4 ${cal.loading ? "is-loading" : ""}`} data-view={view} data-date={date} data-ready={cal.loading ? "0" : "1"}>
        {cal.error && <p role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800">{cal.error}<button type="button" className="underline underline-offset-4" onClick={() => void cal.reload()}>Try again</button></p>}
        {wide ? (
          view === "month" ? <MonthGrid date={date} today={today} events={events} closed={closed} maxLanes={lanes} h={h} onKey={cal.onKey} />
          : view === "week" ? <WeekView date={date} today={today} events={events} closed={closed} h={h} onKey={cal.onKey} />
          : <div className="cal-split"><aside className="cal-aside">{mini(false)}</aside><div className="min-w-0 flex-1">{view === "day" ? <DayView date={date} today={today} events={events} closed={closed} h={h} /> : <Agenda days={agendaDays} today={today} events={events} closed={closed} h={h} limit={12} empty={emptyNote} />}</div></div>
        ) : (
          <>
            {view === "month" ? <div className="cal-strip">{mini(false, true)}</div> : <div className="cal-strip sticky">{mini(!strip)}<button type="button" className="cal-strip-toggle" aria-expanded={strip} onClick={() => setStrip((v) => !v)}><CalIcon name="down" size={16} className={strip ? "rotate-180" : ""} />{strip ? "Show one week" : "Show the month"}</button></div>}
            {view === "month" || view === "day" ? <DayView date={date} today={today} events={events.filter((e) => e.start <= date && e.end >= date)} closed={closed} h={h} />
              : <Agenda days={view === "week" ? weekDays(date) : agendaDays} today={today} events={events} closed={closed} h={h} empty={emptyNote} />}
          </>
        )}
        <Legend kinds={kinds} />
      </div>

      {sheet?.t === "day" && <DaySheet day={sheet.day} today={today} events={events} closed={closed.has(sheet.day)} h={h} canOrder={p.can.orders} onOrder={(d) => setSheet({ t: "order", day: d })} onEvent={(d) => setSheet({ t: "event", event: null, day: d })} onClose={() => setSheet(null)} />}
      {sheet?.t === "add" && <AddSheet day={sheet.day} canOrder={p.can.orders} onOrder={(d) => setSheet({ t: "order", day: d })} onEvent={(d) => setSheet({ t: "event", event: null, day: d })} onClose={() => setSheet(null)} />}
      {sheet?.t === "event" && <EventEditor key={sheet.event?.id ?? `new-${sheet.day}`} event={sheet.event} day={sheet.day} staff={p.staff} me={p.me.uid} onClose={() => setSheet(null)} onOpenLink={openLink}
        onSaved={(e, created) => { setSheet(null); setToast({ t: created ? `"${e.title}" added on ${shortDay(e.start)}.` : "Event saved.", ok: true }); void cal.reload(); }}
        onDeleted={(id) => { setSheet(null); cal.patch((list) => list.filter((x) => x.id !== `c:${id}`)); setToast({ t: "Event deleted.", ok: true }); void cal.reload(); }} />}
      {sheet?.t === "feed" && <SubscribeSheet feed={p.feed} canMoney={p.can.deadlines} onClose={() => setSheet(null)} />}
      {sheet?.t === "order" && <NewOrder tours={p.tours} date={sheet.day} onClose={() => setSheet(null)} onCreated={(o) => {
        setSheet(null); void cal.reload();
        // The same next step as on the Orders list: an order with no price yet goes to its itinerary; one already priced opens.
        if (o.total > 0) setOrder({ id: o.id, back: null }); else router.push(`/admin/itineraries/new?bookingId=${o.id}`);
      }} />}
      {order && <OrderWindow key={order.id} id={order.id} canFinance={p.can.finance} onChanged={reloadSoon}
        onClose={() => { const back = order.back; setOrder(null); void cal.reload(); if (back) setSheet({ t: "day", day: back }); }} />}
      {toast && <div role="status" className={`cal-toast ${toast.ok ? "" : "bad"}`}>{toast.t}</div>}
    </div>
  );
}

// Jump to a month and year (or straight to a date).
function Jump({ date, today, onPick, onClose }: { date: string; today: string; onPick: (d: string) => void; onClose: () => void }) {
  const [year, setYear] = useState(Number(date.slice(0, 4))); const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (e: Event) => { if (!box.current?.parentElement?.contains(e.target as Node)) onClose(); }; const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", away); document.addEventListener("touchstart", away, { passive: true }); document.addEventListener("keydown", key); box.current?.querySelector<HTMLElement>("[aria-pressed=true]")?.focus();
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("touchstart", away); document.removeEventListener("keydown", key); };
  }, [onClose]);
  const day = date.slice(8, 10); const to = (m: number) => { const ym = `${year}-${String(m + 1).padStart(2, "0")}`; const last = new Date(Date.UTC(year, m + 1, 0)).getUTCDate(); onPick(`${ym}-${String(Math.min(Number(day), last)).padStart(2, "0")}`); };
  return (
    <div ref={box} role="dialog" aria-label="Go to a month" className="cal-jump">
      <div className="flex items-center justify-between gap-2"><button type="button" className="cal-icon-btn" aria-label="Previous year" disabled={year <= 2000} onClick={() => setYear((y) => y - 1)}><CalIcon name="left" /></button><b className="font-display text-[16px] font-extrabold" aria-live="polite">{year}</b><button type="button" className="cal-icon-btn" aria-label="Next year" disabled={year >= 2100} onClick={() => setYear((y) => y + 1)}><CalIcon name="right" /></button></div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">{MONTHS.map((m, i) => { const cur = year === Number(date.slice(0, 4)) && i + 1 === Number(date.slice(5, 7)); const now = year === Number(today.slice(0, 4)) && i + 1 === Number(today.slice(5, 7)); return <button key={m} type="button" aria-pressed={cur} data-month={i + 1} className={`cal-jump-m ${cur ? "on" : ""} ${now ? "now" : ""}`} onClick={() => to(i)}>{m.slice(0, 3)}</button>; })}</div>
      <label className="label mt-3" htmlFor="cal-jump-date">Or a date</label>
      <input id="cal-jump-date" type="date" className="input" defaultValue={date} min="2000-01-01" max="2100-12-31" onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && e.target.value >= "2000-01-01") onPick(e.target.value); }} />
    </div>
  );
}

// What the colours and icons mean. Every chip also carries its icon and, in lists, its status in words.
function Legend({ kinds }: { kinds: Kind[] }) {
  return (
    <div className="cal-legend" aria-label="Legend">
      {kinds.map((k) => <span key={k} className="cal-legend-item"><span className="cal-ev cal-swatch" data-kind={k}><CalIcon name={KIND_ICON[k]} size={12} /></span>{KIND_LABEL[k]}</span>)}
      <span className="cal-legend-item"><span className="cal-ev cal-swatch" data-kind="order" data-mark="passport"><CalIcon name="shield" size={12} /></span>Passport to check</span>
      <span className="cal-legend-item"><span className="cal-ev cal-swatch" data-kind="custom" data-sub="HOLIDAY" /><span>Closed day</span></span>
      <span className="cal-legend-sep" aria-hidden="true" />
      <span className="cal-legend-item">Order edge:</span>
      {STAGE_LEGEND.map(([l, c]) => <span key={l} className="cal-legend-item"><span className="cal-edge" style={{ background: c }} />{l}</span>)}
    </div>
  );
}
