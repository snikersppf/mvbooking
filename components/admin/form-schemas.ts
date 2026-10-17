import { z } from "zod";
import {
  ADMIN_BOOKING_STATUSES,
  ADMIN_DRIVES,
  ADMIN_EDITABLE_VEHICLE_STATUSES,
  ADMIN_FUELS,
  ADMIN_INPUT_LIMITS,
  ADMIN_TRANSMISSIONS,
  ADMIN_USER_ROLES,
  ADMIN_USER_STATUSES,
  ADMIN_VEHICLE_CATEGORIES,
} from "@/lib/admin-input";
import type { AdminVehicleDto } from "@/server/services/admin/dto";

const CURRENT_YEAR = new Date().getUTCFullYear();
const INTEGER_PATTERN = /^\d+$/;
const MONEY_PATTERN = /^\d{1,10}(?:\.\d{1,4})?$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function integerText(
  minimum: number,
  maximum: number,
  label: string,
) {
  return z
    .string()
    .trim()
    .regex(INTEGER_PATTERN, `${label} must be a whole number.`)
    .refine(
      (value) => {
        const number = Number(value);
        return number >= minimum && number <= maximum;
      },
      `${label} must be between ${minimum} and ${maximum}.`,
    );
}

const moneyText = (allowZero: boolean) =>
  z
    .string()
    .trim()
    .regex(MONEY_PATTERN, "Enter a valid amount with up to four decimals.")
    .refine((value) => allowZero || Number(value) > 0, {
      message: "Amount must be greater than zero.",
    });

const imageUrl = z
  .string()
  .trim()
  .min(1, "Enter an image URL.")
  .max(ADMIN_INPUT_LIMITS.imageUrl)
  .refine((value) => {
    if (value.startsWith("/")) return !value.startsWith("//");
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Use an HTTP(S) URL or a local path beginning with /.");

export const adminVehicleFormSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, "Enter a slug.")
      .max(ADMIN_INPUT_LIMITS.slug)
      .regex(SLUG_PATTERN, "Use lowercase letters, numbers, and hyphens."),
    brand: z
      .string()
      .trim()
      .min(1, "Enter a brand.")
      .max(ADMIN_INPUT_LIMITS.vehicleText),
    model: z
      .string()
      .trim()
      .min(1, "Enter a model.")
      .max(ADMIN_INPUT_LIMITS.vehicleText),
    year: integerText(1980, CURRENT_YEAR + 1, "Year"),
    category: z.enum(ADMIN_VEHICLE_CATEGORIES),
    description: z.string().trim().max(ADMIN_INPUT_LIMITS.description),
    seats: integerText(1, 20, "Seats"),
    transmission: z.enum(ADMIN_TRANSMISSIONS),
    fuel: z.enum(ADMIN_FUELS),
    drive: z.enum(ADMIN_DRIVES),
    engine: z.string().trim().max(ADMIN_INPUT_LIMITS.vehicleText),
    depositAmount: moneyText(true),
    insuranceIncluded: z.boolean(),
    status: z.enum(ADMIN_EDITABLE_VEHICLE_STATUSES),
    location: z
      .string()
      .trim()
      .min(1, "Enter a location.")
      .max(ADMIN_INPUT_LIMITS.location),
  })
  .strict();

export type AdminVehicleFormValues = z.infer<
  typeof adminVehicleFormSchema
>;

export function emptyAdminVehicleFormValues(): AdminVehicleFormValues {
  return {
    slug: "",
    brand: "",
    model: "",
    year: String(CURRENT_YEAR),
    category: "ECONOMY",
    description: "",
    seats: "5",
    transmission: "AUTOMATIC",
    fuel: "PETROL",
    drive: "FWD",
    engine: "",
    depositAmount: "0.00",
    insuranceIncluded: false,
    status: "AVAILABLE",
    location: "Tbilisi",
  };
}

