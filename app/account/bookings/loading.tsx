export default function AccountBookingsLoading() {
  return (
    <main className="account-shell" aria-busy="true">
      <header className="account-header">
        <h1>Your bookings</h1>
      </header>
      <p className="status-message">Loading bookings…</p>
    </main>
  );
}
