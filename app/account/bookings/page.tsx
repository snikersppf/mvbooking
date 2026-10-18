import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { BookingCard } from "@/components/account/booking-card";
import { Pagination } from "@/components/ui/pagination";
import { buildLoginHref } from "@/lib/auth/redirect";
import { accountBookingsPageHref } from "@/lib/booking-view";
import { requireCurrentUser } from "@/server/auth/current-user";
import { AuthenticationRequiredError } from "@/server/auth/errors";
import { BOOKING_CONFIG } from "@/server/config/booking";
import {
  listCustomerBookings,
  type CustomerBookingPage,
} from "@/server/services/booking/get-customer-bookings";

type RawSearchParams = Record<string, string | string[] | undefined>;

type AccountBookingsPageProps = Readonly<{
  searchParams: Promise<RawSearchParams>;
}>;

const PAGE_SIZE = 10;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function loadBookings(
  searchParams: RawSearchParams,
): Promise<CustomerBookingPage | null> {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect(buildLoginHref("/account/bookings"));
    }
    throw error;
  }

  try {
    return await listCustomerBookings(user.id, {
      page: firstValue(searchParams.page),
      pageSize: PAGE_SIZE,
    });
  } catch (error) {
    if (error instanceof ZodError) return null;
    throw error;
  }
}

export default async function AccountBookingsPage({
  searchParams,
}: AccountBookingsPageProps) {
  const bookings = await loadBookings(await searchParams);

  if (!bookings) {
    return (
      <PageShell className="account-shell">
        <header className="account-header">
          <Link href="/vehicles">Vehicle catalog</Link>
          <h1>Your bookings</h1>
        </header>
        <p className="status-message status-error">
          The page number is invalid.
        </p>
      </PageShell>
    );
  }

  const previousHref = bookings.hasPreviousPage
    ? accountBookingsPageHref(bookings.page - 1)
    : null;
  const nextHref = bookings.hasNextPage
    ? accountBookingsPageHref(bookings.page + 1)
    : null;

  return (
    <PageShell className="account-shell">
      <header className="account-header">
        <Link href="/vehicles">Vehicle catalog</Link>
        <h1>Your bookings</h1>
        <p>Dates and times are shown in {BOOKING_CONFIG.displayTimeZone}.</p>
      </header>

      {bookings.items.length > 0 ? (
        <section className="booking-list" aria-label="Your bookings">
          {bookings.items.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              displayTimeZone={BOOKING_CONFIG.displayTimeZone}
            />
          ))}
        </section>
      ) : (
        <Card as="div" className="empty-state">
          <p>You have no bookings yet.</p>
          <Link href="/vehicles">Browse vehicles</Link>
        </Card>
      )}

      <Pagination
        ariaLabel="Booking pages"
        page={bookings.page}
        totalPages={bookings.totalPages}
        previousHref={previousHref}
        nextHref={nextHref}
      />
    </PageShell>
  );
}
