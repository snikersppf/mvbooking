"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormValues,
} from "@/components/auth/form-schemas";

export function ResetPasswordForm({ token }: Readonly<{ token: string }>) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });
      if (response.ok) {
        setSuccess(true);
      } else if (response.status === 400) {
        setError("This reset link is invalid or has expired.");
      } else if (response.status === 429) {
        setError("Too many attempts. Try again later.");
      } else {
        setError("Password reset is temporarily unavailable.");
      }
    } catch {
      setError("Password reset is temporarily unavailable.");
    }
  });

  if (success) {
    return <p className="form-success" role="status">Password updated. <Link href="/login">Sign in</Link>.</p>;
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <label htmlFor="reset-password">New password</label>
      <Input
        id="reset-password"
        type="password"
        autoComplete="new-password"
        aria-invalid={Boolean(errors.password)}
        {...register("password")}
      />
      {errors.password ? <p className="field-error" role="alert">{errors.password.message}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Updating…" : "Set new password"}
      </Button>
    </form>
  );
}
