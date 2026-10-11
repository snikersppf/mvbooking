import Link from "next/link";

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
    <nav className="catalog-pagination" aria-label="Catalog pages">
      {previousHref ? <Link href={previousHref}>Previous</Link> : <span />}
      <span>
        Page {page} of {totalPages}
      </span>
      {nextHref ? <Link href={nextHref}>Next</Link> : <span />}
    </nav>
  );
}
