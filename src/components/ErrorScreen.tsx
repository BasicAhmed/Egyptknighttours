"use client";
import { useEffect } from "react";

const CHUNK = /Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;
// Shows what went wrong instead of a blank crash. If a phone is holding files from an older version of the site,
// it reloads once by itself, which fixes that case.
export default function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = CHUNK.test(`${error?.name} ${error?.message}`);
  useEffect(() => {
    if (!stale) return;
    try { if (!sessionStorage.getItem("egk_reloaded")) { sessionStorage.setItem("egk_reloaded", "1"); location.reload(); } } catch {}
  }, [stale]);
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "64px 20px", fontFamily: "system-ui, sans-serif", color: "#141010" }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "#C09040", textTransform: "uppercase" }}>Egypt Knight Tours</p>
      <h1 style={{ fontSize: 30, lineHeight: 1.1, margin: "8px 0 12px" }}>Something went wrong on this page</h1>
      <p style={{ color: "#555" }}>{stale ? "The site was just updated. Reloading usually fixes this." : "Please try again. If it keeps happening, send us a screenshot of this page."}</p>
      <div style={{ display: "flex", gap: 10, margin: "20px 0", flexWrap: "wrap" }}>
        <button onClick={() => { try { sessionStorage.removeItem("egk_reloaded"); } catch {} location.reload(); }} style={{ background: "#F0B050", border: 0, borderRadius: 12, padding: "13px 20px", fontWeight: 700, fontSize: 15 }}>Reload page</button>
        <button onClick={reset} style={{ background: "#fff", border: "1px solid #ccc", borderRadius: 12, padding: "13px 20px", fontWeight: 600, fontSize: 15 }}>Try again</button>
        <a href="/" style={{ border: "1px solid #ccc", borderRadius: 12, padding: "13px 20px", fontWeight: 600, fontSize: 15, color: "#141010", textDecoration: "none" }}>Home</a>
      </div>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#f6f3ec", borderRadius: 12, padding: 14, fontSize: 12, color: "#444" }}>{`${error?.name ?? "Error"}: ${error?.message ?? ""}${error?.digest ? `\nDigest: ${error.digest}` : ""}\n${typeof navigator !== "undefined" ? navigator.userAgent : ""}`}</pre>
    </div>
  );
}
