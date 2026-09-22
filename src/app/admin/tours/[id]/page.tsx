import { notFound } from "next/navigation";
import { db, schema as s } from "../../../../db";
import { eq } from "drizzle-orm";
import TourForm from "../../../../components/TourForm";
import { requireStaff, PERMS } from "../../../../lib/auth";
export default async function EditTour({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const u = await requireStaff("tours"); const { id } = await params; const { error } = await searchParams;
  const [t] = await db.select().from(s.tours).where(eq(s.tours.id, id)); if (!t) notFound();
  return <div><h1 className="h2 mb-4">Edit: {t.title}</h1><TourForm tour={t} error={error} canFinance={PERMS.finance.includes(u.role)} /></div>;
}
