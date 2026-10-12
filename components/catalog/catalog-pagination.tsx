import { Pagination } from "@/components/ui/pagination";

type CatalogPaginationProps = Readonly<{
  page: number;
  totalPages: number;
  previousHref: string | null;
  nextHref: string | null;
}>;

export function CatalogPagination({
  page,
  totalPages,
  previousHref,
  nextHref,
}: CatalogPaginationProps) {
  return (
    <Pagination
      ariaLabel="Catalog pages"
      page={page}
      totalPages={totalPages}
      previousHref={previousHref}
      nextHref={nextHref}
    />
  );
}
