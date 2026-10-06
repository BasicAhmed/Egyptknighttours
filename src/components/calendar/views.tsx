"use client";
// The four ways of looking at the calendar. They only draw: what is on which day comes from src/lib/calendar-core.ts
// (the same functions the unit tests check), and how an event looks (its icon, its status words and colours) comes from
// ./skin, which is the only file here that knows this product's own components.
//   MonthGrid   weeks as rows, events as bars in lanes that run unbroken across days, "+N more" per day
//   WeekView    the same bars for whole-day items, and each day's timed items under them
//   DayView     one day in full
//   Agenda      a list grouped by day
//   MiniMonth   the small month (or one week of it) for jumping about on a phone
import { useMemo, useState } from "react";
import { addDays, compareEvents, dayNum, eventsOn, layoutWeek, longDay, monthGrid, monthName, shortDay, shortMonth, spanDays, weekDays, weekdayNames, canBeDone, diffDays, type Bar, type CalEvent } from "@/lib/calendar-core";
import { EventIcon, StatusPill, edgeColor, peopleText, statusText } from "./skin";

export type Handlers = {
  open: (e: CalEvent) => void;          // tap an event
  openDay: (iso: string) => void;       // the sheet of one day (everything on it, and "New")
  goDay: (iso: string) => void;         // switch to the day view
  add: (iso: string) => void;           // "New" on a day
  toggleDone: (e: CalEvent) => void;    // tick a task or a reminder
  move?: (e: CalEvent, start: string) => void; // drag a custom event to another day (wide screens)
};
const attrs = (e: CalEvent) => ({ "data-ev": e.id, "data-kind": e.kind, "data-sub": e.sub, "data-mark": e.mark || undefined, "data-off": e.cancelled ? "1" : undefined, "data-done": e.done ? "1" : undefined });
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
/** Everything about an event in one sentence: the tooltip of a bar and what a screen reader says. */
export function describe(e: CalEvent): string {
  const st = statusText(e);
  return [e.time ? `${e.time}${e.endTime ? ` to ${e.endTime}` : ""}` : "", e.title, e.ref, e.line, peopleText(e), e.guide ? `Guide: ${e.guide}` : "", e.assignee ? `Assigned to ${e.assignee}` : "", e.money ?? "", st].filter(Boolean).join(", ");
}

// ---------- a bar (month and week) ----------
function BarChip({ b, h, drag }: { b: Bar; h: Handlers; drag: Drag | null }) {
  const e = b.e; const movable = !!drag && e.kind === "custom" && !!e.canEdit;
  return (
    <button type="button" tabIndex={-1} {...attrs(e)} className={`cal-ev cal-bar ${b.before ? "cont-l" : ""} ${b.after ? "cont-r" : ""}`} title={describe(e)}
      style={{ gridColumn: `${b.col + 1} / span ${b.span}`, gridRow: b.lane + 1, ["--edge" as string]: edgeColor(e) }}
      draggable={movable} onDragStart={movable ? (ev) => drag!.start(ev, e, b) : undefined} onDragEnd={movable ? () => drag!.end() : undefined}
      onClick={(ev) => { ev.stopPropagation(); h.open(e); }}>
      <EventIcon e={e} size={13} />{e.time && !b.before ? <span className="cal-t">{e.time}</span> : null}<span className="cal-n">{e.title}</span>
      {e.line && b.span > 1 ? <span className="cal-l">{e.line}</span> : null}
    </button>
  );
}
// Dragging a custom event to another day. The day it lands on is worked out from where the pointer is over the week, so
// a bar that is three days long can be picked up by its middle and still lands where it was dropped.
type Drag = { start: (ev: React.DragEvent, e: CalEvent, b: Bar) => void; end: () => void; over: string | null; setOver: (d: string | null) => void; drop: (day: string) => void };
function useDrag(move?: Handlers["move"]): Drag | null {
  const [held, setHeld] = useState<{ e: CalEvent; grab: number } | null>(null); const [over, setOver] = useState<string | null>(null);
  if (!move) return null;
  return {
    over: held ? over : null, setOver: (d) => { if (held) setOver(d); },
    start: (ev, e, b) => {
      const week = (ev.currentTarget as HTMLElement).closest<HTMLElement>("[data-week]"); let grab = 0;
      if (week) { const r = week.getBoundingClientRect(); const col = Math.max(0, Math.min(6, Math.floor(((ev.clientX - r.left) / r.width) * 7))); grab = diffDays(e.start, addDays(week.dataset.week!, col)); }
      ev.dataTransfer.effectAllowed = "move"; ev.dataTransfer.setData("text/plain", e.id); setHeld({ e, grab: Math.max(0, Math.min(spanDays(e) - 1, grab)) });
    },
    end: () => { setHeld(null); setOver(null); },
    drop: (day) => { if (held) { const start = addDays(day, -held.grab); if (start !== held.e.start) move(held.e, start); } setHeld(null); setOver(null); },
  };
}
const colOf = (ev: React.DragEvent) => { const r = (ev.currentTarget as HTMLElement).getBoundingClientRect(); return Math.max(0, Math.min(6, Math.floor(((ev.clientX - r.left) / r.width) * 7))); };

