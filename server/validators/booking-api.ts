import { z } from "zod";

const emptyStringToUndefined = (value: unknown): unknown =>
  value === "" ? undefined : value;

const optionalPositiveInteger = (maximum: number) =>
  z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().min(1).max(maximum).optional(),
  );

export const bookingListQuerySchema = z
  .object({
    page: optionalPositiveInteger(100_000).default(1),
    pageSize: optionalPositiveInteger(50).default(20),
  })
  .strict();

export const bookingIdSchema = z.string().trim().min(1).max(128);
export const cancelBookingBodySchema = z.object({}).strict();

export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;
