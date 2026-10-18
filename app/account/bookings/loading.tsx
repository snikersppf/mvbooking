import { PageShell } from "@/components/ui/page-shell";
export default function AccountBookingsLoading() {
  return (
    <PageShell className="account-shell" aria-busy="true">
      <header className="account-header">
        <h1>Your bookings</h1>
      </header>
      <p className="status-message">Loading bookings…</p>
    </PageShell>
  );
}
