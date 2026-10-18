"use client";
import { useTranslations } from "@/components/i18n/language-provider";
type MutationFeedbackProps = Readonly<{
  error: string | null;
  success: string | null;
}>;

export function MutationFeedback({ error, success }: MutationFeedbackProps) {
  const t = useTranslations();
  return (
    <div aria-live="polite">
      {error ? (
        <p className="status-message status-error" role="alert">
          {t.error(error)}
        </p>
      ) : null}
      {success ? (
        <p className="status-message status-success" role="status">
          {t(success)}
        </p>
      ) : null}
    </div>
  );
}

