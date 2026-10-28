"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useTranslations } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";

export function LeadAdminForm({ id, status, managerNote, canDelete = false }: Readonly<{ id: string; status: string; managerNote: string; canDelete?: boolean }>) {
  const t = useTranslations(), router = useRouter();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
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
      if (response.ok) { router.replace("/admin/leads"); router.refresh(); }
      else setMessage("The request could not be completed.");
    } catch { setMessage("The request could not be completed."); }
    finally { setBusy(false); }
  }
  return <form className="auth-form" onSubmit={submit}>
    <label>{t("Status")}<select name="status" defaultValue={status}>{["NEW", "IN_PROGRESS", "CLOSED"].map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></label>
    <label>{t("Manager note")}<textarea name="managerNote" maxLength={5000} defaultValue={managerNote} /></label>
    <Button disabled={busy} type="submit">{t("Save")}</Button>
    {canDelete && <Button type="button" disabled={busy} onClick={remove}>{t("Delete enquiry")}</Button>}
    {message && <p role="status">{t(message)}</p>}
  </form>;
}
