type MutationFeedbackProps = Readonly<{
  error: string | null;
  success: string | null;
}>;

export function MutationFeedback({ error, success }: MutationFeedbackProps) {
  return (
    <div aria-live="polite">
      {error ? (
        <p className="status-message status-error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="status-message status-success" role="status">
          {success}
        </p>
      ) : null}
    </div>
  );
}

