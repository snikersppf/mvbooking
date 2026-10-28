import { expect, test } from "@playwright/test";
import { seedBookingFlow } from "./booking-flow.fixture";
import { submitStaffSignIn } from "./staff-sign-in";

test("visitor sends a contact enquiry and manager processes it", async ({ page }) => {
  const fixture = await seedBookingFlow();
  await page.context().setExtraHTTPHeaders({ "X-Forwarded-For": fixture.clientIp });
  await page.context().addCookies([{ name: "mvbooking_locale", value: "en", url: "http://127.0.0.1:3107" }]);
  try {
    await page.goto(`/vehicles/${fixture.vehicleSlug}`);
    const form = page.locator(".lead-form");
    await form.getByLabel("Your name", { exact: true }).fill("E2E visitor");
    await form.getByLabel("Email", { exact: true }).fill(fixture.customerEmail);
    await form.getByRole("checkbox").check();
    const sent = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/leads" && response.request().method() === "POST");
    await form.getByRole("button", { name: "Send enquiry" }).click();
    expect((await sent).status()).toBe(202);
    await expect(page.getByRole("status")).toContainText("Your enquiry has been received.");
    const id = await fixture.findLeadId();
    await page.goto(`/login?callbackUrl=${encodeURIComponent("/admin/bookings")}`);
    await page.getByLabel("Email", { exact: true }).fill(fixture.managerEmail);
    await page.getByLabel("Password", { exact: true }).fill(fixture.managerPassword);
    await submitStaffSignIn(page, fixture, "/admin/bookings", test.info());
    const enquiry = page.getByRole("row").filter({ hasText: fixture.customerEmail });
    await expect(enquiry).toContainText("E2E visitor");
    await enquiry.getByRole("link", { name: "Review", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/bookings/requests/${id}$`));
    await expect(page.locator('select[name="status"]')).toHaveValue("IN_PROGRESS");
    await page.locator('textarea[name="managerNote"]').fill("Contact visitor");
    await page.getByRole("button", { name: "Update status", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Saved.");
    await page.reload();
    await expect(page.locator('textarea[name="managerNote"]')).toHaveValue("Contact visitor");
    await page.goto("/admin/bookings");
    await expect(page.getByRole("region", { name: "New enquiries", exact: true })).not.toContainText(fixture.customerEmail);
    const active = page.getByRole("region", { name: "Active bookings", exact: true });
    await active.getByRole("row").filter({ hasText: fixture.customerEmail }).getByRole("link", { name: "Review", exact: true }).click();
    await page.locator('select[name="status"]').selectOption("COMPLETED");
    await page.getByRole("button", { name: "Update status", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Saved.");
    await page.goto("/admin/bookings");
    await expect(page.getByRole("row").filter({ hasText: fixture.customerEmail })).toHaveCount(0);
    await page.locator('select[name="view"]').selectOption("past");
    await page.getByRole("button", { name: "Apply filters", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: fixture.customerEmail })).toBeVisible();
  } finally { await fixture.cleanup(); }
});
