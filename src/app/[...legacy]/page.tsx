import type { Metadata } from "next";
import { legacyOrNotFound } from "@/lib/legacy-server";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };
// Catches addresses that match no page, so addresses from the old website can redirect to the right new page.
export default async function Legacy({ params }: { params: Promise<{ legacy: string[] }> }) {
  const { legacy } = await params;
  return legacyOrNotFound("/" + legacy.join("/"));
}
