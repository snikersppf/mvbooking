import { z } from "zod";

const MAX_PASSWORD_BYTES = 256;

export const registrationSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z
      .string()
      .trim()
      .max(254)
      .email()
      .transform((value) => value.toLowerCase()),
    phone: z.string().trim().min(7).max(32).optional(),
    password: z
      .string()
      .min(12)
      .max(128)
      .refine(
        (value) => Buffer.byteLength(value, "utf8") <= MAX_PASSWORD_BYTES,
        "Password is too long.",
      ),
  })
  .strict();

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const credentialsSchema = z
  .object({
    email: z
      .string()
      .trim()
      .max(254)
      .email()
      .transform((value) => value.toLowerCase()),
    password: z
      .string()
      .min(1)
      .max(128)
      .refine(
        (value) => Buffer.byteLength(value, "utf8") <= MAX_PASSWORD_BYTES,
        "Password is too long.",
      ),
  })
  .strict();
