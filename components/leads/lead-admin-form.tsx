"use client";
import { LEAD_STATUSES, leadStatusLabel } from "@/lib/lead-status";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "@/components/i18n/language-provider";
import { Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LeadAdminForm({ id, status, managerNote, canDelete = false }: Readonly<{ id: string; status: string; managerNote: string; canDelete?: boolean }>) {
  const t = useTranslations(), router = useRouter();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [currentStatus, setCurrentStatus] = useState(status === "NEW" ? "IN_PROGRESS" : status);
  const [reviewing, setReviewing] = useState(status === "NEW");
  useEffect(() => {
    if (status !== "NEW") return;
    let mounted = true;
    async function review() {
      try {
        const response = await fetch(`/api/admin/leads/${encodeURIComponent(id)}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        if (!response.ok) throw new Error("Review failed");
        const result = await response.json();
        if (mounted) { setCurrentStatus(result.data.lead.status); router.refresh(); }
      } catch {
        if (mounted) setMessage("The request could not be completed.");
      } finally { if (mounted) setReviewing(false); }
    }
    void review();
    return () => { mounted = false; };
  }, [id, status, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/leads/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: data.get("status"), managerNote: data.get("managerNote") }) });
      setMessage(response.ok ? "Saved." : "The request could not be completed.");
      if (response.ok) router.refresh();
    } catch { setMessage("The request could not be completed."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm(t("Delete this enquiry permanently?"))) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/leads/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "Content-Type": "application/json" } });
      if (response.ok) { router.replace("/admin/bookings"); router.refresh(); }
      else setMessage("The request could not be completed.");
    } catch { setMessage("The request could not be completed."); }
    finally { setBusy(false); }
  }
  return <form className="admin-form" onSubmit={submit}>
    <label>{t("Status")}<Select name="status" disabled={busy || reviewing} value={currentStatus} onChange={(event) => setCurrentStatus(event.target.value)}>{status === "CLOSED" && <option value="CLOSED" disabled>{t(leadStatusLabel("CLOSED"))}</option>}{LEAD_STATUSES.map((value) => <option key={value} value={value} disabled={value === "NEW"}>{t(leadStatusLabel(value))}</option>)}</Select></label>
    <label>{t("Manager note")}<Textarea name="managerNote" rows={5} maxLength={5000} defaultValue={managerNote} /></label>
    <Button className="button" disabled={busy || reviewing || currentStatus === "CLOSED"} type="submit">{t(busy || reviewing ? "Updating…" : "Update status")}</Button>
    {canDelete && <Button className="button" type="button" disabled={busy || reviewing} onClick={remove}>{t("Delete enquiry")}</Button>}
    {message && <p role="status">{t(message)}</p>}
  </form>;
}
