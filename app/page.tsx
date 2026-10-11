import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <h1>MVBooking</h1>
      <p>Browse available rental vehicles in Georgia.</p>
      <nav className="home-actions" aria-label="Main navigation">
        <Link href="/vehicles">Vehicle catalog</Link>
        <Link href="/login">Sign in</Link>
        <Link href="/register">Create account</Link>
      </nav>
    </main>
  );
}
