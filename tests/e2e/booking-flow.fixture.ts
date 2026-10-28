import { randomBytes } from "node:crypto";
import { Prisma, UserRole, UserStatus, VehicleStatus, type PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "@/server/config/test-database";
import { createPrismaClient } from "@/server/db/prisma";
import { backupCodeHash, decryptTotpSecret, encryptTotpSecret, generateTotpSecret } from "@/server/security/totp";
import { createStaffSecondFactor } from "./staff-second-factor";
import { hashPassword } from "@/server/security/password";

type E2EFixture = Readonly<{
  category: string;
  customerEmail: string;
  customerPassword: string;
  managerEmail: string;
  managerPassword: string;
  clientIp: string;
  managerSecondFactor: () => Promise<Readonly<{ code: string; kind: "totp" | "backup" }>>;
  authDiagnostics: () => Promise<Readonly<{
    accountExists: boolean; active: boolean; staffRole: boolean;
    mfaConfigured: boolean; keyDecrypts: boolean; currentStepConsumed: boolean;
    backupCodesRemaining: number;
  }>>;
  vehicleLabel: string;
  vehicleSlug: string;
  findLeadId: () => Promise<string>;
  cleanup: () => Promise<void>;
}>;

async function removeFixtureData(
  prisma: PrismaClient,
  prefix: string,
  customerEmail: string,
): Promise<void> {
  await prisma.lead.deleteMany({ where: { email: customerEmail } });
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
  const mfaKey = process.env.MFA_ENCRYPTION_KEY;
  if (!mfaKey) throw new Error("Run E2E through playwright.config.ts to configure the test MFA key.");
  const prisma = createPrismaClient(databaseUrl);
  const prefix = `e2e_${randomBytes(8).toString("hex")}`;
  const category = prefix.toUpperCase();
  const vehicleLabel = `${prefix} Test car`;
  const vehicleId = `${prefix}_vehicle`;
  const vehicleSlug = `${prefix}-vehicle`;
  const managerId = `${prefix}_manager`;
  const managerSecret = generateTotpSecret();
  const backupCodes = Array.from({ length: 4 }, () => randomBytes(16).toString("hex"));
  // The local test server trusts proxy headers; isolate each test's IP bucket.
  const clientIp = `127.${Array.from(randomBytes(3)).join(".")}`;
  const managerSecondFactor = createStaffSecondFactor(managerSecret, backupCodes, async () =>
    (await prisma.user.findUniqueOrThrow({ where: { id: managerId }, select: { totpLastCounter: true } })).totpLastCounter,
  );
  const managerEmail = `${prefix}-manager@example.test`;
  const managerPassword = `${randomBytes(18).toString("base64url")}Aa1!`;
  const customerEmail = `${prefix}-customer@example.test`;
  const customerPassword = `${randomBytes(18).toString("base64url")}Aa1!`;

  try {
    await prisma.$connect();
    await prisma.user.create({
      data: {
        id: managerId,
        name: "E2E Manager",
        email: managerEmail,
        passwordHash: await hashPassword(managerPassword),
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
        totpSecretEncrypted: encryptTotpSecret(managerSecret, managerId, { NODE_ENV: "test", MFA_ENCRYPTION_KEY: mfaKey }),
        totpEnabledAt: new Date(),
        totpLastCounter: -1,
        backupCodeHashes: backupCodes.map((code) => backupCodeHash(managerId, code)),
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
    clientIp,
    managerSecondFactor,
    authDiagnostics: async () => {
      const user = await prisma.user.findUnique({ where: { id: managerId }, select: {
        role: true, status: true, totpEnabledAt: true, totpSecretEncrypted: true,
        totpLastCounter: true, backupCodeHashes: true,
      } });
      let keyDecrypts = false;
      try {
        keyDecrypts = Boolean(user?.totpSecretEncrypted && decryptTotpSecret(user.totpSecretEncrypted, managerId,
          { NODE_ENV: "test", MFA_ENCRYPTION_KEY: mfaKey }) === managerSecret);
      } catch { /* Return a boolean only; never print crypto errors or key material. */ }
      return {
        accountExists: Boolean(user), active: user?.status === "ACTIVE",
        staffRole: user?.role === "MANAGER" || user?.role === "ADMIN",
        mfaConfigured: Boolean(user?.totpEnabledAt && user.totpSecretEncrypted), keyDecrypts,
        currentStepConsumed: (user?.totpLastCounter ?? -1) >= Math.floor(Date.now() / 30_000),
        backupCodesRemaining: user?.backupCodeHashes.length ?? 0,
      };
    },
    vehicleLabel,
    vehicleSlug,
    findLeadId: async () => (await prisma.lead.findFirstOrThrow({ where: { email: customerEmail } })).id,
    cleanup: async () => {
      try {
        await removeFixtureData(prisma, prefix, customerEmail);
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
