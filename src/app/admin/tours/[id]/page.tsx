import { notFound } from "next/navigation";
import { db, schema as s } from "../../../../db";
import { eq } from "drizzle-orm";
import TourForm from "../../../../components/TourForm";
import { requireStaff, PERMS } from "../../../../lib/auth";
export default async function EditTour({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const u = await requireStaff("tours"); const { id } = await params; const { error } = await searchParams;
  const [t] = await db.select().from(s.tours).where(eq(s.tours.id, id)); if (!t) notFound();
  return <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="h2">Edit: {t.title}</h1><div className="flex gap-2"><a className="btn btn-outline !min-h-[40px] !py-2" href={`/api/tours/${t.slug}/pdf?view=1`} target="_blank" rel="noopener noreferrer">Preview PDF</a><a className="btn btn-dark !min-h-[40px] !py-2" href={`/api/tours/${t.slug}/pdf`}>Download PDF</a></div></div><TourForm tour={t} error={error} canFinance={PERMS.finance.includes(u.role)} /></div>;
}
