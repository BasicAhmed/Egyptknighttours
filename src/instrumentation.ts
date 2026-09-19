export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureDatabase } = await import("./db/bootstrap");
    await ensureDatabase().catch((e) => console.error("Database bootstrap failed:", e));
  }
}
