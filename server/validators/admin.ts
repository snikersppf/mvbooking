import {
  BookingStatus,
  PaymentStatus,
  UserRole,
  UserStatus,
  VehicleStatus,
} from "@prisma/client";
import { z } from "zod";
import { isVehicleImageUrl } from "@/lib/vehicle-image-url";
import {
  ADMIN_DRIVES,
  ADMIN_FUELS,
  ADMIN_PAGE_SIZE_MAX,
  ADMIN_TRANSMISSIONS,
  ADMIN_VEHICLE_CATEGORIES,
} from "@/lib/admin-input";

export {
  ADMIN_DRIVES,
  ADMIN_FUELS,
  ADMIN_PAGE_SIZE_MAX,
  ADMIN_TRANSMISSIONS,
  ADMIN_VEHICLE_CATEGORIES,
} from "@/lib/admin-input";

const currentYear = new Date().getUTCFullYear();
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MONEY_PATTERN = /^\d{1,10}(?:\.\d{1,4})?$/;

const emptyStringToUndefined = (value: unknown): unknown =>
  value === "" ? undefined : value;

const optionalPositiveInteger = (maximum: number) =>
  z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().min(1).max(maximum).optional(),
  );

const pageShape = {
  page: optionalPositiveInteger(100_000).default(1),
  pageSize: optionalPositiveInteger(ADMIN_PAGE_SIZE_MAX).default(20),
};

const requiredText = (maximum: number) =>
  z.string().trim().min(1).max(maximum);

const moneyInput = (allowZero: boolean) =>
  z
    .union([
      z.string().trim().regex(MONEY_PATTERN),
      z.number().finite().nonnegative().max(9_999_999_999.9999),
    ])
    .transform((value) => String(value))
    .refine((value) => allowZero || Number(value) > 0, {
      message: "Amount must be greater than zero.",
    });

const adminVehicleStatusSchema = z.enum([
  VehicleStatus.AVAILABLE,
  VehicleStatus.UNAVAILABLE,
  VehicleStatus.MAINTENANCE,
]);

const vehicleFields = {
  slug: z.string().trim().min(1).max(120).regex(SLUG_PATTERN),
  brand: requiredText(120),
  model: requiredText(120),
  year: z.number().int().min(1980).max(currentYear + 1),
  category: z.enum(ADMIN_VEHICLE_CATEGORIES),
  description: z.string().trim().max(5_000).nullable(),
  seats: z.number().int().min(1).max(20),
  transmission: z.enum(ADMIN_TRANSMISSIONS),
  fuel: z.enum(ADMIN_FUELS),
  drive: z.enum(ADMIN_DRIVES),
  engine: z.string().trim().max(120).nullable(),
  depositAmount: moneyInput(true),
  currency: z.literal("GEL"),
  insuranceIncluded: z.boolean(),
  status: adminVehicleStatusSchema,
  location: requiredText(160),
};

export const adminVehicleCreateSchema = z
  .object({
    ...vehicleFields,
    description: vehicleFields.description.optional().default(null),
    engine: vehicleFields.engine.optional().default(null),
    currency: vehicleFields.currency.optional().default("GEL"),
    insuranceIncluded:
      vehicleFields.insuranceIncluded.optional().default(false),
    status: vehicleFields.status.optional().default(VehicleStatus.AVAILABLE),
  })
  .strict();

