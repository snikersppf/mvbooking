import { expect, test } from "@playwright/test";
import { seedBookingFlow } from "./booking-flow.fixture";

test("booking page preserves validation, stale quotes and the sign-in return route", async ({ page }) => {
  const fixture = await seedBookingFlow();
  await page.context().addCookies([{ name: "mvbooking_locale", value: "en", url: "http://127.0.0.1:3107" }]);
  const bookingPath = `/vehicles/${fixture.vehicleSlug}/booking`;
  const start = new Date(Date.now() + 35 * 86_400_000).toISOString().slice(0, 10);
  const end = new Date(Date.now() + 38 * 86_400_000).toISOString().slice(0, 10);

  try {
    const response = await page.goto(bookingPath);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Book your car");
    await expect(page.locator(".booking-form")).toHaveCount(1);
    await expect(page.getByLabel("Pickup location")).toHaveValue("Tbilisi Airport");
    await expect(page.getByLabel("Return location")).toHaveValue("Tbilisi Airport");
    const submit = page.getByRole("button", { name: "Request booking" });
    await expect(submit).toBeDisabled();

    await page.getByRole("button", { name: "Check price", exact: true }).click();
    await expect(page.locator(".booking-form .field-error")).toHaveCount(2);
    await page.getByLabel("Pickup date and time").fill(`${end}T10:00`);
    await page.getByLabel("Return date and time").fill(`${start}T10:00`);
    await page.getByRole("button", { name: "Check price", exact: true }).click();
    await expect(page.locator(".booking-form").getByRole("alert")).toHaveText("The return time must be after the pickup time.");
    await expect(submit).toBeDisabled();

    await page.getByLabel("Pickup date and time").fill(`${start}T10:00`);
    await page.getByLabel("Return date and time").fill(`${end}T10:00`);
    await page.getByRole("button", { name: "Check price", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Available", exact: true })).toBeVisible();
    await expect(page.locator(".booking-form .quote-summary")).toContainText("570.00 GEL");
    await expect(submit).toBeEnabled();

    await page.getByLabel("Return date and time").fill(`${end}T11:00`);
    await expect(page.getByText("Dates changed. Check the price again.")).toBeVisible();
    await expect(submit).toBeDisabled();
    await page.getByRole("button", { name: "Check price", exact: true }).click();
    await expect(submit).toBeEnabled();

    const bookingResponse = page.waitForResponse(
      (candidate) => new URL(candidate.url()).pathname === "/api/bookings" &&
        candidate.request().method() === "POST",
    );
    await submit.click();
    expect((await bookingResponse).status()).toBe(401);
    await page.locator(".booking-form").getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/login\\?callbackUrl=${encodeURIComponent(bookingPath)}$`));
    await page.getByLabel("Email").fill(fixture.managerEmail);
    await page.getByLabel("Password").fill(fixture.managerPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${bookingPath}$`));

    await page.getByRole("link", { name: "← Back to the car" }).click();
    await expect(page).toHaveURL(new RegExp(`/vehicles/${fixture.vehicleSlug}$`));
    await expect(page.locator(".booking-form")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Book this car →" })).toHaveAttribute("href", bookingPath);

    const missing = await page.goto(`/vehicles/${fixture.vehicleSlug}-missing/booking`);
    expect(missing?.status()).toBe(404);
  } finally {
    await fixture.cleanup();
  }
});
