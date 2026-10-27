import { z } from "zod";

export const CONTACT_CONSENT_VERSION = "contact-2026-10-28";
const optionalText = (max: number) => z.string().trim().max(max).transform((v) => v || undefined).optional();
export const createLeadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().max(254).email().toLowerCase().optional().or(z.literal("").transform(() => undefined)),
  phone: optionalText(32).refine((v) => !v || /^[+0-9 ()-]{7,32}$/.test(v), "Enter a valid phone number."),
  vehicleId: z.string().min(1).max(128).optional(),
  startDate: z.iso.datetime({ offset: true }).optional(),
  endDate: z.iso.datetime({ offset: true }).optional(),
  comment: z.string().trim().max(2000).default(""),
  consent: z.literal(true),
  website: z.string().max(200).default(""),
}).strict().refine((v) => Boolean(v.email || v.phone), { message: "Enter an email or phone number.", path: ["phone"] })
  .refine((v) => !v.startDate || !v.endDate || new Date(v.endDate) > new Date(v.startDate), { message: "Return date must follow pickup date.", path: ["endDate"] });
