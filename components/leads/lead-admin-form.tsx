"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useTranslations } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";

export function LeadAdminForm({ id, status, managerNote }: Readonly<{ id: string; status: string; managerNote: string }>) {
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
  return <form className="auth-form" onSubmit={submit}>
    <label>{t("Status")}<select name="status" defaultValue={status}>{["NEW", "IN_PROGRESS", "CLOSED"].map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></label>
    <label>{t("Manager note")}<textarea name="managerNote" maxLength={5000} defaultValue={managerNote} /></label>
    <Button disabled={busy} type="submit">{t("Save")}</Button>
    {message && <p role="status">{t(message)}</p>}
  </form>;
}
