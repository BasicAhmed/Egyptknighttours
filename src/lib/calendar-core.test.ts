import { test } from "node:test";
import assert from "node:assert/strict";
import { WEEK_START, addDays, addMonths, applyFilters, buildIcs, canEditEvent, chunkRange, closedDays, compareEvents, dayCounts, diffDays, eventsOn, feedWindow, filterParams, icsEscape, icsFold, isISO, layoutWeek, localToday, monthGrid, monthsCovering, NO_FILTERS, orderEvents, parseEvent, parseFilters, passportConcern, step, utcToday, viewRange, viewTitle, weekDays, weekdayNames, type CalEvent, type OrderFacts } from "./calendar-core";

const ev = (id: string, start: string, end = start, more: Partial<CalEvent> = {}): CalEvent => ({ id, kind: "order", sub: "TOUR", mark: "", start, end, time: "", endTime: "", title: id, line: "", ref: "", status: "CONFIRMED", cancelled: false, people: 2, guide: "", guideId: "", assignee: "", assigneeId: "", open: { type: "order", id }, ...more });
const facts = (more: Partial<OrderFacts> = {}): OrderFacts => ({ id: "b1", ref: "R-1", status: "CONFIRMED", name: "Ada Guest", title: "Nile trip", travelDate: "2026-11-14", people: 2, ...more });

