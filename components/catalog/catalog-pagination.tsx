import { getTranslations } from "@/lib/i18n/server";
import { Pagination } from "@/components/ui/pagination";

type CatalogPaginationProps = Readonly<{
  page: number;
  totalPages: number;
  previousHref: string | null;
  nextHref: string | null;
}>;

export async function CatalogPagination({
  page,
  totalPages,
  previousHref,
  nextHref,
}: CatalogPaginationProps) {
  const t = await getTranslations();
  return (
    <Pagination
      ariaLabel={t("Catalog pages")}
      page={page}
      totalPages={totalPages}
      previousHref={previousHref}
      nextHref={nextHref}
    />
  );
}
