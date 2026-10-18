import { PageShell } from "@/components/ui/page-shell";
import Link from "next/link";

export default function AdminNotFound() {
  return (
    <PageShell className="admin-shell">
      <h1>Admin item not found</h1>
      <p>The requested record does not exist.</p>
      <Link href="/admin">Return to administration</Link>
    </PageShell>
  );
}

