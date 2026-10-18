import { randomBytes } from "node:crypto";
import { Prisma, UserRole, UserStatus, VehicleStatus, type PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "@/server/config/test-database";
import { createPrismaClient } from "@/server/db/prisma";
import { hashPassword } from "@/server/security/password";

type E2EFixture = Readonly<{
  category: string;
  customerEmail: string;
  customerPassword: string;
  managerEmail: string;
  managerPassword: string;
  vehicleLabel: string;
  vehicleSlug: string;
  cleanup: () => Promise<void>;
}>;

async function removeFixtureData(
  prisma: PrismaClient,
  prefix: string,
  customerEmail: string,
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { OR: [{ id: { startsWith: prefix } }, { email: customerEmail }] },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  await prisma.adminMutationResult.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.notification.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { booking: { vehicleId: { startsWith: prefix } } }] },
  });
  await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.booking.deleteMany({ where: { vehicleId: { startsWith: prefix } } });
  await prisma.vehicle.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

export async function seedBookingFlow(): Promise<E2EFixture> {
  const databaseUrl = requireTestDatabaseUrl({ DATABASE_URL: process.env.E2E_DATABASE_URL });
  const prisma = createPrismaClient(databaseUrl);
  const prefix = `e2e_${randomBytes(8).toString("hex")}`;
  const category = prefix.toUpperCase();
  const vehicleLabel = `${prefix} Test car`;
  const vehicleId = `${prefix}_vehicle`;
  const vehicleSlug = `${prefix}-vehicle`;
  const managerEmail = `${prefix}-manager@example.test`;
  const managerPassword = `${randomBytes(18).toString("base64url")}Aa1!`;
  const customerEmail = `${prefix}-customer@example.test`;
  const customerPassword = `${randomBytes(18).toString("base64url")}Aa1!`;

  try {
    await prisma.$connect();
    await prisma.user.create({
      data: {
        id: `${prefix}_manager`,
        name: "E2E Manager",
        email: managerEmail,
        passwordHash: await hashPassword(managerPassword),
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
      },
    });
    await prisma.vehicle.create({
      data: {
        id: vehicleId,
        slug: vehicleSlug,
        brand: prefix,
        model: "Test car",
        year: 2025,
        category,
        seats: 5,
        transmission: "AUTOMATIC",
        fuel: "PETROL",
        drive: "AWD",
        depositAmount: new Prisma.Decimal("300.00"),
        currency: "GEL",
        insuranceIncluded: true,
        status: VehicleStatus.AVAILABLE,
        location: "Tbilisi Airport",
        pricingRules: {
          create: [
            { minDays: 1, maxDays: 2, pricePerDay: new Prisma.Decimal("100.00"), currency: "GEL" },
            { minDays: 3, maxDays: 6, pricePerDay: new Prisma.Decimal("90.00"), currency: "GEL" },
            { minDays: 7, maxDays: 14, pricePerDay: new Prisma.Decimal("80.00"), currency: "GEL" },
            { minDays: 15, maxDays: null, pricePerDay: new Prisma.Decimal("70.00"), currency: "GEL" },
          ],
        },
      },
    });
  } catch (error) {
    try {
      await removeFixtureData(prisma, prefix, customerEmail);
    } finally {
      await prisma.$disconnect();
    }
    throw error;
  }

  return {
    category,
    customerEmail,
    customerPassword,
    managerEmail,
    managerPassword,
    vehicleLabel,
    vehicleSlug,
    cleanup: async () => {
      try {
        await removeFixtureData(prisma, prefix, customerEmail);
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
