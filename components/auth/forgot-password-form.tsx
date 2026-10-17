"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormValues,
} from "@/components/auth/form-schemas";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (response.ok) {
        setMessage("If this account exists, reset instructions have been sent.");
      } else if (response.status === 429) {
        setError("Too many attempts. Try again later.");
      } else {
        setError("Password reset is temporarily unavailable.");
      }
    } catch {
      setError("Password reset is temporarily unavailable.");
    }
  });

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <label htmlFor="forgot-email">Email</label>
      <input
        id="forgot-email"
        type="email"
        autoComplete="email"
        aria-invalid={Boolean(errors.email)}
        {...register("email")}
      />
      {errors.email ? <p className="field-error" role="alert">{errors.email.message}</p> : null}
      {message ? <p className="form-success" role="status">{message}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Request reset"}
      </button>
    </form>
  );
}
