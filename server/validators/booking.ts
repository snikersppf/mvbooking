import { z } from "zod";

export const BOOKING_INPUT_LIMITS = Object.freeze({
  vehicleId: 128,
  location: 200,
  customerComment: 2_000,
});

const offsetDateTimeSchema = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));

export const createBookingInputSchema = z
  .object({
    vehicleId: z.string().trim().min(1).max(BOOKING_INPUT_LIMITS.vehicleId),
    startDate: offsetDateTimeSchema,
    endDate: offsetDateTimeSchema,
    pickupLocation: z
      .string()
      .trim()
      .min(1)
      .max(BOOKING_INPUT_LIMITS.location),
    returnLocation: z
      .string()
      .trim()
      .min(1)
      .max(BOOKING_INPUT_LIMITS.location),
    customerComment: z
      .string()
      .trim()
      .max(BOOKING_INPUT_LIMITS.customerComment)
      .optional(),
  })
  .strict();

export type CreateBookingInput = z.infer<typeof createBookingInputSchema>;
