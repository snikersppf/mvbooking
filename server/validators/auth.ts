import { z } from "zod";

const MAX_PASSWORD_BYTES = 256;

export const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= MAX_PASSWORD_BYTES,
    "Password is too long.",
  );

const emailSchema = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((value) => value.toLowerCase());

export const registrationSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: emailSchema,
    phone: z.string().trim().min(7).max(32).optional(),
    password: passwordSchema,
  })
  .strict();

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const credentialsSchema = z
  .object({
    email: emailSchema,
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

export const passwordResetRequestSchema = z.object({ email: emailSchema }).strict();

export const passwordResetConfirmSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Invalid reset token."),
  password: passwordSchema,
}).strict();
