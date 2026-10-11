import type { VehicleAvailabilityResult } from "@/server/services/availability/check-vehicle";

type AvailabilityResultProps = Readonly<{
  result: VehicleAvailabilityResult | null;
  validationError: boolean;
}>;

export function AvailabilityResult({
  result,
  validationError,
}: AvailabilityResultProps) {
  if (validationError) {
    return (
      <p className="availability-message error-message">
        Enter valid dates with an explicit offset.
      </p>
    );
  }

  if (!result) return null;

  return (
    <section className="availability-result" aria-live="polite">
      <h2>{result.available ? "Available" : "Not available"}</h2>
      <dl className="quote-summary">
        <div>
          <dt>Rental days</dt>
          <dd>{result.quote.totalDays}</dd>
        </div>
        <div>
          <dt>Daily rate</dt>
          <dd>
            {result.quote.pricePerDay} {result.quote.currency}
          </dd>
        </div>
        <div>
          <dt>Rental amount</dt>
          <dd>
            {result.quote.totalAmount} {result.quote.currency}
          </dd>
        </div>
        <div>
          <dt>Deposit</dt>
          <dd>
            {result.quote.depositAmount} {result.quote.currency}
          </dd>
        </div>
        <div>
          <dt>Total due</dt>
          <dd>
            {result.quote.totalDue} {result.quote.currency}
          </dd>
        </div>
      </dl>
    </section>
  );
}