// One week as a row: the seven day cells, and over them the lanes of bars.
function WeekRow({ days, month, date, today, events, closed, maxLanes, h, drag, grow = false }: { days: string[]; month: string | null; date: string; today: string; events: CalEvent[]; closed: Set<string>; maxLanes: number; h: Handlers; drag: Drag | null; grow?: boolean }) {
  const lay = useMemo(() => layoutWeek(events, days, maxLanes), [events, days, maxLanes]);
  const lanes = grow ? Math.max(1, Math.min(maxLanes, lay.bars.reduce((a, b) => Math.max(a, b.lane + 1), 0) + (lay.more.some(Boolean) ? 1 : 0))) : maxLanes;
  return (
    <div className="cal-week" role="row" data-week={days[0]} style={{ ["--lanes" as string]: lanes }}
      onDragOver={drag ? (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = "move"; drag.setOver(days[colOf(ev)]); } : undefined}
      onDrop={drag ? (ev) => { ev.preventDefault(); drag.drop(days[colOf(ev)]); } : undefined}>
      {days.map((d, i) => {
        const n = lay.total[i]; const out = month !== null && d.slice(0, 7) !== month;
        return (
          <div key={d} role="gridcell" aria-selected={d === date} className={`cal-cell ${out ? "out" : ""} ${d === today ? "today" : ""} ${closed.has(d) ? "closed" : ""} ${drag?.over === d ? "drop" : ""}`} onClick={() => h.openDay(d)}>
            {month !== null ? <button type="button" className="cal-daynum" data-day={d} tabIndex={d === date ? 0 : -1} aria-current={d === today ? "date" : undefined}
              aria-label={`${longDay(d)}${d === today ? ", today" : ""}${closed.has(d) ? ", closed" : ""}, ${n ? plural(n, "event") : "no events"}`} onClick={(ev) => { ev.stopPropagation(); h.openDay(d); }}>
              <span>{dayNum(d)}</span>{dayNum(d) === 1 ? <i>{shortMonth(d)}</i> : null}</button> : null}
          </div>
        );
      })}
      <div className="cal-lanes" aria-hidden="true">
        {lay.bars.map((b) => <BarChip key={b.e.id} b={b} h={h} drag={drag} />)}
        {lay.more.map((n, i) => (n > 0 ? <button key={days[i]} type="button" tabIndex={-1} className="cal-more" data-more={days[i]} style={{ gridColumn: i + 1, gridRow: lanes }} onClick={(ev) => { ev.stopPropagation(); h.openDay(days[i]); }}>+{n} more</button> : null))}
      </div>
    </div>
  );
}

