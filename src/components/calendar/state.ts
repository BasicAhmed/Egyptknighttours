"use client";
// What the calendar page remembers and loads, apart from how it is drawn.
//   - the view, the day and the filters live in the address (?view=week&date=2026-11-14&kinds=order…), so a reload, the
//     Back button and a link sent to a colleague all show the same thing;
//   - events are loaded one month at a time (that month's whole weeks) from /api/admin/calendar and kept while the page is
//     open; the months either side are fetched quietly so Previous and Next feel instant. Nothing else is ever loaded;
//   - "today" comes from this device's clock, not the server's: at ten past midnight in Cairo it is already tomorrow.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMonths, applyFilters, chunkRange, closedDays, dayCounts, filterParams, isISO, isView, localToday, monthKey, overlaps, parseFilters, step, viewRange, weekStart, type CalEvent, type Filters, type Kind, type View } from "@/lib/calendar-core";

export type Chunk = { month: string; cancelled: boolean; events: CalEvent[] };
const keyOf = (month: string, cancelled: boolean) => `${month}|${cancelled ? 1 : 0}`;

export function useCalendar(p: { initial: Chunk[]; view: View | null; date: string | null; filters: Filters; serverToday: string; phoneGuess: boolean }) {
  const [wide, setWide] = useState(!p.phoneGuess);
  const [today, setToday] = useState(p.serverToday);
  const [view, setViewS] = useState<View>(p.view ?? (p.phoneGuess ? "agenda" : "month"));
  const [date, setDateS] = useState(p.date ?? p.serverToday);
  const [filters, setFiltersS] = useState<Filters>(p.filters);
  const asked = useRef({ view: !!p.view, date: !!p.date });
  const now = useRef({ view, date, filters }); now.current = { view, date, filters };

  // ----- the address -----
  const write = useCallback((v: View, d: string, f: Filters, push: boolean) => {
    const q = new URLSearchParams(); q.set("view", v); q.set("date", d); for (const [k, val] of filterParams(f)) q.set(k, val);
    const next = `${window.location.pathname}?${q.toString()}`;
    if (next !== window.location.pathname + window.location.search) (push ? window.history.pushState : window.history.replaceState).call(window.history, null, "", next);
  }, []);
  const setView = useCallback((v: View) => { asked.current.view = true; setViewS(v); write(v, now.current.date, now.current.filters, true); }, [write]);
  const setDate = useCallback((d: string, push = true) => { if (!isISO(d)) return; asked.current.date = true; setDateS(d); write(now.current.view, d, now.current.filters, push); }, [write]);
  const go = useCallback((v: View, d: string) => { if (!isISO(d)) return; asked.current = { view: true, date: true }; setViewS(v); setDateS(d); write(v, d, now.current.filters, true); }, [write]);
  const setFilters = useCallback((f: Filters) => { setFiltersS(f); write(now.current.view, now.current.date, f, false); }, [write]);
  useEffect(() => {
    // The device knows two things the server could only guess: how wide the screen is and what day it is here.
    const mq = window.matchMedia("(min-width: 1024px)"); const size = () => setWide(mq.matches); size(); mq.addEventListener("change", size);
    const t = localToday(); setToday(t);
    if (!asked.current.date && t !== p.serverToday) setDateS(t);
    if (!asked.current.view) setViewS(mq.matches ? "month" : "agenda");
    const back = () => { const q = new URLSearchParams(window.location.search); const v = q.get("view"), d = q.get("date"); setViewS(isView(v) ? v : mq.matches ? "month" : "agenda"); setDateS(isISO(d) ? d : localToday()); setFiltersS(parseFilters(q)); };
    window.addEventListener("popstate", back);
    const midnight = window.setInterval(() => setToday(localToday()), 60_000); // a page left open overnight moves on to the new day
    return () => { mq.removeEventListener("change", size); window.removeEventListener("popstate", back); window.clearInterval(midnight); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- the data -----
  const cache = useRef<Map<string, CalEvent[]> | null>(null);
  if (!cache.current) cache.current = new Map(p.initial.map((c) => [keyOf(c.month, c.cancelled), c.events]));
  const pending = useRef(new Set<string>()); const loadedAt = useRef(Date.now());
  const [, setTick] = useState(0); const [error, setError] = useState("");
  const { cancelled } = filters;
  const fetchMonth = useCallback(async (month: string, o: { force?: boolean; quiet?: boolean } = {}) => {
    const k = keyOf(month, cancelled); if ((!o.force && cache.current!.has(k)) || pending.current.has(k)) return;
    pending.current.add(k);
    try {
      const r = await fetch(`/api/admin/calendar?month=${month}${cancelled ? "&cancelled=1" : ""}`, { cache: "no-store" });
      if (r.status === 401) { window.location.href = "/admin/login"; return; }
      if (!r.ok) throw new Error(String(r.status));
      cache.current!.set(k, ((await r.json()) as { events: CalEvent[] }).events); if (!o.quiet) { setError(""); loadedAt.current = Date.now(); }
    } catch { if (!o.quiet) setError("The calendar could not be loaded. Check your connection and try again."); }
    finally { pending.current.delete(k); setTick((t) => t + 1); }
  }, [cancelled]);
  const range = useMemo(() => viewRange(view, date), [view, date]);
  // Whole weeks are loaded with each month, so one month's data always covers the month, the agenda, the day and the week on screen.
  const month = monthKey(view === "week" ? range.from : date);
  useEffect(() => {
    void fetchMonth(month);
    const t = window.setTimeout(() => { void fetchMonth(monthKey(addMonths(month + "-01", 1)), { quiet: true }); void fetchMonth(monthKey(addMonths(month + "-01", -1)), { quiet: true }); }, 250);
    return () => window.clearTimeout(t);
  }, [month, fetchMonth]);
  // After something changed (an event saved, an order edited in its window): this month again, the others when they are next opened.
  const reload = useCallback(async () => { const keep = keyOf(month, cancelled); for (const k of [...cache.current!.keys()]) if (k !== keep) cache.current!.delete(k); await fetchMonth(month, { force: true }); }, [month, cancelled, fetchMonth]);
  useEffect(() => { const seen = () => { if (document.visibilityState === "visible" && Date.now() - loadedAt.current > 60_000) void reload(); }; document.addEventListener("visibilitychange", seen); return () => document.removeEventListener("visibilitychange", seen); }, [reload]);
  /** Shows a change at once, before the server has answered (a dragged event, a ticked task). */
  const patch = useCallback((fn: (events: CalEvent[]) => CalEvent[]) => { const k = keyOf(month, cancelled); const cur = cache.current!.get(k); if (cur) { cache.current!.set(k, fn(cur)); setTick((t) => t + 1); } }, [month, cancelled]);

  const all = cache.current.get(keyOf(month, cancelled)) ?? null;
  const last = useRef<CalEvent[]>([]); if (all) last.current = all; // while another month loads, what is already known stays on screen
  const loading = all === null; const base = all ?? last.current;
  const kept = useMemo(() => applyFilters(base, filters), [base, filters]);
  const events = useMemo(() => kept.filter((e) => overlaps(e, range)), [kept, range]);
  const grid = useMemo(() => chunkRange(month), [month]);
  const counts = useMemo(() => dayCounts(kept, grid), [kept, grid]);
  const closed = useMemo(() => closedDays(kept, grid), [kept, grid]);
  // The legend's numbers: what each kind has in the range on screen with every OTHER filter applied, so ticking one shows that many.
  const kindCounts = useMemo(() => { const out: Partial<Record<Kind, number>> = {}; for (const e of applyFilters(base, { ...filters, kinds: [] })) if (overlaps(e, range)) out[e.kind] = (out[e.kind] ?? 0) + 1; return out; }, [base, filters, range]);

  // ----- keyboard: arrows move the day, Home/End the week, Page Up/Down the month. Enter is the day's own button. -----
  const refocus = useRef(false);
  const onKey = useCallback((ev: React.KeyboardEvent) => {
    if (!(ev.target as HTMLElement).dataset?.day || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const d = now.current.date; const moves: Record<string, string> = { ArrowLeft: addDays(d, -1), ArrowRight: addDays(d, 1), ArrowUp: addDays(d, -7), ArrowDown: addDays(d, 7), Home: weekStart(d), End: addDays(weekStart(d), 6), PageUp: addMonths(d, -1), PageDown: addMonths(d, 1) };
    const next = moves[ev.key]; if (!next) return;
    ev.preventDefault(); refocus.current = true; setDate(next, false);
  }, [setDate]);
  useEffect(() => { if (!refocus.current) return; refocus.current = false; document.querySelector<HTMLElement>(`.cal [data-day="${date}"]`)?.focus(); }, [date]);

  return { wide, today, view, date, filters, range, month, events, all, counts, closed, kindCounts, loading, error, setView, setDate, go, setFilters, reload, patch, onKey,
    prev: () => setDate(step(view, date, -1)), next: () => setDate(step(view, date, 1)), toToday: () => setDate(today) };
}
export type Cal = ReturnType<typeof useCalendar>;