export function adminVehicleDtoToFormValues(
  vehicle: AdminVehicleDto,
): AdminVehicleFormValues {
  return {
    slug: vehicle.slug,
    brand: vehicle.brand,
    model: vehicle.model,
    year: String(vehicle.year),
    category: vehicle.category as AdminVehicleFormValues["category"],
    description: vehicle.description ?? "",
    seats: String(vehicle.seats),
    transmission:
      vehicle.transmission as AdminVehicleFormValues["transmission"],
    fuel: vehicle.fuel as AdminVehicleFormValues["fuel"],
    drive: vehicle.drive as AdminVehicleFormValues["drive"],
    engine: vehicle.engine ?? "",
    depositAmount: vehicle.depositAmount,
    insuranceIncluded: vehicle.insuranceIncluded,
    status: vehicle.status as AdminVehicleFormValues["status"],
    location: vehicle.location,
  };
}

function vehiclePayload(values: AdminVehicleFormValues) {
  const parsed = adminVehicleFormSchema.parse(values);
  return {
    slug: parsed.slug,
    brand: parsed.brand,
    model: parsed.model,
    year: Number(parsed.year),
    category: parsed.category,
    description: parsed.description || null,
    seats: Number(parsed.seats),
    transmission: parsed.transmission,
    fuel: parsed.fuel,
    drive: parsed.drive,
    engine: parsed.engine || null,
    depositAmount: parsed.depositAmount,
    insuranceIncluded: parsed.insuranceIncluded,
    status: parsed.status,
    location: parsed.location,
  };
}

export function toAdminVehicleCreatePayload(values: AdminVehicleFormValues) {
  return { ...vehiclePayload(values), currency: "GEL" as const };
}

export function toAdminVehiclePatchPayload(values: AdminVehicleFormValues) {
  return vehiclePayload(values);
}

const pricingRuleFormSchema = z
  .object({
    minDays: integerText(1, 365, "Minimum days"),
    maxDays: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || INTEGER_PATTERN.test(value),
        "Maximum days must be a whole number or empty.",
      )
      .refine(
        (value) => value === "" || Number(value) <= 365,
        "Maximum days cannot exceed 365.",
      ),
    pricePerDay: moneyText(false),
  })
  .strict();

export const adminPricingFormSchema = z
  .object({
    rules: z
      .array(pricingRuleFormSchema)
      .min(1, "Add at least one pricing tier.")
      .max(ADMIN_INPUT_LIMITS.pricingRules),
  })
  .strict()
  .superRefine(({ rules }, context) => {
    const ordered = rules
      .map((rule, index) => ({ rule, index }))
      .sort((left, right) =>
        Number(left.rule.minDays) - Number(right.rule.minDays),
      );

    if (Number(ordered[0]?.rule.minDays) !== 1) {
      context.addIssue({
        code: "custom",
        path: ["rules", ordered[0]?.index ?? 0, "minDays"],
        message: "Pricing must start at day 1.",
      });
    }

    for (let index = 0; index < ordered.length; index += 1) {
      const entry = ordered[index];
      const next = ordered[index + 1];
      const maximum = entry.rule.maxDays;
      const isLast = index === ordered.length - 1;

      if (isLast && maximum !== "") {
        context.addIssue({
          code: "custom",
          path: ["rules", entry.index, "maxDays"],
          message: "Leave the final maximum empty.",
        });
      }
      if (!isLast && maximum === "") {
        context.addIssue({
          code: "custom",
          path: ["rules", entry.index, "maxDays"],
          message: "Only the final tier may have no maximum.",
        });
        continue;
      }
      if (
        maximum !== "" &&
        Number(maximum) < Number(entry.rule.minDays)
      ) {
        context.addIssue({
          code: "custom",
          path: ["rules", entry.index, "maxDays"],
          message: "Maximum days cannot be less than minimum days.",
        });
      }
      if (
        next &&
        maximum !== "" &&
        Number(next.rule.minDays) !== Number(maximum) + 1
      ) {
        context.addIssue({
          code: "custom",
          path: ["rules", next.index, "minDays"],
          message: "Pricing tiers must be contiguous.",
        });
      }
    }
  });