// ---------- month ----------
export function MonthGrid({ date, today, events, closed, maxLanes, h, onKey }: { date: string; today: string; events: CalEvent[]; closed: Set<string>; maxLanes: number; h: Handlers; onKey: (e: React.KeyboardEvent) => void }) {
  const weeks = useMemo(() => monthGrid(date), [date]); const drag = useDrag(h.move);
  return (
    <div className="cal-month" role="grid" aria-label={`${monthName(date)} ${date.slice(0, 4)}. Arrow keys move between days, Enter opens a day.`} onKeyDown={onKey}>
      <div className="cal-dow" role="row">{weekdayNames().map((n) => <div key={n} role="columnheader" aria-label={n}>{n.slice(0, 3)}</div>)}</div>
      {weeks.map((days) => <WeekRow key={days[0]} days={days} month={date.slice(0, 7)} date={date} today={today} events={events} closed={closed} maxLanes={maxLanes} h={h} drag={drag} />)}
    </div>
  );
}

// ---------- the small month: jumping about on a phone, and the phone's own month view ----------
export function MiniMonth({ date, today, counts, closed, onPick, oneWeek = false, numbers = false, onKey }: { date: string; today: string; counts: Record<string, number>; closed: Set<string>; onPick: (iso: string) => void; oneWeek?: boolean; numbers?: boolean; onKey?: (e: React.KeyboardEvent) => void }) {
  const weeks = useMemo(() => (oneWeek ? [weekDays(date)] : monthGrid(date)), [date, oneWeek]); const month = date.slice(0, 7);
  return (
    <div className={`cal-mini ${numbers ? "big" : ""}`} role="grid" aria-label={`${monthName(date)} ${date.slice(0, 4)}`} onKeyDown={onKey}>
      <div className="cal-mini-row cal-mini-dow" role="row">{weekdayNames().map((n) => <div key={n} role="columnheader" aria-label={n}>{n.slice(0, numbers ? 3 : 1)}</div>)}</div>
      {weeks.map((w) => (
        <div key={w[0]} className="cal-mini-row" role="row">
          {w.map((d) => { const n = counts[d] ?? 0; return (
            <div key={d} role="gridcell" aria-selected={d === date}>
              <button type="button" data-day={d} tabIndex={d === date ? 0 : -1} aria-pressed={d === date} aria-current={d === today ? "date" : undefined} onClick={() => onPick(d)}
                aria-label={`${longDay(d)}${d === today ? ", today" : ""}${closed.has(d) ? ", closed" : ""}, ${n ? plural(n, "event") : "no events"}`}
                className={`cal-mini-day ${d === date ? "sel" : ""} ${d === today ? "today" : ""} ${!oneWeek && d.slice(0, 7) !== month ? "out" : ""} ${closed.has(d) ? "closed" : ""}`}>
                <span className="num">{dayNum(d)}</span>{numbers ? <span className="cnt" aria-hidden="true">{n ? (n > 99 ? "99+" : n) : ""}</span> : <span className={`dot ${n ? "on" : ""}`} aria-hidden="true" />}
              </button>
            </div>); })}
        </div>))}
    </div>
  );
}

