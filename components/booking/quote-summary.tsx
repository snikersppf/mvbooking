import type { VehicleQuote } from "@/server/services/catalog/types";

type QuoteSummaryProps = Readonly<{
  quote: VehicleQuote;
}>;

export function QuoteSummary({ quote }: QuoteSummaryProps) {
  return (
    <dl className="quote-summary">
      <div>
        <dt>Rental days</dt>
        <dd>{quote.totalDays}</dd>
      </div>
      <div>
        <dt>Daily rate</dt>
        <dd>
          {quote.pricePerDay} {quote.currency}
        </dd>
      </div>
      <div>
        <dt>Rental amount</dt>
        <dd>
          {quote.totalAmount} {quote.currency}
        </dd>
      </div>
      <div>
        <dt>Deposit</dt>
        <dd>
          {quote.depositAmount} {quote.currency}
        </dd>
      </div>
      <div>
        <dt>Total due</dt>
        <dd>
          {quote.totalDue} {quote.currency}
        </dd>
      </div>
    </dl>
  );
}
