import { getTranslations } from "@/lib/i18n/server";
import { PageShell } from "@/components/ui/page-shell";
import Link from "next/link";
import { adminNavigationItems } from "@/lib/admin-navigation";

type AdminPageShellProps = Readonly<{
  role: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}>;

export async function AdminPageShell({
  role,
  title,
  description,
  actions,
  children,
}: AdminPageShellProps) {
  const t = await getTranslations();
  const navigationItems = adminNavigationItems(role);

  return (
    <PageShell className="admin-shell">
      <header className="admin-header">
        <div>
          <Link href="/">MVBooking</Link>
          <p className="eyebrow">{t("Administration")}</p>
          <h1>{t(title)}</h1>
          {description ? <p>{t(description)}</p> : null}
        </div>
        {actions ? <div className="admin-header-actions">{actions}</div> : null}
      </header>
      <nav className="admin-navigation" aria-label={t("Administration")}>
        {navigationItems.map((item) => (
          <Link key={item.href} href={item.href}>
            {t(item.label)}
          </Link>
        ))}
      </nav>
      {children}
    </PageShell>
  );
}

