import { ARCHIVED_LEAD_STATUSES } from "@/lib/lead-status";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/server/auth/guards";
import { getPrismaClient } from "@/server/db/prisma";
import type { CurrentUser } from "@/server/auth/current-user";
import { MANAGER_ADMIN_ROLES } from "./authorization";

const querySchema = z.object({
  view: z.enum(["active", "past"]).default("active"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).strict();
export type BookingWorkItem = {
  kind: "booking" | "enquiry"; id: string; name: string; email: string | null; phone: string | null;
  vehicle: string | null; startDate: Date | null; endDate: Date | null;
  status: string; totalDue: string | null; currency: string | null; createdAt: Date;
};
export async function listBookingWorklist(input: unknown, dependencies: {
  prisma?: PrismaClient; authorize?: () => Promise<CurrentUser>;
} = {}) {
  await (dependencies.authorize ?? (() => requireRole(MANAGER_ADMIN_ROLES)))();
  const query = querySchema.parse(input);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const statuses = query.view === "active" ? ["PENDING", "CONFIRMED"] : ["COMPLETED", "CANCELLED", "REJECTED"];
  const enquiryStatuses = query.view === "active" ? ["IN_PROGRESS"] : [...ARCHIVED_LEAD_STATUSES];
  const source = Prisma.sql`
    SELECT 'booking'::text AS "kind", b."id", u."name", u."email", u."phone",
      concat_ws(' ', v."brand", v."model") AS "vehicle", b."startDate", b."endDate",
      b."status"::text AS "status", (b."totalAmount" + b."depositAmount")::text AS "totalDue",
      b."currency", b."createdAt"
    FROM "Booking" b JOIN "User" u ON u."id" = b."userId" JOIN "Vehicle" v ON v."id" = b."vehicleId"
    WHERE b."status"::text IN (${Prisma.join(statuses)})
    UNION ALL
    SELECT 'enquiry'::text AS "kind", l."id", l."name", l."email", l."phone",
      CASE WHEN v."id" IS NULL THEN NULL ELSE concat_ws(' ', v."brand", v."model") END AS "vehicle",
      l."startDate", l."endDate", l."status"::text AS "status", NULL::text AS "totalDue",
      NULL::text AS "currency", l."createdAt"
    FROM "Lead" l LEFT JOIN "Vehicle" v ON v."id" = l."vehicleId"
    WHERE l."status"::text IN (${Prisma.join(enquiryStatuses)})
  `;
  const [counts, items] = await Promise.all([
    prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT count(*) AS total FROM (${source}) worklist`),
    prisma.$queryRaw<BookingWorkItem[]>(Prisma.sql`SELECT * FROM (${source}) worklist
      ORDER BY "createdAt" DESC, "kind" ASC, "id" ASC LIMIT 20 OFFSET ${(query.page - 1) * 20}`),
  ]);
  const total = Number(counts[0]?.total ?? 0);
  return { items, total, page: query.page, view: query.view, totalPages: Math.max(1, Math.ceil(total / 20)) };
}
