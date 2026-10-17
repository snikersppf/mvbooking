"use client";

export default function AdminError({
  unstable_retry,
}: Readonly<{
  error: Error & { digest?: string };
  unstable_retry: () => void;
}>) {
  return (
    <main className="admin-shell">
      <div className="status-message status-error" role="alert">
        <h1>Administration is unavailable</h1>
        <p>The data could not be loaded.</p>
        <button className="button" type="button" onClick={unstable_retry}>
          Try again
        </button>
      </div>
    </main>
  );
}

