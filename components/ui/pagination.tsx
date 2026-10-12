import Link from "next/link";

type PaginationProps = Readonly<{
  ariaLabel: string;
  page: number;
  totalPages: number;
  previousHref: string | null;
  nextHref: string | null;
}>;

export function Pagination({
  ariaLabel,
  page,
  totalPages,
  previousHref,
  nextHref,
}: PaginationProps) {
  return (
    <nav className="pagination" aria-label={ariaLabel}>
      {previousHref ? <Link href={previousHref}>Previous</Link> : <span />}
      <span>
        Page {page} of {totalPages}
      </span>
      {nextHref ? <Link href={nextHref}>Next</Link> : <span />}
    </nav>
  );
}
