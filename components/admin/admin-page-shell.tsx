import { getTranslations } from "@/lib/i18n/server";
import { PageShell } from "@/components/ui/page-shell";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { adminNavigationItems } from "@/lib/admin-navigation";

type AdminPageShellProps = Readonly<{
  role: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}>;

export async function AdminPageShell({
  title,
  description,
  actions,
  children,
}: AdminPageShellProps) {
  const t = await getTranslations();
  const navigationItems = adminNavigationItems();

  return (
    <PageShell className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">{t("Administration")}</p>
          <h1>{t(title)}</h1>
          {description ? <p>{t(description)}</p> : null}
        </div>
        <div className="admin-header-actions">{actions}<SignOutButton /></div>
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

