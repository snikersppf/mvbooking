import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <h1>MVBooking</h1>
      <p>The MVP foundation is ready. Vehicle catalog and booking flows are coming next.</p>
      <nav className="home-actions" aria-label="Account">
        <Link href="/login">Sign in</Link>
        <Link href="/register">Create account</Link>
      </nav>
    </main>
  );
}
