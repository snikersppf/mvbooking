import { expect, it } from "vitest";
import { LeadForm } from "@/components/leads/lead-form";
import { renderLocalizedPage } from "@/tests/helpers/render-localized-page";

it("renders an active enquiry form in both languages with unchecked contact consent", async () => {
  const en = await renderLocalizedPage(<LeadForm vehicleId="vehicle-1" />, "en");
  const ru = await renderLocalizedPage(<LeadForm />, "ru");
  expect(en).toContain("Send enquiry");
  expect(ru).toContain("Отправить заявку");
  expect(ru).not.toContain("Send enquiry");
  expect(en).toContain('name="website"');
  const consent = en.match(/<input[^>]*type="checkbox"[^>]*>/)?.[0];
  expect(consent).toContain('name="consent"');
  expect(consent).toContain('required=""');
  expect(en).not.toContain('checked=""');
  expect(en).not.toContain('disabled=""');
  expect(en).toContain('name="email"');
  expect(en).toContain('name="phone"');
});