export type AdminPricingFormValues = z.infer<
  typeof adminPricingFormSchema
>;

export function adminPricingDtoToFormValues(
  rules: AdminVehicleDto["pricingRules"],
): AdminPricingFormValues {
  return {
    rules:
      rules.length > 0
        ? rules.map((rule) => ({
            minDays: String(rule.minDays),
            maxDays: rule.maxDays === null ? "" : String(rule.maxDays),
            pricePerDay: rule.pricePerDay,
          }))
        : [{ minDays: "1", maxDays: "", pricePerDay: "" }],
  };
}

export function toAdminPricingPayload(values: AdminPricingFormValues) {
  const parsed = adminPricingFormSchema.parse(values);
  return {
    rules: parsed.rules
      .map((rule) => ({
        minDays: Number(rule.minDays),
        maxDays: rule.maxDays === "" ? null : Number(rule.maxDays),
        pricePerDay: rule.pricePerDay,
        currency: "GEL" as const,
      }))
      .sort((left, right) => left.minDays - right.minDays),
  };
}

const imageFormSchema = z
  .object({
    url: imageUrl,
    alt: z.string().trim().max(ADMIN_INPUT_LIMITS.imageAlt),
    sortOrder: integerText(0, 10_000, "Sort order"),
  })
  .strict();

export const adminImagesFormSchema = z
  .object({
    images: z.array(imageFormSchema).max(ADMIN_INPUT_LIMITS.images),
  })
  .strict();

export type AdminImagesFormValues = z.infer<
  typeof adminImagesFormSchema
>;

export function adminImagesDtoToFormValues(
  images: AdminVehicleDto["images"],
): AdminImagesFormValues {
  return {
    images: images.map((image) => ({
      url: image.url,
      alt: image.alt ?? "",
      sortOrder: String(image.sortOrder),
    })),
  };
}

export function toAdminImagesPayload(values: AdminImagesFormValues) {
  const parsed = adminImagesFormSchema.parse(values);
  return {
    images: parsed.images.map((image) => ({
      url: image.url,
      alt: image.alt || null,
      sortOrder: Number(image.sortOrder),
    })),
  };
}

export const adminBookingStatusFormSchema = z
  .object({
    status: z.enum(ADMIN_BOOKING_STATUSES),
    managerComment: z.string().trim().max(ADMIN_INPUT_LIMITS.managerComment),
  })
  .strict();

export function createAdminBookingStatusFormSchema(
  allowedStatuses: readonly string[],
) {
  return adminBookingStatusFormSchema.refine(
    ({ status }) => allowedStatuses.includes(status),
    {
      path: ["status"],
      message: "Choose an available status transition.",
    },
  );
}

export type AdminBookingStatusFormValues = z.infer<
  typeof adminBookingStatusFormSchema
>;

export function toAdminBookingStatusPayload(
  values: AdminBookingStatusFormValues,
  allowedStatuses: readonly string[],
) {
  const parsed = adminBookingStatusFormSchema.parse(values);
  if (!allowedStatuses.includes(parsed.status)) {
    throw new Error("The selected booking transition is not available.");
  }
  return {
    status: parsed.status,
    managerComment: parsed.managerComment || null,
  };
}

export const adminUserRoleFormSchema = z
  .object({ role: z.enum(ADMIN_USER_ROLES) })
  .strict();
export const adminUserStatusFormSchema = z
  .object({ status: z.enum(ADMIN_USER_STATUSES) })
  .strict();

export type AdminUserRoleFormValues = z.infer<
  typeof adminUserRoleFormSchema
>;
export type AdminUserStatusFormValues = z.infer<
  typeof adminUserStatusFormSchema
>;
