import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CatalogDateInput } from "@/components/catalog/catalog-date-input";

it("shows a calendar date in Georgia while preserving the original submitted instant", () => {
  const html = renderToStaticMarkup(<CatalogDateInput name="startDate" defaultValue="2027-02-11T20:00:00.000Z" />);
  expect(html).toContain('type="date"');
  expect(html).toContain('value="2027-02-12"');
  expect(html).toContain('type="hidden" name="startDate" value="2027-02-11T20:00:00.000Z"');
});
it("leaves unspecified dates empty", () => {
  const html = renderToStaticMarkup(<CatalogDateInput name="startDate" />);
  expect(html).toContain('type="hidden" name="startDate" value=""');
});
