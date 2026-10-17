import Link from "next/link";
import { adminNavigationItems } from "@/lib/admin-navigation";

type AdminPageShellProps = Readonly<{
  role: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}>;

export function AdminPageShell({
  role,
  title,
  description,
  actions,
  children,
}: AdminPageShellProps) {
  const navigationItems = adminNavigationItems(role);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <Link href="/">MVBooking</Link>
          <p className="eyebrow">Administration</p>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="admin-header-actions">{actions}</div> : null}
      </header>
      <nav className="admin-navigation" aria-label="Administration">
        {navigationItems.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </main>
  );
}

