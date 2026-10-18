"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  registrationFormSchema,
  type RegistrationFormValues,
} from "@/components/auth/form-schemas";

export function RegisterForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: { name: "", email: "", phone: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          ...(values.phone ? { phone: values.phone } : {}),
        }),
      });

      if (response.ok) {
        router.replace("/login?registered=1");
        return;
      }

      if (response.status === 409) {
        setError("email", {
          message: "An account with this email already exists.",
        });
        return;
      }

      if (response.status === 429) {
        setSubmitError("Too many attempts. Try again later.");
        return;
      }

      setSubmitError("Registration is temporarily unavailable.");
    } catch {
      setSubmitError("Registration is temporarily unavailable.");
    }
  });

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <label htmlFor="register-name">Name</label>
      <Input
        id="register-name"
        autoComplete="name"
        aria-invalid={Boolean(errors.name)}
        {...register("name")}
      />
      {errors.name ? (
        <p className="field-error" role="alert">
          {errors.name.message}
        </p>
      ) : null}

      <label htmlFor="register-email">Email</label>
      <Input
        id="register-email"
        type="email"
        autoComplete="email"
        aria-invalid={Boolean(errors.email)}
        {...register("email")}
      />
      {errors.email ? (
        <p className="field-error" role="alert">
          {errors.email.message}
        </p>
      ) : null}

      <label htmlFor="register-phone">Phone (optional)</label>
      <Input
        id="register-phone"
        type="tel"
        autoComplete="tel"
        aria-invalid={Boolean(errors.phone)}
        {...register("phone")}
      />
      {errors.phone ? (
        <p className="field-error" role="alert">
          {errors.phone.message}
        </p>
      ) : null}

      <label htmlFor="register-password">Password</label>
      <Input
        id="register-password"
        type="password"
        autoComplete="new-password"
        aria-invalid={Boolean(errors.password)}
        {...register("password")}
      />
      {errors.password ? (
        <p className="field-error" role="alert">
          {errors.password.message}
        </p>
      ) : null}

      {submitError ? (
        <p className="form-error" role="alert">
          {submitError}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
