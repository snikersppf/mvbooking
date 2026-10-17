import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.string().trim().max(254).email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.").max(128),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const forgotPasswordFormSchema = z.object({
  email: z.string().trim().max(254).email("Enter a valid email address."),
}).strict();

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

export const resetPasswordFormSchema = z.object({
  password: z.string()
    .min(12, "Use at least 12 characters.")
    .max(128, "Use no more than 128 characters.")
    .refine(
      (value) => new TextEncoder().encode(value).length <= 256,
      "Password is too long.",
    ),
}).strict();

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

export const registrationFormSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters.").max(100),
  email: z.string().trim().max(254).email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .max(32)
    .refine(
      (value) => value.length === 0 || value.length >= 7,
      "Enter at least 7 characters or leave this field empty.",
    ),
  password: z
    .string()
    .min(12, "Use at least 12 characters.")
    .max(128, "Use no more than 128 characters."),
});

export type RegistrationFormValues = z.infer<
  typeof registrationFormSchema
>;
