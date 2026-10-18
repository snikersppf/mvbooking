import { getTranslations } from "@/lib/i18n/server";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type ResetPasswordPageProps = Readonly<{
  searchParams: Promise<{ token?: string | string[] }>;
}>;

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const t = await getTranslations();
  const token = (await searchParams).token;
  const validToken = typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);

  return (
    <PageShell className="auth-shell">
      <Card as="section" className="auth-card" aria-labelledby="reset-title">
        <div className="auth-heading">
          <h1 id="reset-title">{t("Set a new password")}</h1>
          <p>{t("Choose a password with at least 12 characters.")}</p>
        </div>
        {validToken ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="form-error" role="alert">{t("This reset link is invalid.")}</p>
        )}
        <p className="auth-switch"><Link href="/forgot-password">{t("Request another link")}</Link></p>
      </Card>
    </PageShell>
  );
}
