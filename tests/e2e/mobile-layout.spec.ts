import { expect, test } from "@playwright/test";
import { seedBookingFlow } from "./booking-flow.fixture";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

async function expectPageFits(page: import("@playwright/test").Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("mobile navigation supports keyboard dismissal, anchor links and contact fields", async ({ page, baseURL }) => {
  await page.context().addCookies([{ name: "mvbooking_locale", value: "en", url: baseURL! }]);
  await page.goto("/");
  const menu = page.locator(".site-menu-toggle");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(navigation).toBeHidden();
  await menu.click();
  await expect(navigation).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(menu).toBeFocused();
  await menu.click();
  await navigation.locator('a[href="/#enquiry"]').click();
  await expect(page).toHaveURL(/#enquiry$/);
  await expect(navigation).toBeHidden();
  const form = page.locator(".lead-form");
  await form.getByLabel("Your name").fill("Mobile visitor");
  const consent = form.getByRole("checkbox");
  await expect(consent).not.toBeChecked();
  await consent.check();
  await expect(consent).toBeChecked();
  const checkboxSize = await consent.boundingBox();
  expect(checkboxSize?.width).toBeLessThanOrEqual(24);
  await expectPageFits(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await expectPageFits(page);
});

test("mobile filters retain values when collapsed and when resizing to desktop", async ({ page, baseURL }) => {
  const fixture = await seedBookingFlow();
  try {
    await page.context().addCookies([{ name: "mvbooking_locale", value: "en", url: baseURL! }]);
    await page.goto(`/vehicles?category=${encodeURIComponent(fixture.category)}`);
    const toggle = page.getByRole("button", { name: "Show filters" });
    const minimumPrice = page.locator('input[name="minPrice"]');
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(minimumPrice).toBeHidden();
    await toggle.click();
    await minimumPrice.fill("1");
    await page.getByRole("button", { name: "Hide filters" }).click();
    await expect(minimumPrice).toBeHidden();
    expect(await page.locator('form[action="/vehicles"]').evaluate((form) => new FormData(form as HTMLFormElement).get("minPrice"))).toBe("1");
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(minimumPrice).toBeVisible();
    await expect(minimumPrice).toHaveValue("1");
    await expect(page.locator(".site-header-nav")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(minimumPrice).toBeHidden();
    await expectPageFits(page);
    await page.goto(`/vehicles/${fixture.vehicleSlug}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(fixture.vehicleLabel);
    await expectPageFits(page);
  } finally {
    await fixture.cleanup();
  }
});