export const adminVehiclePatchSchema = z
  .object({
    slug: vehicleFields.slug.optional(),
    brand: vehicleFields.brand.optional(),
    model: vehicleFields.model.optional(),
    year: vehicleFields.year.optional(),
    category: vehicleFields.category.optional(),
    description: vehicleFields.description.optional(),
    seats: vehicleFields.seats.optional(),
    transmission: vehicleFields.transmission.optional(),
    fuel: vehicleFields.fuel.optional(),
    drive: vehicleFields.drive.optional(),
    engine: vehicleFields.engine.optional(),
    depositAmount: vehicleFields.depositAmount.optional(),
    insuranceIncluded: vehicleFields.insuranceIncluded.optional(),
    status: vehicleFields.status.optional(),
    location: vehicleFields.location.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const adminVehicleListQuerySchema = z
  .object({
    ...pageShape,
    status: z.preprocess(
      emptyStringToUndefined,
      z.enum(VehicleStatus).optional(),
    ),
    category: z.preprocess(
      emptyStringToUndefined,
      z.enum(ADMIN_VEHICLE_CATEGORIES).optional(),
    ),
  })
  .strict();

const pricingRuleSchema = z
  .object({
    minDays: z.number().int().min(1).max(365),
    maxDays: z.number().int().min(1).max(365).nullable(),
    pricePerDay: moneyInput(false),
    currency: z.literal("GEL").optional().default("GEL"),
  })
  .strict();

export const adminPricingReplaceSchema = z
  .object({ rules: z.array(pricingRuleSchema).min(1).max(20) })
  .strict()
  .superRefine(({ rules }, context) => {
    const ordered = [...rules].sort((left, right) => left.minDays - right.minDays);

    if (ordered[0]?.minDays !== 1) {
      context.addIssue({
        code: "custom",
        path: ["rules", 0, "minDays"],
        message: "Pricing must start at day 1.",
      });
    }

    for (let index = 0; index < ordered.length; index += 1) {
      const rule = ordered[index];
      const isLast = index === ordered.length - 1;
      if (isLast && rule.maxDays !== null) {
        context.addIssue({
          code: "custom",
          path: ["rules", index, "maxDays"],
          message: "The final pricing tier must have an open upper bound.",
        });
      }
      if (!isLast && rule.maxDays === null) {
        context.addIssue({
          code: "custom",
          path: ["rules", index, "maxDays"],
          message: "Only the final pricing tier may be open-ended.",
        });
        continue;
      }
      if (rule.maxDays !== null && rule.maxDays < rule.minDays) {
        context.addIssue({
          code: "custom",
          path: ["rules", index, "maxDays"],
          message: "Maximum days must not be less than minimum days.",
        });
      }

      const next = ordered[index + 1];
      if (next && rule.maxDays !== null && next.minDays !== rule.maxDays + 1) {
        context.addIssue({
          code: "custom",
          path: ["rules", index + 1, "minDays"],
          message: "Pricing tiers must be contiguous.",
        });
      }
    }
  });

const imageUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2_048)
  .refine(isVehicleImageUrl, "Image URL must be an absolute HTTP(S) URL or a local path without credentials or backslashes.");

export const adminImagesReplaceSchema = z
  .object({
    images: z
      .array(
        z
          .object({
            url: imageUrlSchema,
            alt: z.string().trim().max(300).nullable().optional().default(null),
            sortOrder: z.number().int().min(0).max(10_000),
          })
          .strict(),
      )
      .max(30),
  })
  .strict();

export const adminBookingListQuerySchema = z
  .object({
    ...pageShape,
    status: z.preprocess(
      emptyStringToUndefined,
      z.enum(BookingStatus).optional(),
    ),
    paymentStatus: z.preprocess(
      emptyStringToUndefined,
      z.enum(PaymentStatus).optional(),
    ),
    userId: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(128).optional(),
    ),
    vehicleId: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(128).optional(),
    ),
  })
  .strict();

export const adminBookingStatusSchema = z
  .object({
    status: z.enum(BookingStatus),
    managerComment: z.string().trim().max(2_000).nullable().optional(),
  })
  .strict();

export const adminUserListQuerySchema = z
  .object({
    ...pageShape,
    role: z.preprocess(
      emptyStringToUndefined,
      z.enum(UserRole).optional(),
    ),
    status: z.preprocess(
      emptyStringToUndefined,
      z.enum(UserStatus).optional(),
    ),
  })
  .strict();

export const adminUserRoleSchema = z
  .object({ role: z.enum(UserRole) })
  .strict();

export const adminUserStatusSchema = z
  .object({ status: z.enum(UserStatus) })
  .strict();

export const adminAuditLogListQuerySchema = z
  .object({
    ...pageShape,
    userId: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(128).optional(),
    ),
    action: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(120).optional(),
    ),
    entity: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(120).optional(),
    ),
  })
  .strict();

export const adminEntityIdSchema = z.string().trim().min(1).max(128);

export type AdminVehicleCreateInput = z.infer<
  typeof adminVehicleCreateSchema
>;
export type AdminVehiclePatchInput = z.infer<typeof adminVehiclePatchSchema>;
export type AdminPricingReplaceInput = z.infer<
  typeof adminPricingReplaceSchema
>;
export type AdminImagesReplaceInput = z.infer<
  typeof adminImagesReplaceSchema
>;
