import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadOrder } from "@/lib/orders";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const o = await loadOrder((await params).id);
  return o ? NextResponse.json(o) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
