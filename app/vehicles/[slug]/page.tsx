import { getTranslations } from "@/lib/i18n/server";
import { PageShell } from "@/components/ui/page-shell";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VehicleDetail } from "@/components/catalog/vehicle-detail";
import Footer from "@/components/ui/footer";
import styles from "@/components/catalog/vehicle-detail.module.css";
import { getCatalogVehicleBySlug } from "@/server/services/catalog/get-vehicle";

type VehiclePageProps = Readonly<{
  params: Promise<{ slug: string }>;
}>;

export default async function VehiclePage({ params }: VehiclePageProps) {
  const t = await getTranslations();
  const { slug } = await params;
  const vehicle = await getCatalogVehicleBySlug(slug);
  if (!vehicle) notFound();

  return (
    <PageShell className={`${styles.page} vehicle-page-shell`}>
      <div className={styles.content}>
        <nav className={styles.breadcrumb} aria-label={t("Breadcrumb")}>
          <Link href="/">{t("Главная")}</Link>
          <Link href="/vehicles">{t("Vehicle catalog")}</Link>
          <p>{vehicle.brand} {vehicle.model}</p>
        </nav>

        <VehicleDetail vehicle={vehicle} />
      </div>
      <Footer />
    </PageShell>
  );
}
