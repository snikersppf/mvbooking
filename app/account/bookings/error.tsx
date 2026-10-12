"use client";

type AccountBookingsErrorProps = Readonly<{
  reset: () => void;
}>;

export default function AccountBookingsError({
  reset,
}: AccountBookingsErrorProps) {
  return (
    <main className="account-shell">
      <header className="account-header">
        <h1>Your bookings</h1>
      </header>
      <div className="status-message status-error" role="alert">
        <p>Bookings could not be loaded.</p>
        <button className="button" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
