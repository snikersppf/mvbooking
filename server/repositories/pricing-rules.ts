import { Prisma, type PricingRule } from "@prisma/client";

export type BookingPricingRule = Pick<
  PricingRule,
  "id" | "vehicleId" | "minDays" | "maxDays" | "pricePerDay" | "currency"
>;

export interface PricingRuleRepository {
  findByVehicleId(
    transaction: Prisma.TransactionClient,
    vehicleId: string,
  ): Promise<BookingPricingRule[]>;
}

export class PrismaPricingRuleRepository implements PricingRuleRepository {
  async findByVehicleId(
    transaction: Prisma.TransactionClient,
    vehicleId: string,
  ): Promise<BookingPricingRule[]> {
    return transaction.pricingRule.findMany({
      where: { vehicleId },
      orderBy: { minDays: "asc" },
      select: {
        id: true,
        vehicleId: true,
        minDays: true,
        maxDays: true,
        pricePerDay: true,
        currency: true,
      },
    });
  }
}

export const pricingRuleRepository: PricingRuleRepository =
  new PrismaPricingRuleRepository();
