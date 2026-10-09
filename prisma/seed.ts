import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  BookingStatus,
  Prisma,
  PrismaClient,
  UserRole,
  VehicleStatus,
} from "@prisma/client";
import { hashPassword } from "../server/security/password";

const SEED_PASSWORD_PLACEHOLDER = "replace-with-a-local-seed-password";

type SeedVehicle = {
  brand: string;
  model: string;
  slug: string;
  category: string;
  year: number;
  seats: number;
  transmission: string;
  fuel: string;
  drive: string;
  location: string;
};

const vehicles: SeedVehicle[] = [
  { brand: "Toyota", model: "Corolla", slug: "economy-toyota-corolla", category: "ECONOMY", year: 2022, seats: 5, transmission: "AUTOMATIC", fuel: "PETROL", drive: "FWD", location: "Tbilisi" },
  { brand: "Hyundai", model: "Elantra", slug: "economy-hyundai-elantra", category: "ECONOMY", year: 2023, seats: 5, transmission: "AUTOMATIC", fuel: "PETROL", drive: "FWD", location: "Tbilisi" },
  { brand: "Kia", model: "Rio", slug: "economy-kia-rio", category: "ECONOMY", year: 2021, seats: 5, transmission: "AUTOMATIC", fuel: "PETROL", drive: "FWD", location: "Batumi" },
  { brand: "Toyota", model: "Yaris", slug: "compact-toyota-yaris", category: "COMPACT", year: 2022, seats: 5, transmission: "AUTOMATIC", fuel: "HYBRID", drive: "FWD", location: "Tbilisi" },
  { brand: "Volkswagen", model: "Golf", slug: "compact-volkswagen-golf", category: "COMPACT", year: 2021, seats: 5, transmission: "AUTOMATIC", fuel: "PETROL", drive: "FWD", location: "Kutaisi" },
  { brand: "Honda", model: "Civic", slug: "compact-honda-civic", category: "COMPACT", year: 2023, seats: 5, transmission: "AUTOMATIC", fuel: "PETROL", drive: "FWD", location: "Batumi" },
  { brand: "Toyota", model: "RAV4", slug: "suv-toyota-rav4", category: "SUV", year: 2023, seats: 5, transmission: "AUTOMATIC", fuel: "HYBRID", drive: "AWD", location: "Tbilisi" },
  { brand: "Hyundai", model: "Tucson", slug: "suv-hyundai-tucson", category: "SUV", year: 2022, seats: 5, transmission: "AUTOMATIC", fuel: "PETROL", drive: "AWD", location: "Tbilisi" },
  { brand: "Kia", model: "Sportage", slug: "suv-kia-sportage", category: "SUV", year: 2024, seats: 5, transmission: "AUTOMATIC", fuel: "PETROL", drive: "AWD", location: "Batumi" },
  { brand: "Ford", model: "Transit", slug: "van-ford-transit", category: "VAN", year: 2020, seats: 9, transmission: "MANUAL", fuel: "DIESEL", drive: "RWD", location: "Tbilisi" },
  { brand: "Mercedes-Benz", model: "Vito", slug: "van-mercedes-vito", category: "VAN", year: 2021, seats: 8, transmission: "AUTOMATIC", fuel: "DIESEL", drive: "RWD", location: "Kutaisi" },
  { brand: "Toyota", model: "Land Cruiser", slug: "premium-toyota-land-cruiser", category: "PREMIUM", year: 2023, seats: 7, transmission: "AUTOMATIC", fuel: "PETROL", drive: "4WD", location: "Tbilisi" },
];

const dailyPrice: Record<string, string> = {
  ECONOMY: "90.00",
  COMPACT: "120.00",
  SUV: "180.00",
  VAN: "220.00",
  PREMIUM: "350.00",
};

const pricingTiers = [
  { minDays: 1, maxDays: 2, multiplier: "1.00" },
  { minDays: 3, maxDays: 6, multiplier: "0.95" },
  { minDays: 7, maxDays: 14, multiplier: "0.90" },
  { minDays: 15, maxDays: null, multiplier: "0.85" },
] as const;

