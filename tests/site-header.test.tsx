import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SiteHeaderNavigation } from "@/components/site-header";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("SiteHeader", () => {
  it("shows public navigation and sign-in links to guests", () => {
    const markup = renderToStaticMarkup(
      <SiteHeaderNavigation signedIn={false} canAccessAdmin={false} />,
    );

    expect(markup).toContain('href="/vehicles"');
    expect(markup).toContain('href="/login"');
    expect(markup).not.toContain('href="/register"');
    expect(markup).not.toContain('href="/account/bookings"');
    expect(markup).not.toContain('href="/admin"');
    expect(markup).not.toContain("Выйти");
  });

  it("shows account and sign-out links, and limits the admin link to staff", () => {
    const customer = renderToStaticMarkup(
      <SiteHeaderNavigation signedIn canAccessAdmin={false} />,
    );
    const manager = renderToStaticMarkup(
      <SiteHeaderNavigation signedIn canAccessAdmin />,
    );

    expect(customer).not.toContain('href="/account/bookings"');
    expect(customer).toContain("Выйти");
    expect(customer).not.toContain('href="/admin"');
    expect(customer).not.toContain('href="/login"');
    expect(manager).toContain('href="/admin"');
  });

  it("does not show guest actions while the session is loading", () => {
    const markup = renderToStaticMarkup(
      <SiteHeaderNavigation signedIn={false} canAccessAdmin={false} loading />,
    );
    expect(markup).toContain('href="/vehicles"');
    expect(markup).not.toContain('href="/login"');
    expect(markup).not.toContain("Выйти");
  });
});
