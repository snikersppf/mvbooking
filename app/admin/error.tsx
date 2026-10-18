"use client";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";

export default function AdminError({
  unstable_retry,
}: Readonly<{
  error: Error & { digest?: string };
  unstable_retry: () => void;
}>) {
  return (
    <PageShell className="admin-shell">
      <div className="status-message status-error" role="alert">
        <h1>Administration is unavailable</h1>
        <p>The data could not be loaded.</p>
        <Button className="button" type="button" onClick={unstable_retry}>
          Try again
        </Button>
      </div>
    </PageShell>
  );
}

