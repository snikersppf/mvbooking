import { expect, test } from "@playwright/test";
import { seedBookingFlow } from "./booking-flow.fixture";

test("visitor sends a contact enquiry and manager processes it", async ({ page }) => {
  const fixture = await seedBookingFlow();
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
    await page.goto(`/login?callbackUrl=${encodeURIComponent(`/admin/leads/${id}`)}`);
    await page.getByLabel("Email", { exact: true }).fill(fixture.managerEmail);
    await page.getByLabel("Password", { exact: true }).fill(fixture.managerPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/leads/${id}$`));
    await page.getByLabel("Status", { exact: true }).selectOption("IN_PROGRESS");
    await page.getByLabel("Manager note", { exact: true }).fill("Contact visitor");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Saved.");
    await page.reload();
    await expect(page.getByLabel("Manager note", { exact: true })).toHaveValue("Contact visitor");
  } finally { await fixture.cleanup(); }
});
