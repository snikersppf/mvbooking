import { beforeEach, expect, it, vi } from "vitest";
import { CatalogFilterForm } from "@/components/catalog/catalog-filter-form";
import { getTranslations } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translate";
import { catalogQuerySchema } from "@/server/validators/catalog";
import { renderLocalizedPage } from "@/tests/helpers/render-localized-page";

vi.mock("@/lib/i18n/server", () => ({ getTranslations: vi.fn() }));
beforeEach(() => vi.mocked(getTranslations).mockResolvedValue(createTranslator("ru")));

function select(html: string, name: string) {
  return html.match(new RegExp(`<select[^>]*name="${name}"[^>]*>([\\s\\S]*?)</select>`))?.[1] ?? "";
}

it("uses localized choices with unchanged API values, keeping manual price inputs", async () => {
  const filters = { category: "SUV", transmission: "AUTOMATIC", fuel: "HYBRID", drive: "AWD", seats: 5, minPrice: 50, sort: "price_asc" as const, pageSize: 12 };
  const html = await renderLocalizedPage(await CatalogFilterForm({ filters, children: <p>Results</p> }), "ru");
  for (const [name, value] of Object.entries({ category: "SUV", transmission: "AUTOMATIC", fuel: "HYBRID", drive: "AWD", seats: "5" })) {
    expect(select(html, name)).toContain(`value="${value}" selected=""`);
    expect(html).not.toMatch(new RegExp(`<input[^>]*name="${name}"`));
  }
  expect(select(html, "transmission")).toContain("Автомат");
  expect(select(html, "transmission")).toContain("Механика");
  expect(select(html, "fuel")).toContain("Гибрид");
  expect(html.match(/<input[^>]*name="minPrice"[^>]*>/)?.[0]).toContain('type="number"');
  expect(html.match(/<input[^>]*name="maxPrice"[^>]*>/)?.[0]).toContain('type="number"');
  expect(html).not.toContain("Только доступные");
  expect(catalogQuerySchema.parse({ transmission: "AUTOMATIC", fuel: "HYBRID", drive: "AWD", seats: "5" })).toMatchObject({ transmission: "AUTOMATIC", fuel: "HYBRID", drive: "AWD", seats: 5 });
});

it("preserves legacy vehicle values but only offers the supported seat counts without plus signs", async () => {
  const html = await renderLocalizedPage(await CatalogFilterForm({ filters: { category: "LEGACY", transmission: "CVT", seats: 42, sort: "price_asc", pageSize: 12 } }));
  expect(select(html, "category")).toContain('value="LEGACY" selected=""');
  expect(select(html, "transmission")).toContain('value="CVT" selected=""');
  const seats = select(html, "seats");
  expect([...seats.matchAll(/<option value="([^"]*)"/g)].map((match) => match[1])).toEqual(["", "2", "4", "5", "6", "7"]);
  expect(seats).not.toContain("+");
  expect(seats).toContain('value="" selected=""');
});
