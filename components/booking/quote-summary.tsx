"use client";
import { useTranslations } from "@/components/i18n/language-provider";
import type { VehicleQuote } from "@/server/services/catalog/types";

type QuoteSummaryProps = Readonly<{
  quote: VehicleQuote;
}>;

export function QuoteSummary({ quote }: QuoteSummaryProps) {
  const t = useTranslations();
  return (
    <dl className="quote-summary">
      <div>
        <dt>{t("Rental days")}</dt>
        <dd>{quote.totalDays}</dd>
      </div>
      <div>
        <dt>{t("Daily rate")}</dt>
        <dd>
          {quote.pricePerDay} {t(quote.currency)}
        </dd>
      </div>
      <div>
        <dt>{t("Rental amount")}</dt>
        <dd>
          {quote.totalAmount} {t(quote.currency)}
        </dd>
      </div>
      <div>
        <dt>{t("Deposit")}</dt>
        <dd>
          {quote.depositAmount} {t(quote.currency)}
        </dd>
      </div>
      <div>
        <dt>{t("Total due")}</dt>
        <dd>
          {quote.totalDue} {t(quote.currency)}
        </dd>
      </div>
    </dl>
  );
}
