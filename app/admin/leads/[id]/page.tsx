import { redirect } from "next/navigation";

export default async function LegacyLeadPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  redirect(`/admin/bookings/requests/${encodeURIComponent((await params).id)}`);
}