function seedDatabaseUrl(): string {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed is forbidden when NODE_ENV=production.");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const url = new URL(connectionString);
  if (
    !["postgresql:", "postgres:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "postgres"].includes(url.hostname) ||
    url.pathname !== "/mvbooking"
  ) {
    throw new Error(
      "Seed may only connect to database mvbooking on localhost, 127.0.0.1 or postgres.",
    );
  }
  return connectionString;
}

function seedPassword(): string {
  const password = process.env.SEED_PASSWORD;
  if (
    !password ||
    password.length < 12 ||
    password === SEED_PASSWORD_PLACEHOLDER
  ) {
    throw new Error(
      "Set SEED_PASSWORD to a non-placeholder value of at least 12 characters.",
    );
  }
  return password;
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main(): Promise<void> {
  const connectionString = seedDatabaseUrl();
  const passwordHash = await hashPassword(seedPassword());
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const users = [
      { id: "seed-user-admin", email: "admin@example.com", name: "Test Admin", role: UserRole.ADMIN },
      { id: "seed-user-manager", email: "manager@example.com", name: "Test Manager", role: UserRole.MANAGER },
      { id: "seed-user-customer", email: "customer@example.com", name: "Test Customer", role: UserRole.CUSTOMER },
    ] as const;

    for (const user of users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: { ...user, passwordHash },
      });
    }

    for (const vehicle of vehicles) {
      const id = "seed-vehicle-" + vehicle.slug;
      const depositAmount =
        vehicle.category === "PREMIUM" ? "800.00" :
        vehicle.category === "VAN" ? "600.00" : "300.00";

      await prisma.vehicle.upsert({
        where: { id },
        update: {},
        create: {
          id,
          ...vehicle,
          description: vehicle.brand + " " + vehicle.model + " for rental in Georgia.",
          engine: vehicle.fuel === "HYBRID" ? "1.8L hybrid" : "2.0L",
          depositAmount: new Prisma.Decimal(depositAmount),
          currency: "GEL",
          insuranceIncluded: vehicle.category !== "PREMIUM",
          status: VehicleStatus.AVAILABLE,
        },
      });

      for (const tier of pricingTiers) {
        const pricePerDay = new Prisma.Decimal(dailyPrice[vehicle.category])
          .mul(new Prisma.Decimal(tier.multiplier))
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        await prisma.pricingRule.upsert({
          where: { id: "seed-price-" + vehicle.slug + "-" + tier.minDays },
          update: {},
          create: {
            id: "seed-price-" + vehicle.slug + "-" + tier.minDays,
            vehicleId: id,
            minDays: tier.minDays,
            maxDays: tier.maxDays,
            pricePerDay,
            currency: "GEL",
          },
        });
      }
    }

    async function upsertExampleBooking(input: {
      id: string;
      vehicle: SeedVehicle;
      startDate: Date;
      endDate: Date;
      status: BookingStatus;
    }) {
      const { id, vehicle, startDate, endDate, status } = input;
      const pricePerDay = new Prisma.Decimal(dailyPrice[vehicle.category])
        .mul(new Prisma.Decimal("0.95"))
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const totalDays = 3;

      // Existing records remain untouched on subsequent runs, including their dates/status.
      return prisma.booking.upsert({
        where: { id },
        update: {},
        create: {
          id,
          userId: "seed-user-customer",
          vehicleId: "seed-vehicle-" + vehicle.slug,
          startDate,
          endDate,
          pickupLocation: vehicle.location,
          returnLocation: vehicle.location,
          totalDays,
          pricePerDay,
          totalAmount: pricePerDay.mul(totalDays),
          depositAmount: new Prisma.Decimal(
            vehicle.category === "PREMIUM" ? "800.00" :
            vehicle.category === "VAN" ? "600.00" : "300.00",
          ),
          currency: "GEL",
          status,
          idempotencyKey: null,
          requestHash: null,
        },
      });
    }

    const pendingStart = daysFromNow(7);
    const pendingBooking = await upsertExampleBooking({
      id: "seed-booking-corolla",
      vehicle: vehicles[0],
      startDate: pendingStart,
      endDate: new Date(pendingStart.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: BookingStatus.PENDING,
    });

    const confirmedStart = daysFromNow(9);
    await upsertExampleBooking({
      id: "seed-booking-rav4",
      vehicle: vehicles[6],
      startDate: confirmedStart,
      endDate: new Date(confirmedStart.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: BookingStatus.CONFIRMED,
    });

    // CANCELLED does not occupy the vehicle and intentionally overlaps PENDING.
    await upsertExampleBooking({
      id: "seed-booking-corolla-cancelled",
      vehicle: vehicles[0],
      startDate: pendingBooking.startDate,
      endDate: pendingBooking.endDate,
      status: BookingStatus.CANCELLED,
    });

    const completedStart = daysFromNow(-10);
    await upsertExampleBooking({
      id: "seed-booking-yaris-completed",
      vehicle: vehicles[3],
      startDate: completedStart,
      endDate: new Date(completedStart.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: BookingStatus.COMPLETED,
    });

    const rejectedStart = daysFromNow(14);
    await upsertExampleBooking({
      id: "seed-booking-golf-rejected",
      vehicle: vehicles[4],
      startDate: rejectedStart,
      endDate: new Date(rejectedStart.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: BookingStatus.REJECTED,
    });

    console.log("Seed complete: 3 users, 12 vehicles, 48 pricing rules, 5 bookings.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
