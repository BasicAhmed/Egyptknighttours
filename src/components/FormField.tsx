"use client";
import { createContext, useContext } from "react";

// A form field that keeps its identity between keystrokes.
// (Defining a field component INSIDE a form component makes React rebuild the input on every letter, which closes the phone keyboard.)
export type FieldApi = { get: (k: string) => string; set: (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void; idPrefix: string; pad: string };
export const FieldCtx = createContext<FieldApi | null>(null);
export function fieldApi(v: object, set: unknown, idPrefix: string, pad = "!py-2"): FieldApi {
  return { get: (k) => String((v as Record<string, unknown>)[k] ?? ""), set: set as FieldApi["set"], idPrefix, pad };
}
export function F({ k, label, type = "text", list, cls = "", ph, req = false }: { k: string; label: string; type?: string; list?: string; cls?: string; ph?: string; req?: boolean }) {
  const c = useContext(FieldCtx); if (!c) return null; const id = c.idPrefix + k;
  return <div className={cls}><label className="label" htmlFor={id}>{label}</label><input id={id} className={`input ${c.pad}`} type={type} list={list} placeholder={ph} required={req} value={c.get(k)} onChange={c.set(k)} /></div>;
}
