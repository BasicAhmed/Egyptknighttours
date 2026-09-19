import TourForm from "../../../../components/TourForm";
import { requireStaff } from "../../../../lib/auth";
export default async function NewTour({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff("tours"); const { error } = await searchParams;
  return <div><h1 className="h2 mb-4">New tour</h1><TourForm error={error} /></div>;
}
