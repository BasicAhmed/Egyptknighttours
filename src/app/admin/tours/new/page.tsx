import TourForm from "../../../../components/TourForm";
import { requireStaff, PERMS } from "../../../../lib/auth";
export default async function NewTour({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const u = await requireStaff("tours"); const { error } = await searchParams;
  return <div><h1 className="h2 mb-4">New tour</h1><TourForm error={error} canFinance={PERMS.finance.includes(u.role)} /></div>;
}
