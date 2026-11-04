import { expect, type Locator, type Page } from "@playwright/test";

export async function selectDate(page: Page, label: string, date: string, scope: Page | Locator = page) {
  await scope.getByRole("button", { name: label, exact: true }).click();
  const calendar = page.getByRole("dialog", { name: "Choose dates", exact: true });
  const target = calendar.locator(`[data-date="${date}"]`);
  for (let attempt = 0; attempt < 24 && !await target.isVisible(); attempt++) {
    const first = await calendar.locator("[data-date]").first().getAttribute("data-date");
    await calendar.getByRole("button", { name: date < first! ? "Previous month" : "Next month", exact: true }).filter({ visible: true }).click();
  }
  await expect(target).toBeVisible();
  await target.click();
  await calendar.getByRole("button", { name: "Close calendar", exact: true }).click();
  await expect(calendar).toBeHidden();
}
