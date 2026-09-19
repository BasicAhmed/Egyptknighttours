import Link from "next/link";
import { db, schema as s } from "../../../db";
import { desc } from "drizzle-orm";
import { requireStaff, PERMS } from "../../../lib/auth";
import { deleteTour } from "../actions";
import { money } from "../../../lib/format";
export const dynamic = "force-dynamic";
export default async function AdminTours() {
  const u = await requireStaff();
  const can = PERMS.tours.includes(u.role);
  const rows = await db.select().from(s.tours).orderBy(desc(s.tours.updatedAt));
  return <div><div className="flex items-center justify-between"><h1 className="h2">Tours</h1>{can && <Link href="/admin/tours/new" className="btn btn-primary">New tour</Link>}</div>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b border-ink/10 text-ink/60"><tr><th className="py-2">Title</th><th>Status</th><th>Price</th><th>Popularity</th><th></th></tr></thead>
      <tbody>{rows.map((t) => <tr key={t.id} className="border-b border-ink/5"><td className="py-3 font-medium">{t.title}</td><td><span className="badge">{t.status}</span></td><td>{money(t.discountPrice ?? t.price)}</td><td>{t.popularity}</td>
        <td className="space-x-2 text-right">{can && <><Link className="btn btn-outline !py-1.5" href={`/admin/tours/${t.id}`}>Edit</Link><form action={deleteTour.bind(null, t.id)} className="inline"><button className="btn btn-outline !py-1.5 text-red-700">Delete</button></form></>}</td></tr>)}</tbody></table></div></div>;
}