// ---------- one event as a row (agenda, day view, the day sheet) ----------
export function EventRow({ e, day, h }: { e: CalEvent; day: string; h: Handlers }) {
  const span = spanDays(e); const nth = span > 1 ? diffDays(e.start, day) + 1 : 0;
  const when = e.time && (span === 1 || nth === 1) ? e.time : span > 1 ? `Day ${nth}/${span}` : "All day";
  const tickable = e.kind === "custom" && canBeDone(e.sub) && (e.canEdit || !!e.assigneeId);
  const sub = [e.line, peopleText(e), e.guide ? `Guide: ${e.guide}` : "", e.assignee ? `For ${e.assignee}` : "", e.link ? e.link.label : "", e.money ?? ""].filter(Boolean).join(" · ");
  return (
    <li className="cal-row cal-ev" {...attrs(e)} style={{ ["--edge" as string]: edgeColor(e) }}>
      <button type="button" className="cal-row-main" onClick={() => h.open(e)} aria-label={`${when === "All day" ? "All day" : when}, ${describe(e)}. Open.`}>
        <span className="cal-row-time">{when}{e.time && e.endTime && (span === 1 || nth === 1) ? <i>{e.endTime}</i> : null}</span>
        <span className="cal-ico"><EventIcon e={e} size={17} /></span>
        <span className="cal-row-text"><span className="cal-row-title"><b>{e.title}</b>{e.ref ? <span className="cal-ref">{e.ref}</span> : null}</span>{sub ? <span className="cal-row-sub">{sub}</span> : null}</span>
      </button>
      {tickable ? <button type="button" role="checkbox" aria-checked={!!e.done} aria-label={`${e.done ? "Done" : "Not done"}: ${e.title}. Tap to change.`} className={`cal-tick ${e.done ? "on" : ""}`} onClick={() => h.toggleDone(e)}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></button>
        : <span className="cal-row-side"><StatusPill e={e} /></span>}
    </li>
  );
}
const DayHead = ({ d, today, n, closed, h, level = 3 }: { d: string; today: string; n: number; closed: boolean; h: Handlers; level?: 2 | 3 }) => {
  const H = level === 2 ? "h2" : "h3";
  return (
    <div className={`cal-dayhead ${d === today ? "today" : ""}`}>
      <H className="min-w-0 flex-1"><button type="button" className="cal-dayhead-btn" onClick={() => h.goDay(d)} aria-label={`${longDay(d)}${d === today ? ", today" : ""}. Open this day.`}><b>{shortDay(d)}</b>{d === today ? <span className="cal-today-tag">Today</span> : null}{closed ? <span className="cal-closed-tag">Closed</span> : null}<span className="cal-dayhead-n">{n ? plural(n, "event") : "Nothing planned"}</span></button></H>
      <button type="button" className="cal-add" aria-label={`Add to ${longDay(d)}`} title="Add an order or an event on this day" onClick={() => h.add(d)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5.5v13M5.5 12h13" /></svg></button>
    </div>
  );
};

// ---------- agenda ----------
// The days of a range that have something on them (and today), each with its events. A very busy day shows its first
// `limit` and a button for the rest, so a month of a thousand orders is still a page a phone can scroll.
export function Agenda({ days, today, events, closed, h, limit = 6, empty }: { days: string[]; today: string; events: CalEvent[]; closed: Set<string>; h: Handlers; limit?: number; empty: React.ReactNode }) {
  const byDay = useMemo(() => days.map((d) => ({ d, list: eventsOn(events, d) })).filter((x) => x.list.length || x.d === today), [days, events, today]);
  if (!byDay.some((x) => x.list.length)) return <div className="cal-empty">{empty}</div>;
  return (
    <div className="cal-agenda">
      {byDay.map(({ d, list }) => (
        <section key={d} id={`cal-day-${d}`} data-agenda-day={d} className={`cal-daysec ${closed.has(d) ? "closed" : ""}`} aria-label={longDay(d)}>
          <DayHead d={d} today={today} n={list.length} closed={closed.has(d)} h={h} />
          {list.length ? <ul className="cal-rows">{list.slice(0, limit).map((e) => <EventRow key={e.id} e={e} day={d} h={h} />)}</ul> : <p className="cal-none">Nothing planned today.</p>}
          {list.length > limit ? <button type="button" className="cal-rest" data-more={d} onClick={() => h.goDay(d)}>+{list.length - limit} more on {shortDay(d)}</button> : null}
        </section>))}
    </div>
  );
}

// ---------- day ----------
export function DayView({ date, today, events, closed, h }: { date: string; today: string; events: CalEvent[]; closed: Set<string>; h: Handlers }) {
  const list = useMemo(() => eventsOn(events, date), [events, date]);
  const whole = list.filter((e) => !e.time || spanDays(e) > 1), timed = list.filter((e) => e.time && spanDays(e) === 1);
  return (
    <div className={`cal-day ${closed.has(date) ? "closed" : ""}`} data-day-view={date}>
      <DayHead d={date} today={today} n={list.length} closed={closed.has(date)} h={h} level={2} />
      {!list.length ? <div className="cal-empty"><b>Nothing on this day</b>Add an order or an event with the + button.</div> : null}
      {whole.length ? <><p className="cal-part">All day and multi-day</p><ul className="cal-rows">{whole.map((e) => <EventRow key={e.id} e={e} day={date} h={h} />)}</ul></> : null}
      {timed.length ? <><p className="cal-part">By time</p><ul className="cal-rows">{timed.map((e) => <EventRow key={e.id} e={e} day={date} h={h} />)}</ul></> : null}
    </div>
  );
}

// ---------- week (wide screens): whole-day bars on top, each day's timed items under its own column ----------
export function WeekView({ date, today, events, closed, h, onKey, limit = 9 }: { date: string; today: string; events: CalEvent[]; closed: Set<string>; h: Handlers; onKey: (e: React.KeyboardEvent) => void; limit?: number }) {
  const days = useMemo(() => weekDays(date), [date]); const drag = useDrag(h.move);
  const whole = useMemo(() => events.filter((e) => !e.time || spanDays(e) > 1), [events]);
  return (
    <div className="cal-weekv" role="grid" aria-label={`Week of ${longDay(days[0])}. Arrow keys move between days, Enter opens a day.`} onKeyDown={onKey}>
      <div className="cal-weekheads" role="row">
        {days.map((d) => { const n = eventsOn(events, d).length; return <div key={d} role="columnheader" className={`${d === today ? "today" : ""} ${closed.has(d) ? "closed" : ""}`}>
          <button type="button" className="cal-weekhead" data-day={d} tabIndex={d === date ? 0 : -1} aria-current={d === today ? "date" : undefined} aria-label={`${longDay(d)}${d === today ? ", today" : ""}${closed.has(d) ? ", closed" : ""}, ${n ? plural(n, "event") : "no events"}`} onClick={() => h.openDay(d)}>
            <span>{weekdayNames()[days.indexOf(d)].slice(0, 3)}</span><b>{dayNum(d)}</b></button></div>; })}
      </div>
      <WeekRow days={days} month={null} date={date} today={today} events={whole} closed={closed} maxLanes={12} h={h} drag={drag} grow />
      <div className="cal-weekcols" role="row">
        {days.map((d) => { const list = events.filter((e) => e.time && spanDays(e) === 1 && e.start === d).sort(compareEvents); return (
          <div key={d} role="gridcell" className={`cal-col ${d === today ? "today" : ""} ${closed.has(d) ? "closed" : ""}`} onClick={() => h.openDay(d)}>
            {list.slice(0, limit).map((e) => <button key={e.id} type="button" tabIndex={-1} {...attrs(e)} className="cal-ev cal-card" style={{ ["--edge" as string]: edgeColor(e) }} title={describe(e)} onClick={(ev) => { ev.stopPropagation(); h.open(e); }}>
              <span className="cal-card-top"><EventIcon e={e} size={13} /><span className="cal-t">{e.time}</span></span><span className="cal-n">{e.title}</span>{e.line ? <span className="cal-l">{e.line}</span> : null}</button>)}
            {list.length > limit ? <button type="button" tabIndex={-1} className="cal-more static" data-more={d} onClick={(ev) => { ev.stopPropagation(); h.openDay(d); }}>+{list.length - limit} more</button> : null}
          </div>); })}
      </div>
    </div>
  );
}
