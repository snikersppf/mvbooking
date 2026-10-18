import { randomUUID } from "node:crypto";
import {
  BookingStatus,
  PaymentStatus,
  Prisma,
  UserRole,
  UserStatus,
  VehicleStatus,
  type User,
} from "@prisma/client";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { renderLocalizedPage } from "@/tests/helpers/render-localized-page";

vi.mock("@/lib/i18n/server", async () => {
  const { createTranslator } = await import("@/lib/i18n/translate");
  return { getTranslations: async () => createTranslator("en") };
});

const authState = vi.hoisted(() => ({
  session: null as null | {
    user: {
      id: string;
      sessionVersion: number;
    };
  },
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: () => ({
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    }),
  };
});

vi.mock("@/server/auth/current-user", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/auth/current-user")>();

  return {
    ...actual,
    requireCurrentUser: vi.fn(() =>
      actual.requireCurrentUserFromIdentity(
        authState.session
          ? {
              userId: authState.session.user.id,
              sessionVersion: authState.session.user.sessionVersion,
            }
          : null,
      ),
    ),
  };
});

import AccountBookingsPage from "@/app/account/bookings/page";
import VehiclePage from "@/app/vehicles/[slug]/page";
import BookingPage from "@/app/vehicles/[slug]/booking/page";
import {
  createPrismaClient,
  getPrismaClient,
} from "@/server/db/prisma";
import { cleanupTrackedPrefixes } from "@/tests/integration/cleanup";
import { requireTestDatabaseUrl } from "@/tests/integration/test-database";

const databaseUrl = requireTestDatabaseUrl();
const prisma = createPrismaClient(databaseUrl);
const prefixes: string[] = [];

function newPrefix(): string {
  const prefix =
    "pages_" + randomUUID().replaceAll("-", "").slice(0, 14);
  prefixes.push(prefix);
  return prefix;
}

function setSession(user: User | null): void {
  authState.session = user
    ? {
        user: {
          id: user.id,
          sessionVersion: user.sessionVersion,
        },
      }
    : null;
}

async function createUser(
  prefix: string,
  status: UserStatus = UserStatus.ACTIVE,
): Promise<User> {
  return prisma.user.create({
    data: {
      id: prefix + "_user",
      name: "Page customer",
      email: prefix + "@example.test",
      role: UserRole.CUSTOMER,
      status,
      sessionVersion: 0,
    },
  });
}

async function createVehicle(prefix: string) {
  const vehicle = await prisma.vehicle.create({
    data: {
      id: prefix + "_vehicle",
      slug: prefix + "-vehicle",
      brand: "Toyota",
      model: "RAV4",
      year: 2025,
      category: "SUV",
      seats: 5,
      transmission: "AUTOMATIC",
      fuel: "PETROL",
      drive: "AWD",
      depositAmount: new Prisma.Decimal("300.00"),
      currency: "GEL",
      insuranceIncluded: true,
      status: VehicleStatus.AVAILABLE,
      location: "Tbilisi",
    },
  });
  await prisma.pricingRule.create({
    data: {
      id: prefix + "_pricing",
      vehicleId: vehicle.id,
      minDays: 1,
      maxDays: null,
      pricePerDay: new Prisma.Decimal("90.00"),
      currency: "GEL",
    },
  });
  return vehicle;
}

async function cleanup(prefix: string): Promise<void> {
  await prisma.notification.deleteMany({
    where: { booking: { vehicleId: { startsWith: prefix } } },
  });
  await prisma.auditLog.deleteMany({
    where: { userId: { startsWith: prefix } },
  });
  await prisma.booking.deleteMany({
    where: { vehicleId: { startsWith: prefix } },
  });
  await prisma.pricingRule.deleteMany({
    where: { vehicleId: { startsWith: prefix } },
  });
  await prisma.vehicle.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
}

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  setSession(null);
  await cleanupTrackedPrefixes(prefixes, cleanup);
});

afterAll(async () => {
  try {
    await cleanupTrackedPrefixes(prefixes, cleanup);
  } finally {
    await prisma.$disconnect();
    await getPrismaClient().$disconnect();
  }
});

describe("customer page access integration", () => {
  it("renders separate public vehicle and booking pages without a session", async () => {
    const prefix = newPrefix();
    const vehicle = await createVehicle(prefix);
    setSession(null);

    const page = await VehiclePage({
      params: Promise.resolve({ slug: vehicle.slug }),
    });
    const vehicleMarkup = await renderLocalizedPage(page);
    expect(vehicleMarkup).toContain("Book this car");
    expect(vehicleMarkup).not.toContain("Check price");
    const bookingPage = await BookingPage({ params: Promise.resolve({ slug: vehicle.slug }) });
    const rendered = await renderLocalizedPage(bookingPage);
    expect(rendered).toContain("Book your car");
    expect(rendered).toContain("Pickup date and time");
    expect(rendered).toContain("Check price");
    expect(rendered).toContain("Asia/Tbilisi");
  });

  it("renders only the current active user's bookings", async () => {
    const prefix = newPrefix();
    const user = await createUser(prefix);
    const vehicle = await createVehicle(prefix);
    const startDate = new Date("2027-02-10T06:00:00.000Z");
    const booking = await prisma.booking.create({
      data: {
        id: prefix + "_booking",
        userId: user.id,
        vehicleId: vehicle.id,
        startDate,
        endDate: new Date("2027-02-13T06:00:00.000Z"),
        pickupLocation: "Tbilisi",
        returnLocation: "Tbilisi",
        totalDays: 3,
        pricePerDay: new Prisma.Decimal("90.00"),
        totalAmount: new Prisma.Decimal("270.00"),
        depositAmount: new Prisma.Decimal("300.00"),
        currency: "GEL",
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
      },
    });
    setSession(user);

    const page = await AccountBookingsPage({
      searchParams: Promise.resolve({}),
    });
    const rendered = await renderLocalizedPage(page);
    expect(rendered).toContain(booking.id);
    expect(rendered).toContain(vehicle.brand);
    expect(rendered).toContain(vehicle.model);
    expect(rendered).toContain("Cancel booking");
  });

  it.each([
    { label: "no session", status: null },
    { label: "a suspended user", status: UserStatus.SUSPENDED },
  ])("redirects $label to sign in", async ({ status }) => {
    if (status) {
      const prefix = newPrefix();
      setSession(await createUser(prefix, status));
    } else {
      setSession(null);
    }

    let thrown: unknown;
    try {
      await AccountBookingsPage({
        searchParams: Promise.resolve({}),
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeDefined();
    expect((thrown as { digest?: string }).digest).toContain(
      "/login?callbackUrl=%2Faccount%2Fbookings",
    );
  });
});
