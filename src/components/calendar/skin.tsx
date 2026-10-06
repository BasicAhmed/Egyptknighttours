// How a calendar event looks in THIS product: its icon, the words and the pill of its status, the colour of its edge.
// The calendar's views (./views.tsx) ask here and nowhere else.
import { PILL, STAGE_COLOR, STATUS_LABEL, stageOf } from "../order-ui";
import { REQUEST_STATUS_LABEL } from "@/lib/corporate-constants";
import { EVENT_TYPE_LABEL, type CalEvent, type EventType, type Kind } from "@/lib/calendar-core";

// Small line icons, drawn here so the calendar brings no icon set with it.
const PATHS: Record<string, React.ReactNode> = {
  left: <path d="M14.5 6l-6 6 6 6" />, right: <path d="M9.5 6l6 6-6 6" />, down: <path d="M6 9.5l6 6 6-6" />, plus: <path d="M12 5.5v13M5.5 12h13" />,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5" /></>,
  users: <><circle cx="12" cy="8.5" r="3.2" /><path d="M5.5 19.5c.6-3.3 3.2-5 6.5-5s5.9 1.7 6.5 5" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>,
  check: <><circle cx="12" cy="12" r="8" /><path d="M8.5 12.3l2.4 2.4 4.6-5" /></>,
  tag: <><path d="M4.5 12.7V5.5h7.2l7.8 7.8-7.2 7.2z" /><circle cx="8.5" cy="9.5" r="1.2" /></>,
  shield: <><path d="M12 3.5l7 2.5v5.5c0 4.3-2.9 7.4-7 9-4.1-1.6-7-4.7-7-9V6z" /><path d="M12 8.5v4M12 15.5v.1" /></>,
  wallet: <><rect x="3.5" y="6" width="17" height="13" rx="2.5" /><path d="M3.5 10h17M15.5 14.5h2" /></>,
  pin: <><path d="M12 21s6.5-6.1 6.5-11.2A6.5 6.5 0 005.5 9.8C5.5 14.9 12 21 12 21z" /><circle cx="12" cy="9.8" r="2.3" /></>,
  briefcase: <><rect x="3.5" y="7.5" width="17" height="12" rx="2.5" /><path d="M9 7.5V6a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 6v1.5M3.5 13h17" /></>,
  filter: <path d="M4.5 7h15M7.5 12h9M10.5 17h3" />, search: <><circle cx="11" cy="11" r="6" /><path d="M15.5 15.5L20 20" /></>,
};
export function CalIcon({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>{PATHS[name] ?? PATHS.tag}</svg>;
}
export const EVENT_ICON: Record<EventType, string> = { MEETING: "users", REMINDER: "clock", TASK: "check", HOLIDAY: "calendar", OTHER: "tag" };
export const KIND_ICON: Record<Kind, string> = { order: "pin", partner: "briefcase", deadline: "wallet", custom: "calendar" };
export function EventIcon({ e, size = 14 }: { e: Pick<CalEvent, "kind" | "sub" | "mark">; size?: number }) {
  if (e.mark === "passport") return <CalIcon name="shield" size={size} />;
  if (e.kind === "custom") return <CalIcon name={EVENT_ICON[e.sub as EventType] ?? "tag"} size={size} />;
  return <CalIcon name={KIND_ICON[e.kind]} size={size} />;
}
const REQUEST_TONE: Record<string, string> = { NEW: "bg-gold-500/25 text-[#6B4A0C]", CONFIRMED: "bg-[#E3EEFB] text-[#1D4E89]", IN_PROGRESS: "bg-[#FDE9D3] text-[#8A4B0A]", COMPLETED: "bg-ink/[.07] text-ink/70", CANCELLED: "bg-red-100 text-red-800" };
/** The status in words: the same words the Orders and Corporate requests lists use. */
export function statusText(e: CalEvent): string {
  if (e.mark === "passport") return "Passport to check";
  if (e.kind === "order") return STATUS_LABEL[e.status] ?? e.status;
  if (e.kind === "partner") return REQUEST_STATUS_LABEL[e.status] ?? e.status;
  if (e.kind === "deadline") return "Payment due";
  return `${EVENT_TYPE_LABEL[e.sub as EventType] ?? "Event"}${e.done ? ", done" : ""}`;
}
const pill = (tone: string, text: string) => <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{text}</span>;
export function StatusPill({ e }: { e: CalEvent }) {
  if (e.mark === "passport") return pill("bg-red-100 text-red-800", "Passport");
  if (e.kind === "order") return pill(PILL[stageOf(e.status)], STATUS_LABEL[e.status] ?? e.status);
  if (e.kind === "partner") return pill(REQUEST_TONE[e.status] ?? "bg-ink/[.07] text-ink/70", REQUEST_STATUS_LABEL[e.status] ?? e.status);
  if (e.kind === "deadline") return pill("bg-[#FDE9D3] text-[#8A4B0A]", "Due");
  return pill("bg-ink/[.07] text-ink/70", EVENT_TYPE_LABEL[e.sub as EventType] ?? "Event");
}
/** The colour of an order's edge: its stage, as on the order list's date stub. Other kinds carry their own colour in the stylesheet. */
export const edgeColor = (e: CalEvent) => (e.kind === "order" && !e.mark ? STAGE_COLOR[stageOf(e.status)] : e.kind === "deadline" ? STAGE_COLOR.AWAITING : "transparent");
export const peopleText = (e: CalEvent) => (e.kind === "order" && e.mark !== "passport" && e.people ? `${e.people} traveler${e.people === 1 ? "" : "s"}` : e.kind === "partner" && e.people ? `${e.people} people` : "");
/** The edge colours a reader needs explained, for the legend. */
export const STAGE_LEGEND: [string, string][] = [["To do", STAGE_COLOR.NEW], ["Awaiting payment", STAGE_COLOR.AWAITING], ["Partly paid", STAGE_COLOR.PARTIAL], ["Confirmed", STAGE_COLOR.PAID], ["Completed", STAGE_COLOR.DONE]];
