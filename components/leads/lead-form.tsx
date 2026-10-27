"use client";
import { useId, useState, type FormEvent } from "react";
import { useTranslations } from "@/components/i18n/language-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createLeadSchema } from "@/server/validators/lead";

export function LeadForm({ vehicleId }: Readonly<{ vehicleId?: string }>) {
  const t = useTranslations();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = (key: string) => form.get(key) ? `${form.get(key)}T00:00:00+04:00` : undefined;
    const input = createLeadSchema.safeParse({
      name: String(form.get("name") ?? "").trim(), email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(), comment: String(form.get("comment") ?? ""),
      consent: form.get("consent") === "on", website: String(form.get("website") ?? ""),
      vehicleId, startDate: date("startDate"), endDate: date("endDate"),
    });
    if (!input.success) { setError("Enter your name, a valid contact and consent. Check the dates."); return; }
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.data) });
      if (response.ok) setSuccess(true);
      else setError(response.status === 429 ? "Too many attempts. Try again later." : "The enquiry could not be sent. Try again.");
    } catch { setError("The enquiry could not be sent. Try again."); }
    finally { setBusy(false); }
  }
  if (success) return <p role="status">{t("Thank you. Your enquiry has been received.")}</p>;
  return <form className="auth-form lead-form" onSubmit={submit}>
    <label htmlFor={`${id}-name`}>{t("Your name")}</label>
    <Input id={`${id}-name`} name="name" autoComplete="name" minLength={2} maxLength={100} required />
    <label htmlFor={`${id}-email`}>{t("Email")}</label>
    <Input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} />
    <label htmlFor={`${id}-phone`}>{t("Phone")}</label>
    <Input id={`${id}-phone`} name="phone" type="tel" autoComplete="tel" maxLength={32} />
    <p>{t("Enter an email or phone number.")}</p>
    <label htmlFor={`${id}-start`}>{t("Pickup date")}</label>
    <Input id={`${id}-start`} name="startDate" type="date" />
    <label htmlFor={`${id}-end`}>{t("Return date")}</label>
    <Input id={`${id}-end`} name="endDate" type="date" />
    <label htmlFor={`${id}-comment`}>{t("Comment")}</label>
    <textarea id={`${id}-comment`} name="comment" maxLength={2000} />
    <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label><input type="checkbox" name="consent" required /> {t("I agree to the processing of my contacts to answer this enquiry.")}</label>
    {error && <p role="alert">{t(error)}</p>}
    <Button type="submit" disabled={busy}>{t(busy ? "Sending…" : "Send enquiry")}</Button>
  </form>;
}