test("dates are plain days: real dates only, UTC arithmetic, no local time", () => {
  assert.ok(isISO("2028-02-29")); assert.ok(!isISO("2027-02-29")); assert.ok(!isISO("2026-13-01")); assert.ok(!isISO("2026-1-1")); assert.ok(!isISO(null));
  assert.equal(addDays("2026-12-31", 1), "2027-01-01"); assert.equal(addDays("2028-02-28", 1), "2028-02-29"); assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(diffDays("2026-10-30", "2026-11-02"), 3);
  // across a daylight-saving change the answer is still whole days
  assert.equal(addDays("2026-03-28", 2), "2026-03-30"); assert.equal(diffDays("2026-10-24", "2026-10-26"), 2);
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28"); assert.equal(addMonths("2028-01-31", 1), "2028-02-29"); assert.equal(addMonths("2026-01-15", -1), "2025-12-15"); assert.equal(addMonths("2026-12-10", 1), "2027-01-10");
});
test("today: the device's own day, not UTC's, around midnight", () => {
  // 00:10 local on 15 Nov is 15 Nov for the person, whatever UTC says
  assert.equal(localToday(new Date(2026, 10, 15, 0, 10)), "2026-11-15"); assert.equal(localToday(new Date(2026, 10, 14, 23, 59)), "2026-11-14");
  assert.equal(utcToday(Date.UTC(2026, 10, 14, 23, 59, 59)), "2026-11-14"); assert.equal(utcToday(Date.UTC(2026, 10, 15, 0, 0, 0)), "2026-11-15");
});
test("month grid: whole weeks from Monday, month edges, leap day", () => {
  assert.equal(WEEK_START, 1); assert.deepEqual(weekdayNames().map((n) => n.slice(0, 2)), ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
  const nov = monthGrid("2026-11-14"); // 1 Nov 2026 is a Sunday: the first row starts Mon 26 Oct
  assert.equal(nov[0][0], "2026-10-26"); assert.equal(nov[0][6], "2026-11-01"); assert.equal(nov.length, 6); assert.equal(nov[5][0], "2026-11-30"); assert.equal(nov[5][6], "2026-12-06");
  const feb26 = monthGrid("2026-02-10"); // 1 Feb 2026 is a Sunday, 28 days: 5 rows
  assert.equal(feb26[0][0], "2026-01-26"); assert.equal(feb26.length, 5);
  const feb27 = monthGrid("2027-02-01"); assert.equal(feb27.length, 4); assert.equal(feb27[0][0], "2027-02-01"); assert.equal(feb27[3][6], "2027-02-28"); // a month that is exactly four weeks
  const feb28 = monthGrid("2028-02-01"); assert.ok(feb28.flat().includes("2028-02-29")); assert.ok(!monthGrid("2027-02-01").flat().includes("2027-02-29"));
  for (const w of nov) { assert.equal(w.length, 7); assert.equal(new Date(w[0] + "T00:00:00Z").getUTCDay(), 1); }
  assert.equal(monthGrid("2026-11-14", 0)[0][0], "2026-11-01"); // a Sunday start, if the constant ever changes
  assert.deepEqual(weekDays("2026-11-01"), ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
});
test("views: range, title, step and the months loaded", () => {
  assert.deepEqual(viewRange("day", "2026-11-14"), { from: "2026-11-14", to: "2026-11-14" }); assert.deepEqual(viewRange("week", "2026-11-01"), { from: "2026-10-26", to: "2026-11-01" });
  assert.deepEqual(viewRange("agenda", "2026-11-14"), { from: "2026-11-01", to: "2026-11-30" }); assert.deepEqual(viewRange("month", "2026-11-14"), { from: "2026-10-26", to: "2026-12-06" });
  assert.equal(viewTitle("month", "2026-11-14"), "November 2026"); assert.equal(viewTitle("week", "2026-11-01"), "26 Oct to 1 Nov 2026"); assert.equal(viewTitle("week", "2026-11-14"), "9 to 15 Nov 2026");
  assert.equal(step("month", "2026-01-31", 1), "2026-02-28"); assert.equal(step("week", "2026-12-28", 1), "2027-01-04"); assert.equal(step("day", "2026-03-01", -1), "2026-02-28");
  assert.deepEqual(chunkRange("2026-11"), { from: "2026-10-26", to: "2026-12-06" }); assert.deepEqual(monthsCovering({ from: "2026-10-26", to: "2026-12-06" }), ["2026-10", "2026-11", "2026-12"]);
});
test("orders: travel date to the last day of the trip, with the pickup time", () => {
  const tour = orderEvents(facts({ tourDays: 4, pickupTime: "08:00-08:30" }));
  assert.equal(tour.length, 1); assert.deepEqual([tour[0].start, tour[0].end, tour[0].time, tour[0].endTime, tour[0].id], ["2026-11-14", "2026-11-17", "08:00", "08:30", "o:b1"]); assert.equal(tour[0].line, "Nile trip"); assert.equal(tour[0].title, "Ada Guest");
  assert.equal(orderEvents(facts({ tourDays: 4, itineraryDays: 8 }))[0].end, "2026-11-21"); // the itinerary's own length wins
  assert.equal(orderEvents(facts())[0].end, "2026-11-14"); // unknown length: the travel day only
  assert.deepEqual([orderEvents(facts({ travelDate: "2026-11-28", tourDays: 6 }))[0].start, orderEvents(facts({ travelDate: "2026-11-28", tourDays: 6 }))[0].end], ["2026-11-28", "2026-12-03"]); // over the month edge
  assert.equal(orderEvents(facts({ travelDate: "2028-02-27", tourDays: 4 }))[0].end, "2028-03-01"); assert.equal(orderEvents(facts({ travelDate: "2027-02-27", tourDays: 4 }))[0].end, "2027-03-02"); // leap day or not
  assert.equal(orderEvents(facts({ travelDate: "soon" })).length, 0); assert.equal(orderEvents(facts({ travelDate: "2026-02-30" })).length, 0);
  assert.equal(orderEvents(facts({ status: "CANCELLED" }))[0].cancelled, true);
  assert.equal(orderEvents(facts({ tourDays: 500 }))[0].end, addDays("2026-11-14", 59)); // a mistyped length never paints a season
  assert.equal(orderEvents(facts({ pickupTime: "morning" }))[0].time, ""); assert.equal(orderEvents(facts({ pickupTime: "23:30" }))[0].start, "2026-11-14"); // a late pickup stays on its own day
});
test("passport flag: expiry within six months of travel", () => {
  assert.ok(passportConcern("2027-05-13", "2026-11-14")); assert.ok(!passportConcern("2027-05-14", "2026-11-14")); assert.ok(!passportConcern("", "2026-11-14"));
});
test("bars: multi-day items are cut per week, keep one lane, and overflow is counted", () => {
  const w1 = weekDays("2026-11-28"), w2 = weekDays("2026-12-01"); // Mon 23 Nov…Sun 29 Nov, then Mon 30 Nov…Sun 6 Dec
  const stay = ev("stay", "2026-11-28", "2026-12-03");
  const a = layoutWeek([stay], w1, 3).bars[0], b = layoutWeek([stay], w2, 3).bars[0];
  assert.deepEqual([a.col, a.span, a.before, a.after], [5, 2, false, true]); assert.deepEqual([b.col, b.span, b.before, b.after], [0, 4, true, false]);
  const days = weekDays("2026-11-11"); // 9…15 Nov
  const lay = layoutWeek([ev("long", "2026-11-09", "2026-11-13"), ev("a", "2026-11-10"), ev("b", "2026-11-10"), ev("c", "2026-11-10"), ev("d", "2026-11-14")], days, 3);
  assert.equal(lay.bars.find((x) => x.e.id === "long")!.lane, 0); assert.deepEqual(lay.total, [1, 4, 1, 1, 1, 1, 0]);
  // Tuesday has 4 and 3 lanes: two bars shown, the last lane is "+2 more"; shown + more always equals the total
  assert.equal(lay.more[1], 2); for (let i = 0; i < 7; i++) assert.equal(lay.bars.filter((x) => x.col <= i && i < x.col + x.span).length + lay.more[i], lay.total[i]);
  const lanes = new Map<string, number>(); for (const x of lay.bars) for (let i = x.col; i < x.col + x.span; i++) { const k = `${x.lane}:${i}`; assert.ok(!lanes.has(k), "two bars in one place"); lanes.set(k, 1); }
  assert.deepEqual(layoutWeek([ev("x", "2026-10-01", "2026-12-31")], days, 3).bars.map((x) => [x.col, x.span, x.before, x.after]), [[0, 7, true, true]]);
  assert.equal(layoutWeek([ev("far", "2026-12-20")], days, 3).bars.length, 0);
});
test("a day's events: closed first, all-day before timed, then by time", () => {
  const list = eventsOn([ev("t2", "2026-11-14", "2026-11-14", { time: "14:00" }), ev("t1", "2026-11-14", "2026-11-14", { time: "08:00" }), ev("all", "2026-11-13", "2026-11-15"), ev("hol", "2026-11-14", "2026-11-14", { kind: "custom", sub: "HOLIDAY" }), ev("other", "2026-11-16")], "2026-11-14");
  assert.deepEqual(list.map((e) => e.id), ["hol", "all", "t1", "t2"]); assert.ok(compareEvents(list[2], list[3]) < 0);
});
test("filters: kinds, stage, cancelled, guide, assignee, search; counts follow", () => {
  const all = [ev("o1", "2026-11-14", "2026-11-14", { title: "Ada Guest", ref: "EK-1", guideId: "g1" }), ev("o2", "2026-11-14", "2026-11-14", { status: "PAID", title: "Ben" }), ev("oc", "2026-11-14", "2026-11-14", { status: "CANCELLED", cancelled: true }),
    ev("p1", "2026-11-15", "2026-11-15", { kind: "partner", sub: "PARTNER", status: "CONFIRMED" }), ev("d1", "2026-11-16", "2026-11-16", { kind: "deadline", sub: "PAYMENT" }),
    ev("c1", "2026-11-17", "2026-11-17", { kind: "custom", sub: "TASK", assigneeId: "u2", status: "" }), ev("h", "2026-11-18", "2026-11-19", { kind: "custom", sub: "HOLIDAY", status: "" })];
  const ids = (f: Partial<typeof NO_FILTERS>) => applyFilters(all, { ...NO_FILTERS, ...f }).map((e) => e.id).sort().join(",");
  assert.equal(ids({}), "c1,d1,h,o1,o2,p1"); assert.equal(ids({ cancelled: true }), "c1,d1,h,o1,o2,oc,p1");
  assert.equal(ids({ kinds: ["order"] }), "o1,o2"); assert.equal(ids({ kinds: ["custom", "deadline"] }), "c1,d1,h"); assert.equal(ids({ kinds: ["partner"] }), "p1");
  assert.equal(ids({ kinds: ["order"], stage: "paid" }), "o2"); assert.equal(ids({ guide: "g1" }), "o1"); assert.equal(ids({ assignee: "u2" }), "c1"); assert.equal(ids({ q: "ada" }), "o1"); assert.equal(ids({ q: "ek-1" }), "o1");
  const r = { from: "2026-11-09", to: "2026-11-22" }; const kept = applyFilters(all, NO_FILTERS);
  assert.deepEqual(dayCounts(kept, r), { "2026-11-14": 2, "2026-11-15": 1, "2026-11-16": 1, "2026-11-17": 1, "2026-11-18": 1, "2026-11-19": 1 });
  assert.deepEqual([...closedDays(kept, r)], ["2026-11-18", "2026-11-19"]);
  // the address round-trips, and an unfiltered calendar has a clean one
  const f = { ...NO_FILTERS, kinds: ["order", "custom"] as ("order" | "custom")[], stage: "pay" as const, cancelled: true, q: " ada " };
  assert.deepEqual(parseFilters(new URLSearchParams(filterParams(f))), { ...f, q: "ada" }); assert.deepEqual(filterParams(NO_FILTERS), []);
  assert.deepEqual(parseFilters(new URLSearchParams("kinds=order,group,nonsense&stage=zzz&types=HOTEL&expand=1")), { ...NO_FILTERS, kinds: ["order"] });
});
test("custom events: what staff may type", () => {
  const good = { title: " Team meeting ", type: "MEETING", startDate: "2026-11-14", endDate: "", time: "14:30", notes: "", linkKind: "", linkId: "", assigneeId: "", done: false, clientKey: "k1" };
  const r = parseEvent(good); assert.ok(r.ok); if (r.ok) assert.deepEqual([r.data.title, r.data.endDate, r.data.time], ["Team meeting", "2026-11-14", "14:30"]);
  const bad = (o: object) => { const x = parseEvent({ ...good, ...o }); assert.equal(x.ok, false); return x.ok ? "" : x.message; };
  assert.match(bad({ title: "  " }), /title/); bad({ title: "x".repeat(121) }); bad({ type: "PARTY" }); assert.match(bad({ startDate: "2026-02-30" }), /real start date/); bad({ endDate: "2026-11-13" }); bad({ endDate: "2026-13-01" });
  assert.match(bad({ time: "25:00" }), /14:30/); bad({ time: "9am" }); bad({ notes: "x".repeat(1001) }); bad({ endDate: "2027-12-01" }); bad({ linkKind: "invoice" }); bad({ linkKind: "group" }); bad({ clientKey: "has spaces" });
  const hol = parseEvent({ ...good, type: "HOLIDAY", done: true }); assert.ok(hol.ok); if (hol.ok) assert.deepEqual([hol.data.time, hol.data.done], ["", false]); // a closed day has no time and cannot be "done"
  const task = parseEvent({ ...good, type: "TASK", done: "on", endDate: "2026-11-16" }); assert.ok(task.ok); if (task.ok) assert.deepEqual([task.data.done, task.data.endDate], [true, "2026-11-16"]);
  assert.ok(canEditEvent({ uid: "a", role: "SUPER_ADMIN" }, "b")); assert.ok(canEditEvent({ uid: "a", role: "MANAGER" }, null)); assert.ok(canEditEvent({ uid: "a", role: "SALES" }, "a")); assert.ok(!canEditEvent({ uid: "a", role: "SALES" }, "b")); assert.ok(!canEditEvent({ uid: "a", role: "SALES" }, null));
});
test("ICS: structure, all-day and timed, folding, escaping, stable ids, no money or passports", () => {
  const events = [ev("o:b1", "2026-11-14", "2026-11-17", { title: "Ada; Guest, Ltd", line: "Nile trip\nwith a line break", ref: "EK-1", time: "08:00" }), ev("o:b2", "2026-11-12", "2026-11-12", { time: "23:30", title: "Late pickup" }), ev("o:b3", "2026-11-12", "2026-11-12", { time: "09:40", endTime: "10:10", title: "Window" }),
    ev("d:b1", "2026-11-20", "2026-11-20", { kind: "deadline", sub: "PAYMENT", title: "Ada", ref: "EK-1", money: "$1,250 still to pay", line: "Payment due, invoice INV-7" }), ev("pp:b1", "2026-11-14", "2026-11-14", { mark: "passport", line: "Passport check: 1 passport runs out" }),
    ev("c:e1", "2026-11-18", "2026-11-19", { kind: "custom", sub: "TASK", title: "Zadanie: позвонить в отель и подтвердить номера для группы из двенадцати человек", notes: "Ask for André", done: true, status: "" }), ev("o:b4", "2026-11-30", "2026-11-30", { status: "CANCELLED", cancelled: true, title: "Gone" })];
  const o = { name: "Egypt Knight Tours calendar", host: "egyptknight.com", now: Date.UTC(2026, 10, 1, 12, 0, 0) };
  const ics = buildIcs(events, o);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:")); assert.ok(ics.endsWith("END:VCALENDAR\r\n")); assert.ok(!/[^\r]\n/.test(ics), "every line ends CRLF"); assert.ok(!/\r(?!\n)/.test(ics));
  const enc = new TextEncoder(); for (const l of ics.split("\r\n")) assert.ok(enc.encode(l).length <= 75, `line over 75 octets: ${l}`);
  const flat = ics.replace(/\r\n /g, ""); // unfolded
  assert.equal((flat.match(/BEGIN:VEVENT/g) ?? []).length, 6); assert.equal((flat.match(/END:VEVENT/g) ?? []).length, 6);
  assert.ok(flat.includes("UID:o:b1@egyptknight.com")); assert.equal(buildIcs(events, { ...o, now: Date.UTC(2027, 0, 1) }).match(/UID:.*/g)!.join("|"), ics.match(/UID:.*/g)!.join("|"), "ids do not change between fetches");
  assert.ok(flat.includes("DTSTAMP:20261101T120000Z"));
  // a multi-day item is all-day, its end is the day AFTER the last one; the time moves to the text
  assert.ok(flat.includes("DTSTART;VALUE=DATE:20261114\r\nDTEND;VALUE=DATE:20261118")); assert.ok(flat.includes("SUMMARY:Ada\\; Guest\\, Ltd\\, Nile trip\\nwith a line break (08:00)"));
  // a timed one-day item is a floating local time (no Z, no zone); one hour long unless it has a window; past midnight rolls the day
  assert.ok(flat.includes("DTSTART:20261112T233000\r\nDTEND:20261113T003000")); assert.ok(flat.includes("DTSTART:20261112T094000\r\nDTEND:20261112T101000")); assert.ok(!/DTSTART:\d{8}T\d{6}Z/.test(flat));
  assert.ok(flat.includes("DTSTART;VALUE=DATE:20261118\r\nDTEND;VALUE=DATE:20261120")); assert.ok(flat.includes("SUMMARY:✓ Zadanie: позвонить")); assert.ok(flat.includes("STATUS:CANCELLED"));
  // never: an amount, or anything about a passport
  assert.ok(!/1,250|1\\,250|still to pay|\$/.test(flat)); assert.ok(!/passport/i.test(flat)); assert.ok(flat.includes("SUMMARY:Payment due: Ada (EK-1)"));
  assert.equal(icsEscape("a\\b;c,d\r\ne\u0007"), "a\\\\b\\;c\\,d\\ne");
  const folded = icsFold("SUMMARY:" + "é".repeat(60)); const parts = folded.split("\r\n"); assert.ok(parts.length > 1); for (const [i, x] of parts.entries()) { assert.ok(enc.encode(x).length <= 75); if (i) assert.ok(x.startsWith(" ")); } assert.equal(parts.map((x, i) => (i ? x.slice(1) : x)).join(""), "SUMMARY:" + "é".repeat(60));
  assert.equal(icsFold("SHORT:line"), "SHORT:line");
  assert.deepEqual(feedWindow("2026-11-14"), { from: "2026-10-01", to: "2027-11-30" }); assert.deepEqual(feedWindow("2026-01-31"), { from: "2025-12-01", to: "2027-01-31" });
});
