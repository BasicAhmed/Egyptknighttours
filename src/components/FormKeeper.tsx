"use client";
import { useEffect, useRef } from "react";
// Drop <FormKeeper /> inside any <form> whose server action sends the user back with "?error=…" when something is invalid.
// The page reloads from the database on that redirect, which used to wipe everything just typed. This remembers the values
// when the form is submitted and puts them back (only when we come back with an error), so nothing has to be retyped.
export default function FormKeeper() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form"); if (!form) return;
    const idx = Array.from(document.forms).indexOf(form);
    const key = `fk:${location.pathname}:${idx}`;
    const save = () => {
      try {
        const data: Record<string, string[]> = {};
        for (const el of Array.from(form.elements) as HTMLInputElement[]) {
          if (!el.name || el.disabled || el.type === "file" || el.type === "password" || el.type === "submit" || el.type === "button") continue;
          if ((el.type === "checkbox" || el.type === "radio") && !el.checked) { (data[el.name] ??= []); continue; }
          (data[el.name] ??= []).push(el.value);
        }
        sessionStorage.setItem(key, JSON.stringify(data));
      } catch { /* storage unavailable: nothing is kept, nothing breaks */ }
    };
    form.addEventListener("submit", save);
    try {
      const raw = sessionStorage.getItem(key); sessionStorage.removeItem(key);
      if (raw && (() => { const q = new URLSearchParams(location.search); return q.has("error") || q.has("e"); })()) {
        const data = JSON.parse(raw) as Record<string, string[]>;
        const setter = (el: HTMLElement) => Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
        const hidden: Record<string, string> = {};
        for (const [name, vals] of Object.entries(data)) {
          const els = Array.from(form.elements).filter((e) => (e as HTMLInputElement).name === name) as HTMLInputElement[];
          els.forEach((el, i) => {
            if (el.type === "checkbox" || el.type === "radio") { el.checked = vals.includes(el.value); el.dispatchEvent(new Event("click", { bubbles: true })); el.checked = vals.includes(el.value); return; }
            const v = vals[i] ?? vals[0] ?? ""; if (el.value === v) return;
            if (el.type === "hidden") { hidden[name] = v; el.value = v; return; }
            setter(el)?.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true }));
          });
        }
        // Widgets that keep their own state (the photo picker) listen for this.
        setTimeout(() => window.dispatchEvent(new CustomEvent("fk-restore", { detail: hidden })), 0);
      }
    } catch { /* ignore */ }
    return () => form.removeEventListener("submit", save);
  }, []);
  return <span ref={ref} hidden />;
}
