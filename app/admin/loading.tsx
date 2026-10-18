import { PageShell } from "@/components/ui/page-shell";
export default function AdminLoading() {
  return (
    <PageShell className="admin-shell" aria-busy="true">
      <p className="status-message">Loading administration data…</p>
    </PageShell>
  );
}

