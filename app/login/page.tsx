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
  const params = await searchParams;
  const callbackUrl = normalizeCallbackPath(firstValue(params.callbackUrl));
  const registrationComplete = firstValue(params.registered) === "1";

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-heading">
          <p className="eyebrow">MVBooking</p>
          <h1 id="login-title">Sign in</h1>
          <p>Use your account to continue.</p>
        </div>

        <LoginForm
          callbackUrl={callbackUrl}
          registrationComplete={registrationComplete}
        />

        <p className="auth-switch">
          <Link href="/forgot-password">Forgot your password?</Link>
        </p>

        <p className="auth-switch">
          No account yet? <Link href="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}
