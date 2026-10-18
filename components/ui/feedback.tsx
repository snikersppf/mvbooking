"use client";
import { useTranslations } from "@/components/i18n/language-provider";
import { Card } from "@/components/ui/card";
export function FieldError({ message }: Readonly<{ message?: string }>) {
  const t = useTranslations();
  return message ? (
    <p className="field-error" role="alert">
      {t.error(message)}
    </p>
  ) : null;
}

export function EmptyState({ children }: Readonly<{ children: React.ReactNode }>) {
  return <Card as="div" className="empty-state">{children}</Card>;
}

