import { Card } from "@/components/ui/card";
export function FieldError({ message }: Readonly<{ message?: string }>) {
  return message ? (
    <p className="field-error" role="alert">
      {message}
    </p>
  ) : null;
}

export function EmptyState({ children }: Readonly<{ children: React.ReactNode }>) {
  return <Card as="div" className="empty-state">{children}</Card>;
}

