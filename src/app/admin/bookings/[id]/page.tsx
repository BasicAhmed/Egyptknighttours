import { redirect } from "next/navigation";
export default async function BookingRedirect({ params }: { params: Promise<{ id: string }> }) { redirect(`/admin?open=${(await params).id}`); }
