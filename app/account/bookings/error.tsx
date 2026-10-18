"use client";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";

type AccountBookingsErrorProps = Readonly<{
  reset: () => void;
}>;

export default function AccountBookingsError({
  reset,
}: AccountBookingsErrorProps) {
  return (
    <PageShell className="account-shell">
      <header className="account-header">
        <h1>Your bookings</h1>
      </header>
      <div className="status-message status-error" role="alert">
        <p>Bookings could not be loaded.</p>
        <Button className="button" type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </PageShell>
  );
}
