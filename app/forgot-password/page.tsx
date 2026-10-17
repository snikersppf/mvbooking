import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="forgot-title">
        <div className="auth-heading">
          <h1 id="forgot-title">Reset your password</h1>
          <p>Enter your email to request a reset link.</p>
        </div>
        <ForgotPasswordForm />
        <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
      </section>
    </main>
  );
}
