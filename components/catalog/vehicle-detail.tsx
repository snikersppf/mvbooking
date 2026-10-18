import { getTranslations } from "@/lib/i18n/server";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import type { CatalogVehicleDetail } from "@/server/services/catalog/types";
import styles from "./vehicle-detail.module.css";

type VehicleDetailProps = Readonly<{
  vehicle: CatalogVehicleDetail;
}>;

function tariffRange(minDays: number, maxDays: number | null): string {
  return maxDays === null ? `${minDays}+ days` : `${minDays}–${maxDays} days`;
}

export async function VehicleDetail({ vehicle }: VehicleDetailProps) {
  const t = await getTranslations();
  return (
    <article className={styles.detail}>
      <div className={styles.overview}>
        {vehicle.images.length > 0 ? (
          <div className={`${styles.gallery} vehicle-gallery`}>
            {vehicle.images.map((image) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={image.id} src={image.url} alt={t(image.alt)} width="960" height="540" />
            ))}
          </div>
        ) : (
          <div className={`${styles.galleryPlaceholder} vehicle-detail-placeholder`}>{t("No images available")}</div>
        )}

        <Card className={styles.summary} aria-labelledby="vehicle-title">
          <Badge>{t(vehicle.category)}</Badge>
          <h1 id="vehicle-title">{vehicle.brand} {vehicle.model} {vehicle.year}</h1>
          {vehicle.description ? <p className={styles.description}>{t(vehicle.description)}</p> : null}
          <dl className={styles.highlights}>
            <div><dt className={styles.seats}><span className={styles.srOnly}>{t("Seats")}</span></dt><dd>{vehicle.seats}</dd></div>
            <div><dt className={styles.transmission}><span className={styles.srOnly}>{t("Transmission")}</span></dt><dd>{t(vehicle.transmission)}</dd></div>
            <div><dt className={styles.drive}><span className={styles.srOnly}>{t("Drive")}</span></dt><dd>{t(vehicle.drive)}</dd></div>
            <div><dt className={styles.fuel}><span className={styles.srOnly}>{t("Fuel")}</span></dt><dd>{t(vehicle.fuel)}</dd></div>
          </dl>
          {vehicle.pricingRules[0] ? (
            <div className={styles.summaryRate}>
              <p>{t("Стоимость аренды · ")}{t(tariffRange(vehicle.pricingRules[0].minDays, vehicle.pricingRules[0].maxDays))}</p>
              <p><strong>{vehicle.pricingRules[0].pricePerDay} {t(vehicle.pricingRules[0].currency)}</strong> {t(" / сутки")}</p>
            </div>
          ) : null}
          <div className={styles.summaryActions}>
            <ButtonLink href={`/vehicles/${vehicle.slug}/booking`}>{t("Забронировать автомобиль →")}</ButtonLink>
          </div>
          <p className={styles.summaryNote} id="how-it-works">{t("На следующем шаге выберите даты и проверьте доступность и стоимость поездки.")}</p>
        </Card>
      </div>

      <section className={styles.specifications} aria-label={t("Vehicle details")}>
        <header className={styles.sectionHeading}>
          <p className={styles.eyebrow}>{t("ОБ АВТОМОБИЛЕ")}</p>
          <h2>{t("Характеристики автомобиля")}</h2>
        </header>
        <div className={styles.specificationContent}>
          <dl className={styles.specificationGrid}>
            <Card as="div"><dt className={styles.year}>{t("Year")}</dt><dd>{vehicle.year}</dd></Card>
            <Card as="div"><dt className={styles.transmission}>{t("Transmission")}</dt><dd>{t(vehicle.transmission)}</dd></Card>
            <Card as="div"><dt className={styles.drive}>{t("Drive")}</dt><dd>{t(vehicle.drive)}</dd></Card>
            <Card as="div"><dt className={styles.fuel}>{t("Fuel")}</dt><dd>{t(vehicle.fuel)}</dd></Card>
            <Card as="div"><dt className={styles.seats}>{t("Seats")}</dt><dd>{vehicle.seats}</dd></Card>
            <Card as="div"><dt className={styles.category}>{t("Category")}</dt><dd>{t(vehicle.category)}</dd></Card>
            <Card as="div"><dt className={styles.engine}>{t("Engine")}</dt><dd>{t(vehicle.engine ?? "Not specified")}</dd></Card>
            <Card as="div"><dt className={styles.location}>{t("Location")}</dt><dd>{t(vehicle.location)}</dd></Card>
          </dl>
          {vehicle.images.length > 1 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.specificationPhoto}
              src={vehicle.images[vehicle.images.length - 1].url}
              alt={t(vehicle.images[vehicle.images.length - 1].alt)}
              width="960"
              height="540"
            />
          ) : null}
        </div>
      </section>

      <section className={styles.rates} id="vehicle-rates" aria-labelledby="vehicle-rates-title">
        <header className={styles.sectionHeading}>
          <p className={styles.eyebrow}>{t("СТОИМОСТЬ АРЕНДЫ")}</p>
          <h2 id="vehicle-rates-title">{t("Тарифы по продолжительности поездки")}</h2>
          <p>{t("Итоговая стоимость рассчитывается после указания дат.")}</p>
        </header>
        <dl className={styles.rateGrid}>
          {vehicle.pricingRules.map((rule) => (
            <Card as="div" key={rule.id} className={styles.rateCard}>
              <dt>{t(tariffRange(rule.minDays, rule.maxDays))}</dt>
              <dd><strong>{rule.pricePerDay} {t(rule.currency)}</strong><small>{t("/ сутки")}</small></dd>
            </Card>
          ))}
        </dl>
      </section>

      <section className={styles.conditions} id="rental-conditions" aria-labelledby="vehicle-conditions-title">
        <header className={styles.sectionHeading}>
          <p className={styles.eyebrow}>{t("УСЛОВИЯ ДЛЯ ЭТОЙ МОДЕЛИ")}</p>
          <h2 id="vehicle-conditions-title">{t("Важное перед бронированием")}</h2>
        </header>
        <dl className={styles.conditionGrid}>
          <Card as="div"><dt className={styles.deposit}>{t("Deposit")}</dt><dd>{vehicle.depositAmount} {t(vehicle.currency)}</dd></Card>
          <Card as="div"><dt className={styles.insurance}>{t("Insurance")}</dt><dd>{vehicle.insuranceIncluded ? t("Included") : t("Not included")}</dd></Card>
        </dl>
      </section>
    </article>
  );
}
