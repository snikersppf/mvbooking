import { getTranslations } from "@/lib/i18n/server";
import Link from "next/link";

type PaginationProps = Readonly<{
  ariaLabel: string;
  page: number;
  totalPages: number;
  previousHref: string | null;
  nextHref: string | null;
}>;

export async function Pagination({
  ariaLabel,
  page,
  totalPages,
  previousHref,
  nextHref,
}: PaginationProps) {
  const t = await getTranslations();
  return (
    <nav className="pagination" aria-label={t(ariaLabel)}>
      {previousHref ? <Link href={previousHref}>{t("Previous")}</Link> : <span />}
      <span>
        {t("Page ")}{page} {t(" of ")}{totalPages}
      </span>
      {nextHref ? <Link href={nextHref}>{t("Next")}</Link> : <span />}
    </nav>
  );
}
