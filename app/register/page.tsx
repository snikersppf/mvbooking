import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <PageShell className="auth-shell">
      <Card as="section" className="auth-card" aria-labelledby="register-title">
        <div className="auth-heading">
          <p className="eyebrow">MVBooking</p>
          <h1 id="register-title">Create account</h1>
          <p>Registration always creates a customer account.</p>
        </div>

        <RegisterForm />

        <p className="auth-switch">
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </Card>
    </PageShell>
  );
}
