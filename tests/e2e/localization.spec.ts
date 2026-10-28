import { expect, test, type Page } from "@playwright/test";
import { seedBookingFlow } from "./booking-flow.fixture";
import { submitStaffSignIn } from "./staff-sign-in";
import { createPrismaClient } from "@/server/db/prisma";
import { requireTestDatabaseUrl } from "@/server/config/test-database";

async function switchLanguage(page: Page, locale: "ru" | "en") {
  const button = page.getByRole("button", { name: locale.toUpperCase(), exact: true });
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(button).toBeEnabled();
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
}

test("language persists across navigation and reload, with localized public pages and form errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Грузия начинается");
  const russianWords = (await page.locator("body").innerText()).match(/[A-Za-z]{3,}/g) ?? [];
  expect(russianWords.filter((word) => !["MVBooking", "Telegram"].includes(word))).toEqual([]);
  await page.screenshot({ path: "/tmp/mvbooking-i18n-ru-desktop.png" });

  await switchLanguage(page, "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Georgia begins");
  await expect(page.locator("body")).not.toContainText(/[А-Яа-яЁё]/);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle("MVBooking");
  await page.screenshot({ path: "/tmp/mvbooking-i18n-en-desktop.png" });

  for (const route of ["/vehicles", "/register", "/forgot-password", "/reset-password", "/missing-localized-page"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/[А-Яа-яЁё]/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  }

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("localization@example.test");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Enter your password.", { exact: true })).toBeVisible();
  await switchLanguage(page, "ru");
  await expect(page.getByLabel("Электронная почта", { exact: true })).toHaveValue("localization@example.test");
  await expect(page.getByText("Введите пароль.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Войти", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: "/tmp/mvbooking-i18n-ru-mobile.png" });
  await switchLanguage(page, "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Georgia begins");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: "/tmp/mvbooking-i18n-en-mobile.png" });
  expect(errors).toEqual([]);
});

test("changing language preserves booking fields, quote state and API values", async ({ page }) => {
  const fixture = await seedBookingFlow();
  const path = `/vehicles/${fixture.vehicleSlug}/booking?source=catalog`;
  const start = new Date(Date.now() + 35 * 86_400_000).toISOString().slice(0, 10) + "T10:00";
  const end = new Date(Date.now() + 38 * 86_400_000).toISOString().slice(0, 10) + "T10:00";
  let quoteRequests = 0;
  page.on("request", (request) => { if (new URL(request.url()).pathname.endsWith("/quote")) quoteRequests++; });
  try {
    await page.goto(path);
    await page.getByRole("button", { name: "Проверить стоимость", exact: true }).click();
    await expect(page.locator(".booking-form .field-error")).toHaveText(["Выберите дату и время.", "Выберите дату и время."]);
    await page.getByLabel("Дата и время получения").fill(start);
    await page.getByLabel("Дата и время возврата").fill(end);
    await page.getByLabel("Место получения", { exact: true }).fill("My pickup address");
    await page.getByLabel("Место возврата", { exact: true }).fill("Мой адрес возврата");
    await page.getByLabel("Комментарий", { exact: true }).fill("Keep my own comment");
    await page.getByRole("button", { name: "Проверить стоимость", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Доступен", exact: true })).toBeVisible();
    await expect(page.locator(".quote-summary")).toContainText("570.00 лари");
    expect(quoteRequests).toBe(1);

    await switchLanguage(page, "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Book your car");
    await expect(page.getByLabel("Pickup date and time", { exact: true })).toHaveValue(start);
    await expect(page.getByLabel("Return date and time", { exact: true })).toHaveValue(end);
    await expect(page.getByLabel("Pickup location", { exact: true })).toHaveValue("My pickup address");
    await expect(page.getByLabel("Return location", { exact: true })).toHaveValue("Мой адрес возврата");
    await expect(page.getByLabel("Comment", { exact: true })).toHaveValue("Keep my own comment");
    await expect(page.locator(".quote-summary")).toContainText("570.00 GEL");
    await expect(page.getByRole("button", { name: "Request booking →", exact: true })).toBeEnabled();
    await expect(page).toHaveURL(new RegExp(`${path.replace("?", "\\?")}$`));
    expect(quoteRequests).toBe(1);

    await switchLanguage(page, "ru");
    const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/bookings" && response.request().method() === "POST");
    await page.getByRole("button", { name: "Отправить заявку на бронирование →", exact: true }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(401);
    expect(response.request().postDataJSON()).toMatchObject({ pickupLocation: "My pickup address", returnLocation: "Мой адрес возврата", customerComment: "Keep my own comment" });
    await expect(page.getByText("Войдите, чтобы продолжить.", { exact: false })).toBeVisible();
    await expect(page.locator(".booking-form").getByRole("link", { name: "Войти", exact: true })).toBeVisible();
  } finally {
    await fixture.cleanup();
  }
});

test("administration and account use the selected language without changing stored enum values", async ({ page }) => {
  const fixture = await seedBookingFlow();
  const prisma = createPrismaClient(requireTestDatabaseUrl({ DATABASE_URL: process.env.E2E_DATABASE_URL }));
  try {
    await prisma.user.update({ where: { email: fixture.managerEmail }, data: { role: "ADMIN" } });
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { slug: fixture.vehicleSlug }, select: { id: true } });
    await page.goto("/login?callbackUrl=%2Fadmin");
    await page.getByLabel("Электронная почта", { exact: true }).fill(fixture.managerEmail);
    await page.getByLabel("Пароль", { exact: true }).fill(fixture.managerPassword);
    await submitStaffSignIn(page, fixture, "/admin", test.info());
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Управление");
    await page.goto(`/admin/vehicles/${vehicle.id}`);
    await expect(page.getByText(`Код автомобиля: ${vehicle.id}`, { exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Коробка передач", exact: true })).toHaveValue("AUTOMATIC");
    await expect(page.getByRole("combobox", { name: "Коробка передач", exact: true }).locator("option:checked")).toHaveText("Автомат");
    await switchLanguage(page, "en");
    await expect(page.getByRole("combobox", { name: "Transmission", exact: true })).toHaveValue("AUTOMATIC");
    await expect(page.getByRole("combobox", { name: "Transmission", exact: true }).locator("option:checked")).toHaveText("Automatic");

    for (const route of ["/admin", "/admin/vehicles", "/admin/vehicles/new", "/admin/bookings", "/admin/users", "/admin/audit-logs", "/account/bookings"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("body")).not.toContainText(/[А-Яа-яЁё]/);
    }
    await switchLanguage(page, "ru");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ваши бронирования");
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Пользователи");
    await expect(page.getByRole("button", { name: "Сохранить роль", exact: true }).first()).toBeDisabled();
  } finally {
    await prisma.$disconnect();
    await fixture.cleanup();
  }
});
