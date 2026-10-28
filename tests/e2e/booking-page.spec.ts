import { expect, test } from "@playwright/test";
import { seedBookingFlow } from "./booking-flow.fixture";

test("public vehicle enquiry validates contacts and dates without requiring sign-in", async ({ page }) => {
  const fixture = await seedBookingFlow();
  await page.context().addCookies([{ name: "mvbooking_locale", value: "en", url: "http://127.0.0.1:3107" }]);
  const vehiclePath = `/vehicles/${fixture.vehicleSlug}`;
  const start = new Date(Date.now() + 35 * 86_400_000).toISOString().slice(0, 10);
  const end = new Date(Date.now() + 38 * 86_400_000).toISOString().slice(0, 10);
  const requests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/leads" && request.method() === "POST") requests.push(request.url());
  });

  try {
    const response = await page.goto(vehiclePath);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(fixture.vehicleLabel);
    const enquiryLink = page.getByRole("link", { name: "Send enquiry", exact: true });
    await expect(enquiryLink).toHaveAttribute("href", "#enquiry");
    await enquiryLink.click();
    const form = page.locator(".lead-form");
    await expect(form).toBeVisible();
    await expect(page.locator(".booking-form")).toHaveCount(0);
    const consent = form.getByRole("checkbox");
    await expect(consent).not.toBeChecked();
    await expect(consent).toHaveAttribute("required", "");
    await form.getByLabel("Your name").fill("Enquiry visitor");
    await consent.check();
    const submit = form.getByRole("button", { name: "Send enquiry", exact: true });
    await submit.click();
    await expect(form.getByRole("alert")).toHaveText("Enter your name, a valid contact and consent. Check the dates.");
    expect(requests).toHaveLength(0);

    await form.getByLabel("Email", { exact: true }).fill(fixture.customerEmail);
    await form.getByLabel("Pickup date", { exact: true }).fill(end);
    await form.getByLabel("Return date", { exact: true }).fill(start);
    await submit.click();
    await expect(form.getByRole("alert")).toBeVisible();
    expect(requests).toHaveLength(0);

    await form.getByLabel("Pickup date", { exact: true }).fill(start);
    await form.getByLabel("Return date", { exact: true }).fill(end);
    const accepted = page.waitForResponse((candidate) => new URL(candidate.url()).pathname === "/api/leads" && candidate.request().method() === "POST");
    await submit.click();
    expect((await accepted).status()).toBe(202);
    await expect(page.getByRole("status")).toHaveText("Thank you. Your enquiry has been received.");
    await expect(page).toHaveURL(new RegExp(`${vehiclePath}#enquiry$`));
    expect(requests).toHaveLength(1);
    expect(await fixture.findLeadId()).toBeTruthy();

    const missing = await page.goto(`/vehicles/${fixture.vehicleSlug}-missing`);
    expect(missing?.status()).toBe(404);
  } finally {
    await fixture.cleanup();
  }
});
