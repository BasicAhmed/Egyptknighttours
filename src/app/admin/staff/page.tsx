import { db, schema as s } from "@/db";
import { desc } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import Notice from "@/components/Notice";
import { createStaff, updateStaffRole, resetStaffPassword, removeStaff } from "../staff-actions";
import ConfirmButton from "@/components/ConfirmButton";

const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: "Owner (full access)", MANAGER: "Manager", SALES: "Sales", CONTENT_EDITOR: "Content editor", TOUR_OPERATOR: "Tour operator" };

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ n?: string; e?: string }> }) {
  const me = await requireStaff("staff"); const sp = await searchParams;
  const staff = await db.select({ id: s.users.id, name: s.users.name, email: s.users.email, role: s.users.role, createdAt: s.users.createdAt }).from(s.users).orderBy(desc(s.users.createdAt));

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Staff accounts</h1>
      <p className="text-sm text-ink/65">Who can log in to the admin, and what each person can do. Owner-only.</p>
      <div className="mt-3"><Notice n={sp.n} e={sp.e} /></div>

      <details className="mt-5 rounded-2xl border border-ink/10 bg-white p-4" open={staff.length <= 1}>
        <summary className="cursor-pointer font-display text-lg font-bold">+ Add a staff account</summary>
        <form action={createStaff} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="label">Name</span><input name="name" required className="input" /></label>
          <label className="block"><span className="label">Email (this is what they log in with)</span><input name="email" type="email" required className="input" /></label>
          <label className="block"><span className="label">Password</span><input name="password" type="text" required minLength={8} className="input" placeholder="At least 8 characters" /></label>
          <label className="block"><span className="label">Role</span><select name="role" defaultValue="SALES" className="input">{Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <div className="sm:col-span-2"><button className="btn btn-primary !min-h-[46px]">Create account</button></div>
          <p className="text-xs text-ink/65 sm:col-span-2">Two people can share the same password if you'd like — just create each account with the one you want to use, one at a time.</p>
        </form>
      </details>

      <div className="mt-6 space-y-3">
        {staff.map((u) => (
          <div key={u.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-semibold">{u.name} {u.id === me.uid && <span className="text-xs font-normal text-ink/65">(you)</span>}</p><p className="text-sm text-ink/65">{u.email}</p></div>
              <form action={updateStaffRole.bind(null, u.id)} className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`role-${u.id}`}>Role for {u.name}</label><select id={`role-${u.id}`} name="role" defaultValue={u.role} className="input !w-auto !py-1.5 !text-sm">{Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                <button className="btn btn-outline !min-h-[38px] !py-1.5 !text-[13px]">Save role</button>
              </form>
            </div>
            <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-ink/70">Reset password</summary>
              <form action={resetStaffPassword.bind(null, u.id)} className="mt-2 flex flex-wrap gap-2">
                <input name="password" type="text" minLength={8} required placeholder="New password, at least 8 characters" className="input !w-auto flex-1" />
                <button className="btn btn-outline !min-h-[42px]">Update password</button>
              </form>
            </details>
            {u.id !== me.uid && <form action={removeStaff.bind(null, u.id)} className="mt-3"><ConfirmButton confirmText={`Remove ${u.name}'s access?`}>Remove this account</ConfirmButton></form>}
          </div>
        ))}
      </div>
    </div>
  );
}
