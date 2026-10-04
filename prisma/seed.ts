import { PrismaClient, UserRole, VehicleStatus } from "@prisma/client";

const prisma = new PrismaClient();

const vehicleCatalog = [
  ["Toyota", "Corolla", "economy-toyota-corolla", "ECONOMY", 2022, 5, "AUTOMATIC", "PETROL", "FWD", "Tbilisi"],
  ["Hyundai", "Elantra", "economy-hyundai-elantra", "ECONOMY", 2023, 5, "AUTOMATIC", "PETROL", "FWD", "Tbilisi"],
  ["Kia", "Rio", "economy-kia-rio", "ECONOMY", 2021, 5, "AUTOMATIC", "PETROL", "FWD", "Batumi"],
  ["Toyota", "Yaris", "compact-toyota-yaris", "COMPACT", 2022, 5, "AUTOMATIC", "HYBRID", "FWD", "Tbilisi"],
  ["Volkswagen", "Golf", "compact-volkswagen-golf", "COMPACT", 2021, 5, "AUTOMATIC", "PETROL", "FWD", "Kutaisi"],
  ["Honda", "Civic", "compact-honda-civic", "COMPACT", 2023, 5, "AUTOMATIC", "PETROL", "FWD", "Batumi"],
  ["Toyota", "RAV4", "suv-toyota-rav4", "SUV", 2023, 5, "AUTOMATIC", "HYBRID", "AWD", "Tbilisi"],
  ["Hyundai", "Tucson", "suv-hyundai-tucson", "SUV", 2022, 5, "AUTOMATIC", "PETROL", "AWD", "Tbilisi"],
  ["Kia", "Sportage", "suv-kia-sportage", "SUV", 2024, 5, "AUTOMATIC", "PETROL", "AWD", "Batumi"],
  ["Ford", "Transit", "van-ford-transit", "VAN", 2020, 9, "MANUAL", "DIESEL", "RWD", "Tbilisi"],
  ["Mercedes-Benz", "Vito", "van-mercedes-vito", "VAN", 2021, 8, "AUTOMATIC", "DIESEL", "RWD", "Kutaisi"],
  ["Toyota", "Land Cruiser", "premium-toyota-land-cruiser", "PREMIUM", 2023, 7, "AUTOMATIC", "PETROL", "4WD", "Tbilisi"],
] as const;

async function main() {
  const users = [
    { email: "admin@example.com", name: "Test Admin", role: UserRole.ADMIN },
    { email: "manager@example.com", name: "Test Manager", role: UserRole.MANAGER },
    { email: "customer@example.com", name: "Test Customer", role: UserRole.CUSTOMER },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role },
      create: { ...user, passwordHash: null },
    });
  }

  for (const [brand, model, slug, category, year, seats, transmission, fuel, drive, location] of vehicleCatalog) {
    const vehicle = await prisma.vehicle.upsert({
      where: { slug },
      update: { brand, model, category, year, seats, transmission, fuel, drive, location, status: VehicleStatus.AVAILABLE },
      create: {
        slug,
        brand,
        model,
        category,
        year,
        seats,
        transmission,
        fuel,
        drive,
        location,
        description: `${brand} ${model} for rental in Georgia.`,
        engine: fuel === "HYBRID" ? "1.8L hybrid" : "2.0L",
        depositAmount: category === "PREMIUM" ? 800 : category === "VAN" ? 600 : 300,
        insuranceIncluded: category !== "PREMIUM",
        status: VehicleStatus.AVAILABLE,
      },
    });

    const priceByCategory: Record<string, number> = {
      ECONOMY: 90,
      COMPACT: 120,
      SUV: 180,
      VAN: 220,
      PREMIUM: 350,
    };
    const basePrice = priceByCategory[category];

    for (const rule of [
      { minDays: 1, maxDays: 2, multiplier: 1 },
      { minDays: 3, maxDays: 6, multiplier: 0.95 },
      { minDays: 7, maxDays: 14, multiplier: 0.9 },
      { minDays: 15, maxDays: null, multiplier: 0.85 },
    ]) {
      const existingRule = await prisma.pricingRule.findFirst({
        where: { vehicleId: vehicle.id, minDays: rule.minDays, maxDays: rule.maxDays },
      });
      const ruleData = {
        vehicleId: vehicle.id,
        minDays: rule.minDays,
        maxDays: rule.maxDays,
        pricePerDay: basePrice * rule.multiplier,
        currency: "GEL",
      };

      if (existingRule) {
        await prisma.pricingRule.update({ where: { id: existingRule.id }, data: ruleData });
      } else {
        await prisma.pricingRule.create({ data: ruleData });
      }
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
