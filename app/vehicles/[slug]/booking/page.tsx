import { getTranslations } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking/booking-form";
import { BookingVehicleSummary } from "@/components/booking/booking-vehicle-summary";
import styles from "@/components/booking/booking-page.module.css";
import Footer from "@/components/ui/footer";
import { PageShell } from "@/components/ui/page-shell";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { getCatalogVehicleBySlug } from "@/server/services/catalog/get-vehicle";

type BookingPageProps = Readonly<{
  params: Promise<{ slug: string }>;
}>;

export default async function BookingPage({ params }: BookingPageProps) {
  const t = await getTranslations();
  const { slug } = await params;
  const vehicle = await getCatalogVehicleBySlug(slug);

  if (!vehicle) notFound();

  return (
    <PageShell className={styles.page}>
      <div className={styles.content}>
        <nav className={styles.breadcrumb} aria-label={t("Breadcrumb")}>
          <Link href="/">{t("Главная")}</Link>
          <Link href="/vehicles">{t("Автомобили")}</Link>
          <Link href={`/vehicles/${vehicle.slug}`}>
            {vehicle.brand} {vehicle.model} {vehicle.year}
          </Link>
          <p aria-current="page">{t("Бронирование")}</p>
        </nav>

        <Link className={styles.backLink} href={`/vehicles/${vehicle.slug}`}>
          {t("← Вернуться к автомобилю")}</Link>
        <header className={styles.heading}>
          <h1>{t("Бронирование автомобиля")}</h1>
          <p>{t("Проверьте параметры поездки и отправьте заявку на бронирование.")}</p>
        </header>

        <nav aria-label={t("Разделы бронирования")}>
          <ol className={styles.steps}>
            <li><Link href="#trip-parameters">{t("Параметры поездки")}</Link></li>
            <li><Link href="#renter-details">{t("Данные арендатора")}</Link></li>
            <li><Link href="#booking-comment">{t("Дополнительно")}</Link></li>
            <li><Link href="#how-it-works">{t("Подтверждение")}</Link></li>
          </ol>
        </nav>

        <BookingForm
          vehicleId={vehicle.id}
          vehicleSlug={vehicle.slug}
          defaultLocation={vehicle.location}
          displayTimeZone={BOOKING_CONFIG.displayTimeZone}
          maxDurationDays={BOOKING_CONFIG.maxDurationDays}
          vehicleSummary={<BookingVehicleSummary vehicle={vehicle} />}
        />
      </div>
      <Footer />
    </PageShell>
  );
}
