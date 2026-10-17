export function FieldError({ message }: Readonly<{ message?: string }>) {
  return message ? (
    <p className="field-error" role="alert">
      {message}
    </p>
  ) : null;
}

export function EmptyState({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="empty-state">{children}</div>;
}

