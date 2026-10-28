import { getTranslations } from "@/lib/i18n/server";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { normalizeCallbackPath } from "@/lib/auth/redirect";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    registered?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const t = await getTranslations();
  const params = await searchParams;
  const callbackUrl = normalizeCallbackPath(firstValue(params.callbackUrl));
  const registrationComplete = firstValue(params.registered) === "1";

  return (
    <PageShell className="auth-shell">
      <Card as="section" className="auth-card" aria-labelledby="login-title">
        <div className="auth-heading">
          <p className="eyebrow">MVBooking</p>
          <h1 id="login-title">{t("Sign in")}</h1>
          <p>{t("Staff accounts only. Visitors can send an enquiry without an account.")}</p>
        </div>

        <LoginForm
          callbackUrl={callbackUrl}
          registrationComplete={registrationComplete}
        />

        <p className="auth-switch">
          <Link href="/forgot-password">{t("Forgot your password?")}</Link>
        </p>


      </Card>
    </PageShell>
  );
}
