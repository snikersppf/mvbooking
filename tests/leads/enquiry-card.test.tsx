import { afterEach, expect, it, vi } from "vitest";
import EnquiryPage from "@/app/admin/bookings/requests/[id]/page";
import { renderLocalizedPage } from "@/tests/helpers/render-localized-page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), notFound: () => { throw new Error("Not found"); } }));
vi.mock("@/server/auth/admin-page", () => ({ requireAdminPageRole: async () => ({ role: "MANAGER" }) }));
vi.mock("@/server/services/leads/admin", () => ({ getLead: async () => ({
  id: "enquiry-1", name: "Visitor", email: "visitor@example.test", phone: null,
  vehicle: { brand: "Hyundai", model: "Elantra" }, status: "NEW", comment: "Please call me", managerNote: "",
  startDate: new Date("2027-02-11T20:00:00Z"), endDate: null, createdAt: new Date("2026-10-28T06:00:00Z"),
}) }));
vi.mock("@/lib/i18n/server", async () => ({ getTranslations: async () => (await import("@/lib/i18n/translate")).createTranslator("ru") }));
afterEach(() => vi.restoreAllMocks());

it("uses booking panels, summary tiles and styled localized controls without marking SSR as reviewed", async () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  const html = await renderLocalizedPage(await EnquiryPage({ params: Promise.resolve({ id: "enquiry-1" }) }), "ru");
  expect(html).toContain("Детали заявки");
  expect(html).toContain('class="admin-detail-list"');
  expect(html).toContain('class="admin-comment-grid"');
  expect(html).toContain('class="admin-form"');
  expect(html).toContain("admin-panel");
  expect(html).toContain("Hyundai Elantra");
  expect(html).toContain("12 февр. 2027");
  expect(html).toContain("Обнов");
  expect(html).toContain('value="NEW" disabled=""');
  expect(html).toContain("Клиент не явился");
  expect(html).toContain("Выполнено");
  expect(html).not.toContain("2027-02-11T20:00:00");
  expect(fetch).not.toHaveBeenCalled();
});
