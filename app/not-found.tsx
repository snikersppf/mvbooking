import { ButtonLink } from "@/components/ui/button-link";
import { PageShell } from "@/components/ui/page-shell";
import { getTranslations } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <PageShell>
      <h1>{t("Page not found")}</h1>
      <p>{t("This page does not exist.")}</p>
      <ButtonLink href="/">{t("Back to home")}</ButtonLink>
    </PageShell>
  );
}
