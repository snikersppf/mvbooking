import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CatalogDateRange } from "@/components/catalog/catalog-date-input";

it("shows a calendar date in Georgia while preserving the original submitted instant", () => {
  const html = renderToStaticMarkup(<CatalogDateRange idPrefix="test" startDate="2027-02-11T20:00:00.000Z" endDate="2027-02-15T10:35:42.000Z" />);
  expect(html).not.toContain('type="date"');
  expect(html).toContain('aria-haspopup="dialog"');
  expect(html).toContain('data-date-value="2027-02-12"');
  expect(html).toContain('type="time"');
  expect(html).toContain('value="00:00"');
  expect(html).toContain('type="hidden" name="startDate" value="2027-02-11T20:00:00.000Z"');
  expect(html).toContain('type="hidden" name="endDate" value="2027-02-15T10:35:42.000Z"');
});
it("leaves unspecified dates empty", () => {
  const html = renderToStaticMarkup(<CatalogDateRange idPrefix="test" />);
  expect(html).toContain('type="hidden" name="startDate" value=""');
});
