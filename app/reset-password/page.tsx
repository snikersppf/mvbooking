import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type ResetPasswordPageProps = Readonly<{
  searchParams: Promise<{ token?: string | string[] }>;
}>;

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const token = (await searchParams).token;
  const validToken = typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="reset-title">
        <div className="auth-heading">
          <h1 id="reset-title">Set a new password</h1>
          <p>Choose a password with at least 12 characters.</p>
        </div>
        {validToken ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="form-error" role="alert">This reset link is invalid.</p>
        )}
        <p className="auth-switch"><Link href="/forgot-password">Request another link</Link></p>
      </section>
    </main>
  );
}
