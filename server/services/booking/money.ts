import { Prisma } from "@prisma/client";
import { BookingRuleError } from "@/server/services/booking/errors";

export type BookingMoney = Readonly<{
  pricePerDay: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  depositAmount: Prisma.Decimal;
  totalDue: Prisma.Decimal;
}>;

type CalculateBookingMoneyInput = Readonly<{
  pricePerDay: Prisma.Decimal;
  totalDays: number;
  depositAmount: Prisma.Decimal;
}>;

const MONEY_SCALE = 2;
const MONEY_ROUNDING = Prisma.Decimal.ROUND_HALF_UP;

function roundMoney(value: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(MONEY_SCALE, MONEY_ROUNDING);
}

export function satisfiesBookingTotalAmountCheck(
  money: Pick<BookingMoney, "pricePerDay" | "totalAmount"> & {
    totalDays: number;
  },
): boolean {
  return money.totalAmount.equals(money.pricePerDay.mul(money.totalDays));
}

export function calculateBookingMoney(
  input: CalculateBookingMoneyInput,
): BookingMoney {
  if (!Number.isInteger(input.totalDays) || input.totalDays < 1) {
    throw new BookingRuleError(
      "INVALID_BOOKING_AMOUNT",
      "Booking money requires a positive whole number of days.",
    );
  }

  const pricePerDay = roundMoney(input.pricePerDay);
  const depositAmount = roundMoney(input.depositAmount);

  if (!pricePerDay.isFinite() || pricePerDay.lessThanOrEqualTo(0)) {
    throw new BookingRuleError(
      "INVALID_BOOKING_AMOUNT",
      "Price per day must be positive.",
    );
  }

  if (!depositAmount.isFinite() || depositAmount.lessThan(0)) {
    throw new BookingRuleError(
      "INVALID_BOOKING_AMOUNT",
      "Deposit amount must not be negative.",
    );
  }

  const totalAmount = pricePerDay
    .mul(input.totalDays)
    .toDecimalPlaces(MONEY_SCALE, MONEY_ROUNDING);
  const totalDue = totalAmount
    .plus(depositAmount)
    .toDecimalPlaces(MONEY_SCALE, MONEY_ROUNDING);
  const result = { pricePerDay, totalAmount, depositAmount, totalDue };

  if (
    !satisfiesBookingTotalAmountCheck({
      ...result,
      totalDays: input.totalDays,
    })
  ) {
    throw new BookingRuleError(
      "INVALID_BOOKING_AMOUNT",
      "Booking total amount does not match price per day multiplied by days.",
    );
  }

  return result;
}
