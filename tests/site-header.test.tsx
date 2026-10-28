import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { SiteHeaderNavigation } from "@/components/site-header";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

it("keeps staff login and administration out of the public navigation", () => {
  const html = renderToStaticMarkup(<SiteHeaderNavigation />);
  expect(html).toContain('href="/vehicles"');
  expect(html).toContain('href="/#rental-conditions"');
  expect(html).toContain('href="/#enquiry"');
  expect(html).not.toContain('/login');
  expect(html).not.toContain('/admin');
  expect(html).not.toContain('/register');
});
