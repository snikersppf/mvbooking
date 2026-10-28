import { beforeEach, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { BookingEnquiries } from "@/components/leads/booking-enquiries";
import { listLeads } from "@/server/services/leads/admin";
import { renderLocalizedPage } from "@/tests/helpers/render-localized-page";

vi.mock("@/server/services/leads/admin", () => ({ listLeads: vi.fn() }));
vi.mock("@/lib/i18n/server", async () => {
  const { createTranslator } = await import("@/lib/i18n/translate");
  return { getTranslations: async () => createTranslator("en") };
});
const now = new Date("2026-10-28T12:00:00Z");
const lead = {
  id: "saved-enquiry", name: "Contact visitor", email: "visitor@example.test", phone: null,
  vehicleId: null, vehicle: null, startDate: null, endDate: null, comment: "Please call",
  status: "NEW" as const, managerNote: "", consentVersion: "contact-test", consentAt: now,
  createdAt: now, updatedAt: now,
};
beforeEach(() => { vi.resetAllMocks(); vi.mocked(listLeads).mockResolvedValue({ items: [lead], total: 1, page: 1 }); });

it("renders stored enquiries in Bookings with a working review link even without a vehicle or dates", async () => {
  const html = await renderLocalizedPage(await BookingEnquiries({ searchParams: {} }));
  expect(html).toContain("Contact visitor");
  expect(html).toContain("visitor@example.test");
  expect(html).toContain('href="/admin/bookings/requests/saved-enquiry"');
  expect(html).not.toContain("/admin/leads");
  expect(listLeads).toHaveBeenCalledWith({ status: "NEW", page: undefined });
});

it("shows the requested car and dates alongside the contact details", async () => {
  vi.mocked(listLeads).mockResolvedValue({ items: [{ ...lead,
    vehicleId: "car-1", vehicle: { brand: "Toyota", model: "RAV4" },
    startDate: now, endDate: new Date("2026-10-30T12:00:00Z"),
  }], total: 1, page: 1 });
  const html = await renderLocalizedPage(await BookingEnquiries({ searchParams: {} }));
  expect(html).toContain("Toyota RAV4");
  expect(html).toContain("2026");
  expect(html).toContain("4:00 PM");
});

it("preserves the worklist view when paging new enquiries", async () => {
  vi.mocked(listLeads).mockResolvedValue({ items: [lead], total: 21, page: 1 });
  const html = await renderLocalizedPage(await BookingEnquiries({ searchParams: { view: "past", page: "3" } }));
  expect(html).toContain('href="/admin/bookings?view=past&amp;page=3&amp;newPage=2"');
  expect(listLeads).toHaveBeenCalledWith({ status: "NEW", page: undefined });
});

it("shows invalid-filter feedback without swallowing authorization failures", async () => {
  vi.mocked(listLeads).mockRejectedValueOnce(new ZodError([]));
  const html = await renderLocalizedPage(await BookingEnquiries({ searchParams: { newPage: "invalid" } }));
  expect(html).toContain('role="alert"');
  vi.mocked(listLeads).mockRejectedValueOnce(new Error("Forbidden"));
  await expect(BookingEnquiries({ searchParams: {} })).rejects.toThrow("Forbidden");
});
