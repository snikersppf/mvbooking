import { redirect } from "next/navigation";
import { firstAdminSearchParam, type RawAdminSearchParams } from "@/lib/admin-pages";

export default async function LegacyLeadsPage({ searchParams }: Readonly<{ searchParams: Promise<RawAdminSearchParams> }>) {
  const query = await searchParams, target = new URLSearchParams();
  const status = firstAdminSearchParam(query.status), page = firstAdminSearchParam(query.page);
  if (status && status !== "NEW" && status !== "IN_PROGRESS") target.set("view", "past");
  if (page) target.set(status === "NEW" ? "newPage" : "page", page);
  redirect(`/admin/bookings${target.size ? `?${target}` : ""}`);
}
