import { getTranslations } from "@/lib/i18n/server";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const t = await getTranslations();
  return (
    <PageShell className="auth-shell">
      <Card as="section" className="auth-card" aria-labelledby="register-title">
        <div className="auth-heading">
          <p className="eyebrow">MVBooking</p>
          <h1 id="register-title">{t("Create account")}</h1>
          <p>{t("Registration always creates a customer account.")}</p>
        </div>

        <RegisterForm />

        <p className="auth-switch">
          {t("Already registered? ")}<Link href="/login">{t("Sign in")}</Link>
        </p>
      </Card>
    </PageShell>
  );
}
