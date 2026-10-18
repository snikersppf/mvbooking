import { expect, test } from "@playwright/test";
import { z } from "zod";
import { seedBookingFlow } from "./booking-flow.fixture";

const createdBookingSchema = z.object({
  data: z.object({ booking: z.object({ id: z.string().min(1) }) }),
});

function localDateTime(daysFromNow: number): string {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1_000);
  const parts = new Map(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tbilisi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}T10:00`;
}

test("customer books a quoted car and sees manager confirmation", async ({ page, browser }) => {
  // Flow: register -> sign in -> catalog -> quote -> booking -> account -> manager confirms -> account.
  const fixture = await seedBookingFlow();
  let managerContext: Awaited<ReturnType<typeof browser.newContext>> | null = null;
  try {
    await page.goto("/register");
    await page.getByLabel("Name").fill("E2E Customer");
    await page.getByLabel("Email").fill(fixture.customerEmail);
    await page.getByLabel("Phone (optional)").fill("+995555123456");
    await page.getByLabel("Password").fill(fixture.customerPassword);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/login\?registered=1/);

    await page.getByLabel("Email").fill(fixture.customerEmail);
    await page.getByLabel("Password").fill(fixture.customerPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto(`/vehicles?category=${encodeURIComponent(fixture.category)}`);
    await expect(page.getByRole("link", { name: fixture.vehicleLabel })).toBeVisible();
    await page.getByRole("link", { name: fixture.vehicleLabel }).click();
    await expect(page).toHaveURL(new RegExp(`/vehicles/${fixture.vehicleSlug}$`));

    await page.getByLabel("Pickup date and time").fill(localDateTime(30));
    await page.getByLabel("Return date and time").fill(localDateTime(33));
    await page.getByRole("button", { name: "Check price" }).click();
    await expect(page.getByRole("heading", { name: "Available" })).toBeVisible();
    await expect(page.locator(".booking-form .quote-summary")).toContainText("570.00 GEL");
    await expect(page.locator(".booking-form .quote-summary")).toContainText("90.00 GEL");

    const bookingResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/bookings" &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Request booking" }).click();
    const response = await bookingResponse;
    expect(response.status()).toBe(201);
    const { data: { booking: { id: bookingId } } } = createdBookingSchema.parse(await response.json());
    await expect(page.getByText("Booking request created.")).toBeVisible();
    await page.getByRole("link", { name: "View your bookings" }).click();
    await expect(page.locator(".booking-card").filter({ hasText: fixture.vehicleLabel })).toContainText("Pending");

    managerContext = await browser.newContext();
    const managerPage = await managerContext.newPage();
    await managerPage.goto(`/login?callbackUrl=${encodeURIComponent(`/admin/bookings/${bookingId}`)}`);
    await managerPage.getByLabel("Email").fill(fixture.managerEmail);
    await managerPage.getByLabel("Password").fill(fixture.managerPassword);
    await managerPage.getByRole("button", { name: "Sign in" }).click();
    await expect(managerPage).toHaveURL(new RegExp(`/admin/bookings/${bookingId}$`));
    await managerPage.getByLabel("New status").selectOption("CONFIRMED");
    await managerPage.getByLabel("Manager comment").fill("Confirmed by E2E manager");
    const statusResponse = managerPage.waitForResponse(
      (candidate) => new URL(candidate.url()).pathname === `/api/admin/bookings/${bookingId}/status` &&
        candidate.request().method() === "PATCH",
    );
    await managerPage.getByRole("button", { name: "Update status" }).click();
    expect((await statusResponse).status()).toBe(200);
    await expect(managerPage.locator(".admin-detail-list").getByText("Confirmed", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.locator(".booking-card").filter({ hasText: fixture.vehicleLabel })).toContainText("Confirmed");
  } finally {
    try {
      await managerContext?.close();
    } finally {
      await fixture.cleanup();
    }
  }
});
