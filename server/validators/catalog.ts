import { z } from "zod";

export const CATALOG_QUERY_LIMITS = Object.freeze({
  filter: 80,
  vehicleId: 128,
  slug: 160,
  maxSeats: 100,
  maxPage: 100_000,
  maxPageSize: 50,
});

export const CATALOG_SORT_VALUES = [
  "price_asc",
  "price_desc",
  "year_asc",
  "year_desc",
  "brand_asc",
  "brand_desc",
] as const;

const emptyStringToUndefined = (value: unknown): unknown =>
  value === "" ? undefined : value;

const optionalFilterSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).max(CATALOG_QUERY_LIMITS.filter).optional(),
);

const optionalMoneySchema = z.preprocess(
  emptyStringToUndefined,
  z.coerce.number().finite().nonnegative().optional(),
);

const optionalPositiveIntegerSchema = (maximum: number) =>
  z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().min(1).max(maximum).optional(),
  );

const offsetDateTimeSchema = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));

const optionalOffsetDateTimeSchema = z.preprocess(
  emptyStringToUndefined,
  offsetDateTimeSchema.optional(),
);

const catalogFilterShape = {
  category: optionalFilterSchema,
  minPrice: optionalMoneySchema,
  maxPrice: optionalMoneySchema,
  seats: optionalPositiveIntegerSchema(CATALOG_QUERY_LIMITS.maxSeats),
  transmission: optionalFilterSchema,
  fuel: optionalFilterSchema,
  drive: optionalFilterSchema,
  sort: z.enum(CATALOG_SORT_VALUES).default("price_asc"),
  page: optionalPositiveIntegerSchema(CATALOG_QUERY_LIMITS.maxPage).default(1),
  pageSize: optionalPositiveIntegerSchema(
    CATALOG_QUERY_LIMITS.maxPageSize,
  ).default(12),
};

function validatePriceRange(
  value: { minPrice?: number; maxPrice?: number },
  context: z.RefinementCtx,
): void {
  if (
    value.minPrice !== undefined &&
    value.maxPrice !== undefined &&
    value.minPrice > value.maxPrice
  ) {
    context.addIssue({
      code: "custom",
      path: ["maxPrice"],
      message: "Maximum price must be greater than or equal to minimum price.",
    });
  }
}

function validateOptionalDatePair(
  value: { startDate?: Date; endDate?: Date },
  context: z.RefinementCtx,
): void {
  if ((value.startDate === undefined) !== (value.endDate === undefined)) {
    context.addIssue({
      code: "custom",
      path: value.startDate === undefined ? ["startDate"] : ["endDate"],
      message: "Start and end dates must be provided together.",
    });
  }
}

export const catalogQuerySchema = z
  .object({
    ...catalogFilterShape,
    startDate: optionalOffsetDateTimeSchema,
    endDate: optionalOffsetDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    validatePriceRange(value, context);
    validateOptionalDatePair(value, context);
  });

export const availableVehicleListQuerySchema = z
  .object({
    ...catalogFilterShape,
    startDate: offsetDateTimeSchema,
    endDate: offsetDateTimeSchema,
  })
  .strict()
  .superRefine(validatePriceRange);

const availabilityPeriodShape = {
  startDate: offsetDateTimeSchema,
  endDate: offsetDateTimeSchema,
};

export const availabilityPeriodQuerySchema = z
  .object(availabilityPeriodShape)
  .strict();

export const vehicleAvailabilityQuerySchema = z
  .object({
    vehicleId: z
      .string()
      .trim()
      .min(1)
      .max(CATALOG_QUERY_LIMITS.vehicleId),
    ...availabilityPeriodShape,
  })
  .strict();

export const vehicleSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(CATALOG_QUERY_LIMITS.slug);

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type AvailableVehicleListQuery = z.infer<
  typeof availableVehicleListQuerySchema
>;
export type VehicleAvailabilityQuery = z.infer<
  typeof vehicleAvailabilityQuerySchema
>;
