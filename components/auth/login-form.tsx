"use client";
import { useTranslations } from "@/components/i18n/language-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const t = useTranslations();
  const router = useRouter();
  const [otp, setOtp] = useState("");
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
        otp,
        redirect: false,
        redirectTo: callbackUrl,
      });

      if (!result.ok) {
        setSubmitError("Email, password or security code is incorrect.");
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
          {t("Account created. You can sign in now.")}</p>
      ) : null}

      <label htmlFor="login-email">{t("Email")}</label>
      <Input
        id="login-email"
        type="email"
        autoComplete="email"
        aria-invalid={Boolean(errors.email)}
        {...register("email")}
      />
      {errors.email ? (
        <p className="field-error" role="alert">
          {t.error(errors.email.message)}
        </p>
      ) : null}

      <label htmlFor="login-password">{t("Password")}</label>
      <Input
        id="login-password"
        type="password"
        autoComplete="current-password"
        aria-invalid={Boolean(errors.password)}
        {...register("password")}
      />
      {errors.password ? (
        <p className="field-error" role="alert">
          {t.error(errors.password.message)}
        </p>
      ) : null}

      <label htmlFor="login-otp">{t("Authenticator or backup code")}</label>
      <Input id="login-otp" name="otp" autoComplete="one-time-code" maxLength={32} value={otp} onChange={(event) => setOtp(event.target.value.trim())} />
      {submitError ? (
        <p className="form-error" role="alert">
          {t.error(submitError)}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("Signing in…") : t("Sign in")}
      </Button>
    </form>
  );
}
