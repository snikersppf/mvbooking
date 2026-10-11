"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  loginFormSchema,
  type LoginFormValues,
} from "@/components/auth/form-schemas";

type LoginFormProps = {
  callbackUrl: string;
  registrationComplete: boolean;
};

export function LoginForm({
  callbackUrl,
  registrationComplete,
}: LoginFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        redirectTo: callbackUrl,
      });

      if (!result.ok) {
        setSubmitError("Email or password is incorrect.");
        return;
      }

      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setSubmitError("Sign in is temporarily unavailable. Try again later.");
    }
  });

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      {registrationComplete ? (
        <p className="form-success" role="status">
          Account created. You can sign in now.
        </p>
      ) : null}

      <label htmlFor="login-email">Email</label>
      <input
        id="login-email"
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

      <label htmlFor="login-password">Password</label>
      <input
        id="login-password"
        type="password"
        autoComplete="current-password"
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

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
