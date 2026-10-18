import { getTranslations } from "@/lib/i18n/server";
import type { VehicleAvailabilityResult } from "@/server/services/availability/check-vehicle";

type AvailabilityResultProps = Readonly<{
  result: VehicleAvailabilityResult | null;
  validationError: boolean;
}>;

export async function AvailabilityResult({
  result,
  validationError,
}: AvailabilityResultProps) {
  const t = await getTranslations();
  if (validationError) {
    return (
      <p className="availability-message error-message">
        {t("Enter valid dates with an explicit offset.")}</p>
    );
  }

  if (!result) return null;

  return (
    <section className="availability-result" aria-live="polite">
      <h2>{result.available ? t("Available") : t("Not available")}</h2>
      <dl className="quote-summary">
        <div>
          <dt>{t("Rental days")}</dt>
          <dd>{result.quote.totalDays}</dd>
        </div>
        <div>
          <dt>{t("Daily rate")}</dt>
          <dd>
            {result.quote.pricePerDay} {t(result.quote.currency)}
          </dd>
        </div>
        <div>
          <dt>{t("Rental amount")}</dt>
          <dd>
            {result.quote.totalAmount} {t(result.quote.currency)}
          </dd>
        </div>
        <div>
          <dt>{t("Deposit")}</dt>
          <dd>
            {result.quote.depositAmount} {t(result.quote.currency)}
          </dd>
        </div>
        <div>
          <dt>{t("Total due")}</dt>
          <dd>
            {result.quote.totalDue} {t(result.quote.currency)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
