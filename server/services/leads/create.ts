import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import { CONTACT_CONSENT_VERSION, createLeadSchema } from "@/server/validators/lead";

export async function createLead(input: unknown, prisma: PrismaClient = getPrismaClient(), now = new Date()): Promise<void> {
  const data = createLeadSchema.parse(input);
  if (data.website) return;
  // Unknown/unpublished vehicle references do not disclose catalogue state or block a contact enquiry.
  const vehicle = data.vehicleId ? await prisma.vehicle.findFirst({ where: {
    id: data.vehicleId, status: "AVAILABLE",
  }, select: { id: true } }) : null;
  await prisma.lead.create({ data: {
    name: data.name, email: data.email, phone: data.phone, vehicleId: vehicle?.id,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
    comment: data.comment, consentVersion: CONTACT_CONSENT_VERSION, consentAt: now,
    notifications: { create: { type: "LEAD_CREATED", channel: "EMAIL", payload: { provider: "stub" } } },
  } });
}
